import pytest
from django.urls import reverse
from rest_framework import status

from audit.models import AuditLog
from users.tests.factories import (
    CoordinadorFactory,
    IngenieroFactory,
    TecnicoFactory,
)

pytestmark = pytest.mark.django_db


LIST_URL = reverse("equipment:equipment-list")


def detail_url(equipment_id: int) -> str:
    return reverse("equipment:equipment-detail", args=[equipment_id])


class TestEquipmentRolePermissions:
    """Espejo de ROLE_MATRIX / permissions.ts para el recurso `equipment`."""

    def test_tecnico_cannot_delete(self, api_client, equipment):
        api_client.force_authenticate(user=TecnicoFactory())
        assert api_client.delete(detail_url(equipment.id)).status_code == (
            status.HTTP_403_FORBIDDEN
        )

    def test_coordinador_cannot_delete(self, api_client, equipment):
        # coordinador: equipment = view/create/edit, SIN delete.
        api_client.force_authenticate(user=CoordinadorFactory())
        assert api_client.delete(detail_url(equipment.id)).status_code == (
            status.HTTP_403_FORBIDDEN
        )

    def test_coordinador_can_edit(self, api_client, equipment):
        api_client.force_authenticate(user=CoordinadorFactory())
        resp = api_client.patch(
            detail_url(equipment.id), {"location": "Piso 2"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_ingeniero_cannot_edit(self, api_client, equipment):
        api_client.force_authenticate(user=IngenieroFactory())
        resp = api_client.patch(
            detail_url(equipment.id), {"location": "Piso 2"}, format="json"
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_tecnico_cannot_create(self, api_client, equipment_model, branch):
        api_client.force_authenticate(user=TecnicoFactory())
        resp = api_client.post(
            LIST_URL,
            {
                "name": "Bomba",
                "asset_tag": "EQ-PERM-1",
                "equipment_model": equipment_model.id,
                "branch": branch.id,
                "status": "ACTIVE",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_coordinador_can_create(self, api_client, equipment_model, branch):
        api_client.force_authenticate(user=CoordinadorFactory())
        resp = api_client.post(
            LIST_URL,
            {
                "name": "Bomba",
                "asset_tag": "EQ-COORD-1",
                "equipment_model": equipment_model.id,
                "branch": branch.id,
                "status": "ACTIVE",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_tecnico_can_view(self, api_client, equipment):
        equipment.area = "Radiología"
        equipment.save(update_fields=["area"])
        api_client.force_authenticate(user=TecnicoFactory(area="Radiología"))
        assert api_client.get(detail_url(equipment.id)).status_code == (
            status.HTTP_200_OK
        )

    def test_admin_delete_leaves_audit_log(self, auth_client, equipment, admin_user):
        equipment_id = equipment.id

        response = auth_client.delete(detail_url(equipment_id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        log = AuditLog.objects.get(
            model_label="equipment.equipment", object_id=str(equipment_id)
        )
        assert log.action == "delete"
        assert log.actor_id == admin_user.id
