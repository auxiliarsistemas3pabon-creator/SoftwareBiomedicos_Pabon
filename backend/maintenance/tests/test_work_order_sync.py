"""Registrar un mantenimiento con responsable (sin solicitud de por medio)
crea su orden de trabajo para que el asignado la ejecute."""
import pytest

from equipment.models import EquipmentWorkOrder
from maintenance.models import MaintenanceKind

from .factories import MaintenanceRecordFactory

pytestmark = pytest.mark.django_db


def test_record_without_assignee_has_no_work_order(equipment):
    MaintenanceRecordFactory(
        equipment=equipment,
        assigned_technician=None,
        assigned_engineer=None,
        technician="",
    )
    assert EquipmentWorkOrder.objects.count() == 0


def test_assigned_record_creates_work_order(equipment, ingeniero):
    record = MaintenanceRecordFactory(
        equipment=equipment, assigned_engineer=ingeniero, kind=MaintenanceKind.INSPECTION
    )
    wo = EquipmentWorkOrder.objects.get(maintenance_record=record)
    assert wo.technician_id == ingeniero.id
    assert wo.status == "PENDING"
    assert wo.service_type == "INSPECTION"
    assert wo.cancel_reason == ""


def test_reassigning_record_moves_the_work_order(equipment, ingeniero, tecnico):
    record = MaintenanceRecordFactory(
        equipment=equipment, assigned_engineer=ingeniero
    )
    record.assigned_engineer = None
    record.assigned_technician = tecnico
    record.save()

    wo = EquipmentWorkOrder.objects.get(maintenance_record=record)
    assert wo.technician_id == tecnico.id
    assert EquipmentWorkOrder.objects.filter(maintenance_record=record).count() == 1


def test_record_linked_to_schedule_does_not_double_up(equipment, ingeniero):
    # Si el registro ya viene de una solicitud, la orden la maneja esa señal.
    from scheduling.tests.factories import MaintenanceScheduleFactory

    schedule = MaintenanceScheduleFactory(equipment=equipment)
    MaintenanceRecordFactory(
        equipment=equipment,
        assigned_engineer=ingeniero,
        scheduled_maintenance=schedule,
    )
    assert EquipmentWorkOrder.objects.filter(
        maintenance_record__isnull=False
    ).count() == 0
