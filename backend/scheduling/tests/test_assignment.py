"""Tests para la asignación de ingeniero/técnico en MaintenanceSchedule."""
from datetime import date, timedelta

import pytest
from django.core import mail
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse

from equipment.tests.factories import EquipmentFactory
from scheduling.managers import MaintenanceScheduleManager
from scheduling.models import MaintenanceSchedule, ScheduledMaintenanceKind
from scheduling.tasks import send_schedule_notification
from users.models import User
from users.tests.factories import (
    CoordinadorFactory,
    IngenieroFactory,
)

from .factories import MaintenanceScheduleFactory


def _schedule_objects() -> MaintenanceScheduleManager:
    manager = MaintenanceSchedule.objects
    assert isinstance(manager, MaintenanceScheduleManager)
    return manager

pytestmark = pytest.mark.django_db


LIST_URL = reverse("scheduling:maintenance-list")


def detail_url(pk: int) -> str:
    return reverse("scheduling:maintenance-detail", args=[pk])


def _payload(equipment, **overrides):
    data = {
        "equipment": equipment.id,
        "kind": ScheduledMaintenanceKind.PREVENTIVE,
        "scheduled_date": (date.today() + timedelta(days=30)).isoformat(),
        "notes": "Calibración trimestral según ficha técnica.",
    }
    data.update(overrides)
    return data


class TestScheduleAssignmentCreate:
    def test_create_with_engineer_and_technician_returns_201(
        self, auth_client, equipment, ingeniero, tecnico
    ):
        response = auth_client.post(
            LIST_URL,
            _payload(
                equipment,
                assigned_engineer=ingeniero.id,
                assigned_technician=tecnico.id,
            ),
            format="json",
        )

        assert response.status_code == 201
        body = response.json()
        assert body["assigned_engineer"] == ingeniero.id
        assert body["assigned_technician"] == tecnico.id
        assert body["assigned_engineer_detail"]["id"] == ingeniero.id
        assert body["assigned_engineer_detail"]["role"] == User.Role.INGENIERO
        assert body["assigned_technician_detail"]["role"] == User.Role.TECNICO

    def test_create_without_assignment_keeps_fields_null(self, auth_client, equipment):
        response = auth_client.post(LIST_URL, _payload(equipment), format="json")

        assert response.status_code == 201
        body = response.json()
        assert body["assigned_engineer"] is None
        assert body["assigned_technician"] is None
        assert body["assigned_engineer_detail"] is None
        assert body["assigned_technician_detail"] is None

    def test_create_engineer_with_wrong_role_returns_400(
        self, auth_client, equipment, tecnico
    ):
        response = auth_client.post(
            LIST_URL,
            _payload(equipment, assigned_engineer=tecnico.id),
            format="json",
        )

        assert response.status_code == 400
        body = response.json()
        assert (
            "El usuario asignado debe tener el rol de ingeniero biomédico."
            in body["assigned_engineer"][0]
        )

    def test_create_technician_with_wrong_role_returns_400(
        self, auth_client, equipment, ingeniero
    ):
        response = auth_client.post(
            LIST_URL,
            _payload(equipment, assigned_technician=ingeniero.id),
            format="json",
        )

        assert response.status_code == 400
        body = response.json()
        assert (
            "El usuario asignado debe tener el rol de usuario operativo."
            in body["assigned_technician"][0]
        )

    def test_create_with_coordinator_returns_400(self, auth_client, equipment):
        coord = CoordinadorFactory()
        response = auth_client.post(
            LIST_URL,
            _payload(equipment, assigned_engineer=coord.id),
            format="json",
        )

        assert response.status_code == 400
        assert "ingeniero biomédico" in response.json()["assigned_engineer"][0]

    def test_create_with_inactive_engineer_returns_400(self, auth_client, equipment):
        ing = IngenieroFactory(is_active=False)
        response = auth_client.post(
            LIST_URL,
            _payload(equipment, assigned_engineer=ing.id),
            format="json",
        )

        assert response.status_code == 400
        assert "no está activo" in response.json()["assigned_engineer"][0]


class TestScheduleAssignmentUpdate:
    def test_patch_assigns_engineer_and_technician(
        self, auth_client, schedule, ingeniero, tecnico
    ):
        response = auth_client.patch(
            detail_url(schedule.id),
            {
                "assigned_engineer": ingeniero.id,
                "assigned_technician": tecnico.id,
            },
            format="json",
        )

        assert response.status_code == 200
        schedule.refresh_from_db()
        assert schedule.assigned_engineer_id == ingeniero.id
        assert schedule.assigned_technician_id == tecnico.id

    def test_patch_clears_assignment_with_null(
        self, auth_client, equipment, ingeniero, tecnico
    ):
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            assigned_engineer=ingeniero,
            assigned_technician=tecnico,
        )

        response = auth_client.patch(
            detail_url(schedule.id),
            {"assigned_engineer": None, "assigned_technician": None},
            format="json",
        )

        assert response.status_code == 200
        schedule.refresh_from_db()
        assert schedule.assigned_engineer is None
        assert schedule.assigned_technician is None


