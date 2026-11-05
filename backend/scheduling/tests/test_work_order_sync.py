"""La solicitud asignada genera sola su orden de trabajo; al terminarla, la
solicitud queda cumplida y entra al historial de mantenimientos."""
import pytest

from equipment.models import EquipmentWorkOrder
from maintenance.models import MaintenanceRecord

from .factories import MaintenanceScheduleFactory

pytestmark = pytest.mark.django_db


def test_unassigned_schedule_has_no_work_order(equipment):
    MaintenanceScheduleFactory(equipment=equipment)
    assert EquipmentWorkOrder.objects.count() == 0


def test_assigning_technician_creates_work_order(equipment, tecnico):
    schedule = MaintenanceScheduleFactory(equipment=equipment)
    schedule.assigned_technician = tecnico
    schedule.save()

    wo = EquipmentWorkOrder.objects.get(schedule=schedule)
    assert wo.technician_id == tecnico.id
    assert wo.status == "PENDING"
    assert wo.equipment_id == equipment.id


def test_assigning_is_idempotent(equipment, tecnico):
    schedule = MaintenanceScheduleFactory(
        equipment=equipment, assigned_technician=tecnico
    )
    schedule.save()
    schedule.save()

    assert EquipmentWorkOrder.objects.filter(schedule=schedule).count() == 1


def test_reassigning_updates_work_order_technician(equipment, tecnico, ingeniero):
    schedule = MaintenanceScheduleFactory(
        equipment=equipment, assigned_technician=tecnico
    )
    schedule.assigned_technician = None
    schedule.assigned_engineer = ingeniero
    schedule.save()

    wo = EquipmentWorkOrder.objects.get(schedule=schedule)
    assert wo.technician_id == ingeniero.id


def test_finishing_work_order_completes_schedule_and_logs_record(
    equipment, tecnico
):
    schedule = MaintenanceScheduleFactory(
        equipment=equipment, assigned_technician=tecnico, is_completed=False
    )
    wo = EquipmentWorkOrder.objects.get(schedule=schedule)

    wo.status = "FINISHED"
    wo.save()

    schedule.refresh_from_db()
    assert schedule.is_completed is True
    record = MaintenanceRecord.objects.get(scheduled_maintenance=schedule)
    assert record.assigned_technician_id == tecnico.id
    assert record.equipment_id == equipment.id


def test_completed_schedule_does_not_spawn_work_order(equipment, tecnico):
    schedule = MaintenanceScheduleFactory(
        equipment=equipment, assigned_technician=tecnico, is_completed=True
    )
    schedule.save()

    assert EquipmentWorkOrder.objects.filter(schedule=schedule).count() == 0
