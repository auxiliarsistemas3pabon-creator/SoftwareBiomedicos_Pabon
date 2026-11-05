"""Tests para la asignación de ingeniero/técnico en MaintenanceRecord."""
from datetime import date

import pytest
from django.urls import reverse

from maintenance.managers import MaintenanceRecordManager
from maintenance.models import MaintenanceKind, MaintenanceRecord
from users.models import User
from users.tests.factories import (
    CoordinadorFactory,
    IngenieroFactory,
    TecnicoFactory,
)

from .factories import MaintenanceRecordFactory


def _maintenance_objects() -> MaintenanceRecordManager:
    manager = MaintenanceRecord.objects
    assert isinstance(manager, MaintenanceRecordManager)
    return manager

pytestmark = pytest.mark.django_db


LIST_URL = reverse("maintenance:record-list")


def detail_url(pk: int) -> str:
    return reverse("maintenance:record-detail", args=[pk])


def _payload(equipment, **overrides):
    data = {
        "equipment": equipment.id,
        "kind": MaintenanceKind.PREVENTIVE,
        "date": "2026-01-15",
        "description": "Limpieza general y calibración trimestral.",
        "technician": "Juan Perez",
        "cost": "150000.00",
    }
    data.update(overrides)
    return data


class TestMaintenanceAssignmentCreate:
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

    def test_create_with_only_engineer_returns_201(
        self, auth_client, equipment, ingeniero
    ):
        response = auth_client.post(
            LIST_URL,
            _payload(equipment, assigned_engineer=ingeniero.id),
            format="json",
        )

        assert response.status_code == 201
        assert response.json()["assigned_engineer"] == ingeniero.id
        assert response.json()["assigned_technician"] is None

    def test_create_engineer_with_wrong_role_returns_400(
        self, auth_client, equipment, tecnico
    ):
        # Pasamos un usuario con rol técnico al campo de ingeniero
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
            "El usuario asignado debe tener el rol de técnico."
            in body["assigned_technician"][0]
        )

    def test_create_engineer_with_other_role_returns_400(
        self, auth_client, equipment
    ):
        coord = CoordinadorFactory()
        response = auth_client.post(
            LIST_URL,
            _payload(equipment, assigned_engineer=coord.id),
            format="json",
        )

        assert response.status_code == 400
        assert "ingeniero biomédico" in response.json()["assigned_engineer"][0]

    def test_create_with_inactive_engineer_returns_400(
        self, auth_client, equipment
    ):
        ing = IngenieroFactory(is_active=False)
        response = auth_client.post(
            LIST_URL,
            _payload(equipment, assigned_engineer=ing.id),
            format="json",
        )

        assert response.status_code == 400
        assert "no está activo" in response.json()["assigned_engineer"][0]

    def test_create_with_inactive_technician_returns_400(
        self, auth_client, equipment
    ):
        tec = TecnicoFactory(is_active=False)
        response = auth_client.post(
            LIST_URL,
            _payload(equipment, assigned_technician=tec.id),
            format="json",
        )

        assert response.status_code == 400
        assert "no está activo" in response.json()["assigned_technician"][0]


class TestMaintenanceAssignmentUpdate:
    def test_patch_assigns_engineer_and_technician(
        self, auth_client, maintenance_record, ingeniero, tecnico
    ):
        response = auth_client.patch(
            detail_url(maintenance_record.id),
            {
                "assigned_engineer": ingeniero.id,
                "assigned_technician": tecnico.id,
            },
            format="json",
        )

        assert response.status_code == 200
        maintenance_record.refresh_from_db()
        assert maintenance_record.assigned_engineer_id == ingeniero.id
        assert maintenance_record.assigned_technician_id == tecnico.id

    def test_patch_clears_assignment_with_null(
        self, auth_client, equipment, ingeniero, tecnico
    ):
        record = MaintenanceRecordFactory(
            equipment=equipment,
            assigned_engineer=ingeniero,
            assigned_technician=tecnico,
        )

        response = auth_client.patch(
            detail_url(record.id),
            {"assigned_engineer": None, "assigned_technician": None},
            format="json",
        )

        assert response.status_code == 200
        record.refresh_from_db()
        assert record.assigned_engineer is None
        assert record.assigned_technician is None


