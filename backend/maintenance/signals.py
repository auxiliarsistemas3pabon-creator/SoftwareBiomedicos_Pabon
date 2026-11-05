from datetime import datetime, time

from django.db import transaction
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone

from equipment.models import EquipmentWorkOrder
from users.models import User

from .models import MaintenanceKind, MaintenanceRecord

# MaintenanceRecord.kind -> EquipmentWorkOrder.service_type
_WO_SERVICE_TYPE = {
    MaintenanceKind.PREVENTIVE: "PREVENTIVE",
    MaintenanceKind.CORRECTIVE: "CORRECTIVE",
    MaintenanceKind.REPAIR: "CORRECTIVE",
    MaintenanceKind.CALIBRATION: "CALIBRATION",
    MaintenanceKind.INSPECTION: "INSPECTION",
}
# EquipmentWorkOrder.service_type -> MaintenanceRecord.kind (dirección inversa,
# para la orden que se creó sin venir de un mantenimiento).
_RECORD_KIND_FROM_WO = {
    "PREVENTIVE": MaintenanceKind.PREVENTIVE,
    "CORRECTIVE": MaintenanceKind.CORRECTIVE,
    "CALIBRATION": MaintenanceKind.CALIBRATION,
    "INSTALLATION": MaintenanceKind.CORRECTIVE,
    "INSPECTION": MaintenanceKind.INSPECTION,
}
_OPEN_STATUSES = ("PENDING", "IN_PROGRESS")


def _unique_wo_number(record: MaintenanceRecord) -> str:
    base = f"OT-{timezone.localdate():%Y%m%d}-M{record.pk}"
    number, i = base, 2
    while EquipmentWorkOrder.objects.filter(number=number).exists():
        number = f"{base}-{i}"
        i += 1
    return number


@receiver(post_save, sender=MaintenanceRecord)
def sync_work_order_from_record(sender, instance: MaintenanceRecord, **kwargs):
    """Si la gestión registra un mantenimiento con responsable (y no viene de
    una solicitud), se crea sola su orden de trabajo para que el técnico/
    ingeniero la ejecute desde "Órdenes de trabajo".
    """
    if instance.scheduled_maintenance_id:
        return  # ese caso lo cubre la señal de la solicitud
    if getattr(instance, "_from_standalone_work_order", False):
        # El registro nació de create_record_for_standalone_work_order (abajo):
        # esa orden ya existe y se está enlazando a este mismo registro justo
        # después de este create() — sin este freno, esta señal (disparada por
        # el propio create()) alcanza a crear una segunda orden para el mismo
        # registro antes de que la primera termine de enlazarse, y el enlace
        # posterior choca contra la restricción UNIQUE de maintenance_record.
        return

    assignee = instance.assigned_technician or instance.assigned_engineer
    if assignee is None:
        return

    existing = EquipmentWorkOrder.objects.filter(maintenance_record=instance).first()
    if existing is not None:
        if (
            existing.technician_id != assignee.id
            and existing.status in _OPEN_STATUSES
        ):
            existing.technician = assignee
            existing.save(update_fields=["technician"])
        return

    start = instance.date or timezone.localdate()
    EquipmentWorkOrder.objects.create(
        equipment=instance.equipment,
        number=_unique_wo_number(instance),
        service_type=_WO_SERVICE_TYPE.get(instance.kind, "CORRECTIVE"),
        start_date=timezone.make_aware(datetime.combine(start, time(8, 0))),
        description=instance.description,
        technician=assignee,
        status="PENDING",
        maintenance_record=instance,
    )


@receiver(post_save, sender=EquipmentWorkOrder)
def create_record_for_standalone_work_order(
    sender, instance: EquipmentWorkOrder, **kwargs
):
    """Cubre el tercer origen posible de una orden de trabajo: creada
    directamente desde "Órdenes de trabajo" (sin venir de una solicitud ni de
    un "Nuevo mantenimiento" con responsable) — el caso normal de un
    técnico/ingeniero que arranca su propio trabajo desde ahí. Sin esto,
    terminar la orden no dejaba ningún rastro en el historial de
    mantenimientos del equipo: las otras dos señales de este archivo y de
    scheduling/signals.py solo cubren los casos donde la orden SÍ tiene
    `schedule` o `maintenance_record` — "solo uno de los dos está poblado"
    según el comentario del modelo, dejando sin cubrir cuando ninguno lo está.
    """
    if instance.schedule_id or instance.maintenance_record_id:
        return  # esos casos ya los cubren las otras dos señales
    if instance.status != "FINISHED":
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

    record = MaintenanceRecord(
        equipment=instance.equipment,
        kind=_RECORD_KIND_FROM_WO.get(instance.service_type, MaintenanceKind.CORRECTIVE),
        date=timezone.localdate(),
        description=instance.description,
        assigned_engineer=tech if is_eng else None,
        assigned_technician=tech if (tech and not is_eng) else None,
        cost=cost,
    )
    # Marcador transitorio (no es un campo del modelo, no se persiste): evita
    # que sync_work_order_from_record cree una SEGUNDA orden para este mismo
    # registro al reaccionar a este mismo save() — ver el comentario ahí.
    record._from_standalone_work_order = True
    record.save()

    # Enlaza la orden al registro recién creado; el guard de arriba
    # (maintenance_record_id) evita que este mismo save() vuelva a disparar
    # esta función — sí dispara close_record_when_work_order_finished, que
    # de paso sincroniza fecha/costo, igual que para los otros dos orígenes.
    instance.maintenance_record = record
    instance.save(update_fields=["maintenance_record"])


@receiver(post_save, sender=EquipmentWorkOrder)
def close_record_when_work_order_finished(
    sender, instance: EquipmentWorkOrder, **kwargs
):
    """Al terminar la orden, su registro entra al historial con la fecha real
    de ejecución y el costo del trabajo.
    """
    if not instance.maintenance_record_id or instance.status != "FINISHED":
        return

    record = instance.maintenance_record
    fields = ["date", "updated_at"]
    record.date = timezone.localdate()

    cost = getattr(instance, "cost", None)
    if cost is not None:
        record.cost = (
            cost.labor_cost
            + cost.spare_parts_cost
            + cost.transport_cost
            + cost.other_cost
        )
        fields.append("cost")

    record.save(update_fields=fields)


@receiver(pre_delete, sender=MaintenanceRecord)
def remove_pdf_file(sender, instance: MaintenanceRecord, **kwargs) -> None:
    """Borra el PDF asociado del storage al eliminar el registro."""
    if instance.pdf_file:
        pdf_file = instance.pdf_file
        transaction.on_commit(lambda:pdf_file.delete(save=False))

@receiver(pre_delete,sender=MaintenanceRecord)
def reopen_linked_schedule(sender,instance:MaintenanceRecord,**kwargs) -> str | None:
    """Si el registro estaba vinculado a un agendamiento, lo reabre al borrarse."""
    schedule = instance.scheduled_maintenance
    if schedule is not None and schedule.is_completed:
        schedule.is_completed = False
        schedule.save(update_fields=["is_completed","updated_at"])
        return "Registro abierto correctamente"
