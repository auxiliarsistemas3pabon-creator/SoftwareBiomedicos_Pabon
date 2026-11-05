from datetime import date, timedelta

import pytest
from django.core import mail
from django.core.mail import EmailMultiAlternatives

from scheduling.models import MaintenanceSchedule, ScheduledMaintenanceKind
from scheduling.tasks import send_schedule_notification

from .factories import MaintenanceScheduleFactory

pytestmark = pytest.mark.django_db


class TestSendScheduleNotification:
    def test_notification_recipients_are_managers_and_schedule_participants(
        self, equipment
    ):
        from scheduling.tasks import _schedule_notification_recipients
        from scheduling.tests.factories import MaintenanceScheduleFactory
        from users.tests.factories import (
            AdminFactory,
            CoordinadorFactory,
            IngenieroFactory,
            TecnicoFactory,
            UsuarioFactory,
        )

        coordinator = CoordinadorFactory()
        admin = AdminFactory()
        requester = UsuarioFactory()
        engineer = IngenieroFactory()
        technician = TecnicoFactory()
        inactive_admin = AdminFactory(is_active=False)
        unrelated_technician = TecnicoFactory()
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            requested_by=requester,
            assigned_engineer=engineer,
            assigned_technician=technician,
        )

        recipients = set(_schedule_notification_recipients(schedule))

        assert recipients == {
            coordinator.pk,
            admin.pk,
            requester.pk,
            engineer.pk,
            technician.pk,
        }
        assert inactive_admin.pk not in recipients
        assert unrelated_technician.pk not in recipients

    def test_sends_email_to_configured_recipients(self, settings, equipment):
        # Sin email de sede para validar exclusivamente la lista CSV.
        equipment.branch.email = ""
        equipment.branch.save(update_fields=["email"])
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            kind=ScheduledMaintenanceKind.PREVENTIVE,
            scheduled_date=date.today() + timedelta(days=20),
        )
        # post_save signal already sent the email via eager mode; reset and re-trigger.
        mail.outbox = []

        result = send_schedule_notification(schedule.pk)

        assert result == "sent"
        assert len(mail.outbox) == 1
        message = mail.outbox[0]
        assert isinstance(message, EmailMultiAlternatives)
        assert equipment.asset_tag in message.subject
        assert schedule.scheduled_date.isoformat() in message.subject
        assert set(message.to) == set(settings.MAINTENANCE_NOTIFICATION_EMAILS)
        assert equipment.name in message.body
        assert equipment.branch.name in message.body
        # HTML alternative is attached
        html_alt = next((alt for alt in message.alternatives if alt[1] == "text/html"), None)
        assert html_alt is not None
        html_body = html_alt[0]
        assert isinstance(html_body, str)
        assert equipment.asset_tag in html_body

    def test_sets_notified_at_after_send(self, equipment):
        schedule = MaintenanceScheduleFactory(equipment=equipment)
        # Eager mode already filled notified_at via signal — re-running is idempotent
        send_schedule_notification(schedule.pk)
        schedule.refresh_from_db()
        assert schedule.notified_at is not None

    def test_includes_branch_email_when_present(self, settings, branch, equipment):
        branch.email = "branch@clinic.test"
        branch.save(update_fields=["email"])
        schedule = MaintenanceScheduleFactory(equipment=equipment)
        mail.outbox = []

        send_schedule_notification(schedule.pk)

        recipients = set(mail.outbox[0].to)
        assert "branch@clinic.test" in recipients
        assert "mantenimiento@clinic.test" in recipients

    def test_returns_no_recipients_when_empty(self, settings, equipment):
        settings.MAINTENANCE_NOTIFICATION_EMAILS = []
        # equipment.branch.email is empty by default in BranchFactory? Force empty.
        equipment.branch.email = ""
        equipment.branch.save(update_fields=["email"])
        schedule = MaintenanceScheduleFactory(equipment=equipment)
        mail.outbox = []

        result = send_schedule_notification(schedule.pk)

        assert result == "no_recipients"
        assert mail.outbox == []

    def test_returns_not_found_for_missing_schedule(self):
        result = send_schedule_notification(99999)
        assert result == "schedule_not_found"
        assert MaintenanceSchedule.objects.count() == 0

    def test_includes_assigned_engineer_email(self, settings, equipment, ingeniero):
        settings.MAINTENANCE_NOTIFICATION_EMAILS = []
        equipment.branch.email = ""
        equipment.branch.save(update_fields=["email"])
        ingeniero.email = "ingeniero@clinic.test"
        ingeniero.save(update_fields=["email"])
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            assigned_engineer=ingeniero,
        )
        mail.outbox = []

        result = send_schedule_notification(schedule.pk)

        assert result == "sent"
        assert "ingeniero@clinic.test" in mail.outbox[0].to


class TestOverdueAlerts:
    def test_queues_only_overdue_with_stagger(self, monkeypatch, equipment):
        from django.core.cache import cache
        from django.utils import timezone

        from scheduling.tasks import (
            OVERDUE_ALERT_STAGGER_SECONDS,
            queue_overdue_alerts,
        )

        cache.clear()
        today = timezone.localdate()
        past = MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=today - timedelta(days=2)
        )
        due_today = MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=today
        )
        MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=today + timedelta(days=1)
        )
        MaintenanceScheduleFactory(
            equipment=equipment,
            scheduled_date=today - timedelta(days=3),
            is_completed=True,
        )

        queued = []

        def fake_apply_async(*, args, countdown):
            queued.append((args[0], countdown))

        monkeypatch.setattr(
            "scheduling.tasks.send_overdue_alert.apply_async",
            fake_apply_async,
        )

        result = queue_overdue_alerts()
        assert result == "queued:2"
        assert queued == [
            (past.pk, 0),
            (due_today.pk, OVERDUE_ALERT_STAGGER_SECONDS),
        ]

    def test_enqueue_lock_avoids_burst(self, monkeypatch, equipment):
        from django.core.cache import cache
        from django.utils import timezone

        from scheduling.tasks import queue_overdue_alerts

        cache.clear()
        MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=timezone.localdate()
        )
        monkeypatch.setattr(
            "scheduling.tasks.send_overdue_alert.apply_async",
            lambda **kwargs: None,
        )
        assert queue_overdue_alerts().startswith("queued:")
        assert queue_overdue_alerts() == "already_queued"

    def test_send_overdue_alert_broadcasts_once(self, monkeypatch, equipment):
        from django.core.cache import cache
        from django.utils import timezone

        from scheduling.tasks import send_overdue_alert

        cache.clear()
        captured = {}
        captured_recipients = []

        def capture(payload, *, recipient_ids):
            captured.update(payload)
            captured_recipients.extend(recipient_ids)

        monkeypatch.setattr(
            "scheduling.tasks.broadcast_notification",
            capture,
        )
        schedule = MaintenanceScheduleFactory(
            equipment=equipment, scheduled_date=timezone.localdate()
        )
        assert send_overdue_alert(schedule.pk) == "sent"
        assert captured["type"] == "overdue_maintenance"
        assert captured["schedule_id"] == schedule.pk
        assert captured_recipients == []
        assert send_overdue_alert(schedule.pk) == "already_sent"

    def test_send_overdue_alert_skips_future(self, equipment):
        from django.core.cache import cache
        from django.utils import timezone

        from scheduling.tasks import send_overdue_alert

        cache.clear()
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            scheduled_date=timezone.localdate() + timedelta(days=2),
        )
        assert send_overdue_alert(schedule.pk) == "not_overdue"