class TestMaintenanceAssignmentFilters:
    def test_filter_by_assigned_engineer(self, auth_client, equipment, ingeniero):
        other_eng = IngenieroFactory()
        MaintenanceRecordFactory.create_batch(
            2, equipment=equipment, assigned_engineer=ingeniero
        )
        MaintenanceRecordFactory(equipment=equipment, assigned_engineer=other_eng)
        MaintenanceRecordFactory(equipment=equipment, assigned_engineer=None)

        response = auth_client.get(LIST_URL, {"assigned_engineer": ingeniero.id})

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_filter_by_assigned_technician(self, auth_client, equipment, tecnico):
        other_tec = TecnicoFactory()
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceRecordFactory.create_batch(
            2, equipment=equipment, assigned_technician=other_tec
        )

        response = auth_client.get(LIST_URL, {"assigned_technician": tecnico.id})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_filter_unassigned_true(self, auth_client, equipment, ingeniero, tecnico):
        MaintenanceRecordFactory(equipment=equipment, assigned_engineer=ingeniero)
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceRecordFactory.create_batch(3, equipment=equipment)

        response = auth_client.get(LIST_URL, {"unassigned": "true"})

        assert response.status_code == 200
        assert response.json()["count"] == 3

    def test_filter_unassigned_false(self, auth_client, equipment, ingeniero, tecnico):
        MaintenanceRecordFactory(equipment=equipment, assigned_engineer=ingeniero)
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceRecordFactory.create_batch(2, equipment=equipment)

        response = auth_client.get(LIST_URL, {"unassigned": "false"})

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_search_by_assigned_engineer_name(self, auth_client, equipment):
        target = IngenieroFactory(first_name="Carolina", last_name="Mendez")
        other = IngenieroFactory(first_name="Luis", last_name="Torres")
        MaintenanceRecordFactory(equipment=equipment, assigned_engineer=target)
        MaintenanceRecordFactory(equipment=equipment, assigned_engineer=other)

        response = auth_client.get(LIST_URL, {"search": "Carolina"})

        assert response.status_code == 200
        assert response.json()["count"] == 1


class TestMaintenanceAssignmentManager:
    def test_assigned_to_engineer_scope(self, equipment, ingeniero):
        other_eng = IngenieroFactory()
        MaintenanceRecordFactory.create_batch(
            2, equipment=equipment, assigned_engineer=ingeniero
        )
        MaintenanceRecordFactory(equipment=equipment, assigned_engineer=other_eng)

        qs = _maintenance_objects().assigned_to_engineer(ingeniero.id)

        assert qs.count() == 2

    def test_assigned_to_technician_scope(self, equipment, tecnico):
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=None)

        qs = _maintenance_objects().assigned_to_technician(tecnico.id)

        assert qs.count() == 1

    def test_unassigned_scope(self, equipment, ingeniero, tecnico):
        MaintenanceRecordFactory(equipment=equipment, assigned_engineer=ingeniero)
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceRecordFactory.create_batch(2, equipment=equipment)

        assert _maintenance_objects().unassigned().count() == 2


class TestMaintenanceAssignmentOnUserDelete:
    def test_user_delete_sets_assignment_to_null(self, equipment, ingeniero, tecnico):
        record = MaintenanceRecordFactory(
            equipment=equipment,
            assigned_engineer=ingeniero,
            assigned_technician=tecnico,
            date=date(2026, 1, 15),
        )

        ingeniero.delete()
        tecnico.delete()
        record.refresh_from_db()

        assert record.assigned_engineer is None
        assert record.assigned_technician is None
        # El registro histórico se mantiene
        assert MaintenanceRecord.objects.filter(pk=record.id).exists()
