from datetime import date, timedelta
from unittest import mock

import pytest

from equipment.models import EquipmentStatus
from scheduling.models import MaintenanceSchedule, ScheduledMaintenanceKind
from users.tests.factories import IngenieroFactory

from .factories import MaintenanceScheduleFactory

pytestmark = pytest.mark.django_db


class TestScheduleNotificationSignal:
    @mock.patch("scheduling.signals.send_schedule_notification.delay")
    def test_post_save_created_enqueues_task(self, mock_delay, equipment):
        schedule = MaintenanceSchedule.objects.create(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.PREVENTIVE,
            scheduled_date=date.today() + timedelta(days=15),
        )

        mock_delay.assert_called_once_with(schedule.pk)

    @mock.patch("scheduling.signals.send_schedule_notification.delay")
    def test_post_save_updated_does_not_enqueue(self, mock_delay, equipment):
        schedule = MaintenanceScheduleFactory(equipment=equipment)
        mock_delay.reset_mock()

        schedule.notes = "Notas actualizadas"
        schedule.save()

        mock_delay.assert_not_called()

    @mock.patch("scheduling.signals.send_schedule_notification.delay")
    def test_post_save_assigning_engineer_enqueues_task(
        self, mock_delay, equipment
    ):
        schedule = MaintenanceScheduleFactory(equipment=equipment)
        mock_delay.reset_mock()
        engineer = IngenieroFactory()

        schedule.assigned_engineer = engineer
        schedule.save()

        mock_delay.assert_called_once_with(schedule.pk)

    @mock.patch("scheduling.signals.send_schedule_notification.delay")
    def test_post_save_notes_do_not_enqueue_when_already_assigned(
        self, mock_delay, equipment
    ):
        engineer = IngenieroFactory()
        schedule = MaintenanceScheduleFactory(
            equipment=equipment, assigned_engineer=engineer
        )
        mock_delay.reset_mock()

        schedule.notes = "Solo notas"
        schedule.save()

        mock_delay.assert_not_called()


class TestEquipmentStatusFromSchedule:
    def test_request_without_date_sets_in_maintenance(self, equipment):
        MaintenanceSchedule.objects.create(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.PREVENTIVE,
            scheduled_date=None,
        )
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.IN_MAINTENANCE

    def test_programming_preventive_sets_in_maintenance(self, equipment):
        MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.PREVENTIVE,
        )
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.IN_MAINTENANCE

    def test_programming_repair_sets_in_repair(self, equipment):
        MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.REPAIR,
        )
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.IN_REPAIR

    def test_repair_wins_over_preventive(self, equipment):
        MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.PREVENTIVE,
        )
        MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.REPAIR,
        )
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.IN_REPAIR

    def test_completing_restores_active(self, equipment):
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.PREVENTIVE,
        )
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.IN_MAINTENANCE

        schedule.is_completed = True
        schedule.save(update_fields=["is_completed", "updated_at"])
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.ACTIVE

    def test_deleting_programmed_schedule_restores_active(self, equipment):
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.REPAIR,
        )
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.IN_REPAIR

        schedule.delete()
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.ACTIVE

    def test_does_not_overwrite_inactive(self, equipment):
        equipment.status = EquipmentStatus.INACTIVE
        equipment.save(update_fields=["status"])

        MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.PREVENTIVE,
        )
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.INACTIVE
