from datetime import datetime, time

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from equipment.models import EquipmentWorkOrder
from maintenance.models import MaintenanceKind, MaintenanceRecord
from users.models import User

from .models import MaintenanceSchedule, ScheduledMaintenanceKind
from .tasks import send_schedule_notification

# Solicitud (kind) -> Orden de trabajo (service_type) / Registro (kind)
_WO_SERVICE_TYPE = {
    ScheduledMaintenanceKind.PREVENTIVE: "PREVENTIVE",
    ScheduledMaintenanceKind.REPAIR: "CORRECTIVE",
}
_RECORD_KIND = {
    ScheduledMaintenanceKind.PREVENTIVE: MaintenanceKind.PREVENTIVE,
    ScheduledMaintenanceKind.REPAIR: MaintenanceKind.REPAIR,
}
_OPEN_STATUSES = ("PENDING", "IN_PROGRESS")
_BUSY_EQUIPMENT_STATUSES = ("IN_MAINTENANCE", "IN_REPAIR")


def _sync_equipment_status_from_schedules(equipment) -> None:
    """Al solicitar preventivo o reparación, el equipo pasa a En mantenimiento
    o En reparación. Si no queda ninguna abierta, vuelve a Operativo.

    No pisa un equipo Fuera de servicio. Si hay preventivo y reparación
    abiertos a la vez, gana En reparación.
    """
    from equipment.models import Equipment, EquipmentStatus

    equipment_id = getattr(equipment, "pk", None) or getattr(
        equipment, "id", equipment
    )
    if not equipment_id:
        return

    current = (
        Equipment.objects.filter(pk=equipment_id)
        .values_list("status", flat=True)
        .first()
    )
    if current is None or current == EquipmentStatus.INACTIVE:
        return

    open_requests = MaintenanceSchedule.objects.filter(
        equipment_id=equipment_id,
        is_completed=False,
    )
    if open_requests.filter(kind=ScheduledMaintenanceKind.REPAIR).exists():
        target = EquipmentStatus.IN_REPAIR
    elif open_requests.filter(kind=ScheduledMaintenanceKind.PREVENTIVE).exists():
        target = EquipmentStatus.IN_MAINTENANCE
    elif current in _BUSY_EQUIPMENT_STATUSES:
        target = EquipmentStatus.ACTIVE
    else:
        return

    if current != target:
        Equipment.objects.filter(pk=equipment_id).update(status=target)


@receiver(pre_save, sender=MaintenanceSchedule)
def remember_previous_assignees(sender, instance: MaintenanceSchedule, **kwargs):
    """Guarda el asignado anterior para saber si Guardar acaba de asignar."""
    if not instance.pk:
        instance._previous_engineer_id = None
        instance._previous_technician_id = None
        return
    previous = (
        MaintenanceSchedule.objects.filter(pk=instance.pk)
        .values("assigned_engineer_id", "assigned_technician_id")
        .first()
    )
    if previous is None:
        instance._previous_engineer_id = None
        instance._previous_technician_id = None
        return
    instance._previous_engineer_id = previous["assigned_engineer_id"]
    instance._previous_technician_id = previous["assigned_technician_id"]


@receiver(post_save, sender=MaintenanceSchedule)
def trigger_schedule_notification(sender, instance: MaintenanceSchedule, created: bool, **kwargs):
    if created:
        send_schedule_notification.delay(instance.pk)
        return
    previous_engineer = getattr(instance, "_previous_engineer_id", None)
    previous_technician = getattr(instance, "_previous_technician_id", None)
    assigned_now = instance.assigned_engineer_id or instance.assigned_technician_id
    assignment_changed = (
        instance.assigned_engineer_id != previous_engineer
        or instance.assigned_technician_id != previous_technician
    )
    if assigned_now and assignment_changed:
        send_schedule_notification.delay(instance.pk)


def _unique_wo_number(schedule: MaintenanceSchedule) -> str:
    base = f"OT-{timezone.localdate():%Y%m%d}-{schedule.pk}"
    number = base
    i = 2
    while EquipmentWorkOrder.objects.filter(number=number).exists():
        number = f"{base}-{i}"
        i += 1
    return number


@receiver(post_save, sender=MaintenanceSchedule)
def sync_work_order_from_schedule(sender, instance: MaintenanceSchedule, **kwargs):
    """Al asignar responsable a una solicitud, crea (o reasigna) su orden de
    trabajo para que el técnico/ingeniero la ejecute desde "Órdenes de trabajo".
    """
    if instance.is_completed:
        return

    assignee = instance.assigned_technician or instance.assigned_engineer
    if assignee is None:
        return

    existing = EquipmentWorkOrder.objects.filter(schedule=instance).first()
    if existing is not None:
        if (
            existing.technician_id != assignee.id
            and existing.status in _OPEN_STATUSES
        ):
            existing.technician = assignee
            existing.save(update_fields=["technician"])
        return

    start = instance.scheduled_date or timezone.localdate()
    EquipmentWorkOrder.objects.create(
        equipment=instance.equipment,
        number=_unique_wo_number(instance),
        service_type=_WO_SERVICE_TYPE.get(instance.kind, "CORRECTIVE"),
        start_date=timezone.make_aware(datetime.combine(start, time(8, 0))),
        description=(instance.notes or instance.get_kind_display()),
        technician=assignee,
        status="PENDING",
        schedule=instance,
    )


@receiver(post_save, sender=MaintenanceSchedule)
def sync_equipment_status_from_schedule(
    sender, instance: MaintenanceSchedule, **kwargs
):
    """Crear, programar o cumplir la solicitud actualiza el estado del
    equipo para los filtros de Equipos."""
    _sync_equipment_status_from_schedules(instance.equipment)


@receiver(post_delete, sender=MaintenanceSchedule)
def sync_equipment_status_on_schedule_delete(
    sender, instance: MaintenanceSchedule, **kwargs
):
    _sync_equipment_status_from_schedules(instance.equipment)


@receiver(post_save, sender=EquipmentWorkOrder)
def close_schedule_when_work_order_finished(
    sender, instance: EquipmentWorkOrder, **kwargs
):
    """Al marcar la orden como Terminada, la solicitud de origen queda cumplida
    y se deja el registro en el historial de mantenimientos.
    """
    if not instance.schedule_id or instance.status != "FINISHED":
        return

    schedule = instance.schedule
    if schedule.is_completed:
        return

    with transaction.atomic():
        schedule.is_completed = True
        schedule.save(update_fields=["is_completed", "updated_at"])

        if MaintenanceRecord.objects.filter(scheduled_maintenance=schedule).exists():
            return

        tech = instance.technician
        is_eng = tech is not None and tech.role == User.Role.INGENIERO
        wo_cost = getattr(instance, "cost", None)
        cost = None
        if wo_cost is not None:
            cost = (
                wo_cost.labor_cost
                + wo_cost.spare_parts_cost
                + wo_cost.transport_cost
                + wo_cost.other_cost
            )
        MaintenanceRecord.objects.create(
            equipment=instance.equipment,
            kind=_RECORD_KIND.get(schedule.kind, MaintenanceKind.CORRECTIVE),
            date=timezone.localdate(),
            description=instance.description,
            assigned_engineer=tech if is_eng else None,
            assigned_technician=tech if (tech and not is_eng) else None,
            cost=cost,
            scheduled_maintenance=schedule,
        )
