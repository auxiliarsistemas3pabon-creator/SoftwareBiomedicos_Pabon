from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from common.permissions import MANAGEMENT_ROLES
from realtime.events import broadcast_notification
from users.models import User


def _schedule_notification_recipients(schedule) -> list[int]:
    audience = Q(role__in=MANAGEMENT_ROLES)
    if schedule.requested_by_id:
        audience |= Q(pk=schedule.requested_by_id)
    if schedule.assigned_engineer_id:
        audience |= Q(
            pk=schedule.assigned_engineer_id,
            role=User.Role.INGENIERO,
        )
    if schedule.assigned_technician_id:
        audience |= Q(
            pk=schedule.assigned_technician_id,
            role=User.Role.TECNICO,
        )
    return list(
        User.objects.filter(is_active=True)
        .filter(audience)
        .values_list("pk", flat=True)
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_schedule_notification(self, schedule_id: int) -> str:
    from .models import MaintenanceSchedule

    try:
        schedule = (
            MaintenanceSchedule.objects.select_related(
                "equipment",
                "equipment__branch",
                "assigned_engineer",
                "assigned_technician",
            ).get(pk=schedule_id)
        )
    except MaintenanceSchedule.DoesNotExist:
        return "schedule_not_found"

    equipment = schedule.equipment
    branch = equipment.branch

    recipients = list(getattr(settings, "MAINTENANCE_NOTIFICATION_EMAILS", []) or [])
    if branch.email:
        recipients.append(branch.email)
    if schedule.assigned_engineer and schedule.assigned_engineer.email:
        recipients.append(schedule.assigned_engineer.email)
    if schedule.assigned_technician and schedule.assigned_technician.email:
        recipients.append(schedule.assigned_technician.email)
    recipients = list({r for r in recipients if r})
    if not recipients:
        return "no_recipients"

    context = {
        "schedule": schedule,
        "equipment": equipment,
        "branch": branch,
    }
    fecha = (
        schedule.scheduled_date.isoformat()
        if schedule.scheduled_date
        else "sin programar"
    )
    subject = (
        f"[Biometric] Mantenimiento programado: {equipment.asset_tag} ({fecha})"
    )
    body_text = render_to_string("scheduling/email/schedule_notification.txt", context)
    body_html = render_to_string("scheduling/email/schedule_notification.html", context)

    message = EmailMultiAlternatives(
        subject=subject,
        body=body_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    message.attach_alternative(body_html, "text/html")

    try:
        message.send(fail_silently=False)
    except Exception as exc:
        raise self.retry(exc=exc) from exc

    sent_at = timezone.now()
    schedule.notified_at = sent_at
    schedule.save(update_fields=["notified_at", "updated_at"])

    _broadcast_email_sent(schedule, equipment, branch, subject, sent_at)
    return "sent"


def _broadcast_email_sent(schedule, equipment, branch, subject, sent_at) -> None:
    """Empuja el evento al canal WS. No debe tumbar la tarea si Redis falla."""
    try:
        broadcast_notification(
            {
                "type": "schedule_email_sent",
                "schedule_id": schedule.pk,
                "equipment_asset_tag": equipment.asset_tag,
                "scheduled_date": (
                    schedule.scheduled_date.isoformat()
                    if schedule.scheduled_date
                    else ""
                ),
                "branch_name": branch.name,
                "subject": subject,
                "sent_at": sent_at.isoformat(),
            },
            recipient_ids=_schedule_notification_recipients(schedule),
        )
    except Exception:  # pragma: no cover - best-effort
        pass


# Segundos entre alertas de vencidos para no disparar un aluvión de toasts.
OVERDUE_ALERT_STAGGER_SECONDS = 8
_OVERDUE_ENQUEUE_LOCK = "overdue_alerts_enqueue"


@shared_task
def queue_overdue_alerts() -> str:
    """Encola una alerta por cada mantenimiento vencido, en serie."""
    from django.core.cache import cache

    from .models import MaintenanceSchedule

    if not cache.add(_OVERDUE_ENQUEUE_LOCK, 1, timeout=60):
        return "already_queued"

    today = timezone.localdate()
    ids = list(
        MaintenanceSchedule.objects.filter(
            is_completed=False,
            scheduled_date__isnull=False,
            scheduled_date__lte=today,
        )
        .order_by("scheduled_date", "id")
        .values_list("pk", flat=True)
    )
    for index, pk in enumerate(ids):
        send_overdue_alert.apply_async(
            args=[pk],
            countdown=index * OVERDUE_ALERT_STAGGER_SECONDS,
        )
    return f"queued:{len(ids)}"


@shared_task
def send_overdue_alert(schedule_id: int) -> str:
    """Publica una alerta WS de un mantenimiento vencido (una al día)."""
    from django.core.cache import cache

    from .models import MaintenanceSchedule

    today = timezone.localdate()
    try:
        schedule = MaintenanceSchedule.objects.select_related(
            "equipment",
            "equipment__branch",
        ).get(pk=schedule_id)
    except MaintenanceSchedule.DoesNotExist:
        return "schedule_not_found"

    if (
        schedule.is_completed
        or schedule.scheduled_date is None
        or schedule.scheduled_date > today
    ):
        return "not_overdue"

    cache_key = f"overdue_alert:{schedule.pk}:{today.isoformat()}"
    if not cache.add(cache_key, 1, timeout=60 * 60 * 24):
        return "already_sent"

    equipment = schedule.equipment
    try:
        broadcast_notification(
            {
                "type": "overdue_maintenance",
                "schedule_id": schedule.pk,
                "equipment_asset_tag": equipment.asset_tag,
                "equipment_name": equipment.name,
                "scheduled_date": schedule.scheduled_date.isoformat(),
                "days_overdue": (today - schedule.scheduled_date).days,
                "kind": schedule.kind,
            },
            recipient_ids=_schedule_notification_recipients(schedule),
        )
    except Exception:  # pragma: no cover - best-effort
        pass
    return "sent"
