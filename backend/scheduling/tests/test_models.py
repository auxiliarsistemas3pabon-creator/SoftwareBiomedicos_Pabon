from datetime import date, timedelta

import pytest

from scheduling.managers import MaintenanceScheduleManager
from scheduling.models import MaintenanceSchedule, ScheduledMaintenanceKind

from .factories import MaintenanceScheduleFactory


def _schedule_objects() -> MaintenanceScheduleManager:
    manager = MaintenanceSchedule.objects
    assert isinstance(manager, MaintenanceScheduleManager)
    return manager

pytestmark = pytest.mark.django_db


class TestMaintenanceScheduleModel:
    def test_str_format(self, equipment):
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.PREVENTIVE,
            scheduled_date=date(2026, 6, 1),
        )
        assert str(schedule) == (
            f"Mantenimiento preventivo - {equipment.asset_tag} - 2026-06-01"
        )

    def test_default_ordering_is_scheduled_date_asc(self, equipment):
        far = MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=date.today() + timedelta(days=90)
        )
        near = MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=date.today() + timedelta(days=10)
        )
        mid = MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=date.today() + timedelta(days=45)
        )

        ids = list(MaintenanceSchedule.objects.values_list("id", flat=True))

        assert ids == [near.id, mid.id, far.id]


class TestMaintenanceScheduleManager:
    def test_pending_returns_only_pending(self, equipment):
        MaintenanceScheduleFactory(equipment=equipment, is_completed=False)
        MaintenanceScheduleFactory(equipment=equipment, is_completed=True)

        assert _schedule_objects().pending().count() == 1
        assert _schedule_objects().completed().count() == 1

    def test_for_equipment_filters_by_equipment(self, equipment, branch):
        from equipment.tests.factories import EquipmentFactory

        other = EquipmentFactory(branch=branch)
        MaintenanceScheduleFactory.create_batch(2, equipment=equipment)
        MaintenanceScheduleFactory(equipment=other)

        assert _schedule_objects().for_equipment(equipment.id).count() == 2

    def test_in_range_filters_by_date_range(self, equipment):
        MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=date(2026, 5, 1)
        )
        MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=date(2026, 6, 15)
        )
        MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=date(2026, 12, 1)
        )

        qs = _schedule_objects().in_range(date(2026, 5, 1), date(2026, 6, 30))

        assert qs.count() == 2
