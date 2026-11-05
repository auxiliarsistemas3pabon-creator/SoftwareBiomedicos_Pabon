"""Espejo de ROLE_MATRIX / permissions.ts para el recurso `scheduling`."""
from datetime import date, timedelta

import pytest
from django.urls import reverse
from rest_framework import status

from scheduling.models import ScheduledMaintenanceKind
from users.tests.factories import IngenieroFactory, TecnicoFactory, UsuarioFactory

from .factories import MaintenanceScheduleFactory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("scheduling:maintenance-list")


def detail_url(pk: int) -> str:
    return reverse("scheduling:maintenance-detail", args=[pk])


def complete_url(pk: int) -> str:
    return reverse("scheduling:maintenance-complete", args=[pk])


class TestSchedulingRolePermissions:
    def test_tecnico_can_create_request(self, api_client, equipment):
        api_client.force_authenticate(user=TecnicoFactory())
        resp = api_client.post(
            LIST_URL,
            {"equipment": equipment.id, "kind": ScheduledMaintenanceKind.PREVENTIVE},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.json()

    def test_usuario_can_create_request(self, api_client, equipment):
        api_client.force_authenticate(user=UsuarioFactory())
        resp = api_client.post(
            LIST_URL,
            {"equipment": equipment.id, "kind": ScheduledMaintenanceKind.REPAIR},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.json()
        assert resp.json()["requested_by"] is not None

    def test_tecnico_cannot_edit_or_complete(self, api_client, tecnico, equipment):
        s = MaintenanceScheduleFactory(
            equipment=equipment, assigned_technician=tecnico
        )
        api_client.force_authenticate(user=tecnico)
        assert api_client.patch(
            detail_url(s.id), {"notes": "x"}, format="json"
        ).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.post(complete_url(s.id)).status_code == (
            status.HTTP_403_FORBIDDEN
        )

    def test_ingeniero_can_view_assigned_but_cannot_mutate(self, api_client, schedule):
        # El ingeniero consulta las solicitudes asignadas (área solicitante)
        # pero no las crea, programa ni elimina.
        ing = IngenieroFactory()
        schedule.assigned_engineer = ing
        schedule.save(update_fields=["assigned_engineer"])
        api_client.force_authenticate(user=ing)
        assert api_client.get(LIST_URL).status_code == status.HTTP_200_OK
        assert api_client.post(
            LIST_URL,
            {
                "equipment": schedule.equipment_id,
                "kind": ScheduledMaintenanceKind.PREVENTIVE,
                "scheduled_date": (date.today() + timedelta(days=5)).isoformat(),
            },
            format="json",
        ).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.patch(
            detail_url(schedule.id), {"notes": "ok"}, format="json"
        ).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.delete(detail_url(schedule.id)).status_code == (
            status.HTTP_403_FORBIDDEN
        )