class TestScheduleAssignmentFilters:
    def test_filter_by_assigned_engineer(self, auth_client, equipment, ingeniero):
        other_eng = IngenieroFactory()
        MaintenanceScheduleFactory.create_batch(
            2, equipment=equipment, assigned_engineer=ingeniero
        )
        MaintenanceScheduleFactory(equipment=equipment, assigned_engineer=other_eng)

        response = auth_client.get(LIST_URL, {"assigned_engineer": ingeniero.id})

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_filter_by_assigned_technician(self, auth_client, equipment, tecnico):
        MaintenanceScheduleFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceScheduleFactory(equipment=equipment, assigned_technician=None)

        response = auth_client.get(LIST_URL, {"assigned_technician": tecnico.id})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_filter_unassigned_true(
        self, auth_client, equipment, ingeniero, tecnico
    ):
        MaintenanceScheduleFactory(equipment=equipment, assigned_engineer=ingeniero)
        MaintenanceScheduleFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceScheduleFactory.create_batch(3, equipment=equipment)

        response = auth_client.get(LIST_URL, {"unassigned": "true"})

        assert response.status_code == 200
        assert response.json()["count"] == 3

    def test_search_by_assigned_engineer_name(self, auth_client):
        # La búsqueda de solicitudes es por nombre del equipo.
        target_eq = EquipmentFactory(name="Monitor Carolina")
        other_eq = EquipmentFactory(name="Monitor Luis")
        target = IngenieroFactory(first_name="Carolina", last_name="Mendez")
        other = IngenieroFactory(first_name="Luis", last_name="Torres")
        MaintenanceScheduleFactory(equipment=target_eq, assigned_engineer=target)
        MaintenanceScheduleFactory(equipment=other_eq, assigned_engineer=other)

        response = auth_client.get(LIST_URL, {"search": "Carolina"})

        assert response.status_code == 200
        assert response.json()["count"] == 1


class TestScheduleAssignmentManager:
    def test_assigned_to_engineer_scope(self, equipment, ingeniero):
        MaintenanceScheduleFactory.create_batch(
            2, equipment=equipment, assigned_engineer=ingeniero
        )
        MaintenanceScheduleFactory(equipment=equipment, assigned_engineer=None)

        assert _schedule_objects().assigned_to_engineer(ingeniero.id).count() == 2

    def test_unassigned_scope(self, equipment, ingeniero, tecnico):
        MaintenanceScheduleFactory(equipment=equipment, assigned_engineer=ingeniero)
        MaintenanceScheduleFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceScheduleFactory.create_batch(2, equipment=equipment)

        assert _schedule_objects().unassigned().count() == 2


class TestScheduleAssignmentOnUserDelete:
    def test_user_delete_sets_assignment_to_null(self, equipment, ingeniero, tecnico):
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            assigned_engineer=ingeniero,
            assigned_technician=tecnico,
        )

        ingeniero.delete()
        tecnico.delete()
        schedule.refresh_from_db()

        assert schedule.assigned_engineer is None
        assert schedule.assigned_technician is None
        assert MaintenanceSchedule.objects.filter(pk=schedule.id).exists()


class TestScheduleAssignmentInEmail:
    """Verifica que el correo incluye los datos de ingeniero/técnico asignados."""

    def test_email_includes_engineer_and_technician_when_assigned(
        self, equipment, ingeniero, tecnico
    ):
        ingeniero.first_name = "Carolina"
        ingeniero.last_name = "Mendez"
        ingeniero.email = "carolina@clinic.test"
        ingeniero.save(update_fields=["first_name", "last_name", "email"])
        tecnico.first_name = "Luis"
        tecnico.last_name = "Torres"
        tecnico.email = "luis@clinic.test"
        tecnico.save(update_fields=["first_name", "last_name", "email"])

        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            assigned_engineer=ingeniero,
            assigned_technician=tecnico,
        )
        mail.outbox = []

        send_schedule_notification(schedule.pk)

        message = mail.outbox[0]
        assert isinstance(message, EmailMultiAlternatives)
        assert "Carolina Mendez" in message.body
        assert "carolina@clinic.test" in message.body
        assert "Luis Torres" in message.body
        assert "luis@clinic.test" in message.body
        html_alt = next(
            (alt for alt in message.alternatives if alt[1] == "text/html"), None
        )
        assert html_alt is not None
        html_body = html_alt[0]
        assert isinstance(html_body, str)
        assert "Carolina Mendez" in html_body
        assert "Luis Torres" in html_body

    def test_email_omits_assignment_lines_when_unassigned(self, equipment):
        schedule = MaintenanceScheduleFactory(
            equipment=equipment,
            assigned_engineer=None,
            assigned_technician=None,
        )
        mail.outbox = []

        send_schedule_notification(schedule.pk)

        message = mail.outbox[0]
        assert "Ingeniero:" not in message.body
        assert "Técnico:" not in message.body
