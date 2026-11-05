import pytest
from django.urls import reverse
from rest_framework import status

from audit.models import AuditLog

pytestmark = pytest.mark.django_db


def detail_url(record_id: int) -> str:
    return reverse("maintenance:record-detail", args=[record_id])


class TestMaintenanceRecordDeletePermissions:
    def test_tecnico_cannot_delete(self, api_client, maintenance_record, tecnico):
        api_client.force_authenticate(user=tecnico)

        response = api_client.delete(detail_url(maintenance_record.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_cannot_delete(self, api_client, maintenance_record, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.delete(detail_url(maintenance_record.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_coordinador_delete_leaves_audit_log(
        self, auth_client, maintenance_record, coordinador_user
    ):
        record_id = maintenance_record.id

        response = auth_client.delete(detail_url(record_id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        log = AuditLog.objects.get(
            model_label="maintenance.maintenancerecord", object_id=str(record_id)
        )
        assert log.action == "delete"
        assert log.actor_id == coordinador_user.id


class TestSuperadminIsReadOnly:
    """Solo el coordinador muta el historial; el superadmin únicamente lo consulta."""

    def test_superadmin_can_list_and_retrieve(
        self, api_client, superadmin_user, maintenance_record
    ):
        api_client.force_authenticate(user=superadmin_user)

        listed = api_client.get(reverse("maintenance:record-list"))
        retrieved = api_client.get(detail_url(maintenance_record.id))

        assert listed.status_code == status.HTTP_200_OK
        assert retrieved.status_code == status.HTTP_200_OK

    def test_superadmin_cannot_create(self, api_client, superadmin_user, equipment):
        api_client.force_authenticate(user=superadmin_user)

        response = api_client.post(
            reverse("maintenance:record-list"),
            {"equipment": equipment.id, "kind": "PREVENTIVE", "date": "2026-01-01"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_superadmin_cannot_edit(self, api_client, superadmin_user, maintenance_record):
        api_client.force_authenticate(user=superadmin_user)

        response = api_client.patch(
            detail_url(maintenance_record.id), {"description": "x"}, format="json"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_superadmin_cannot_delete(self, api_client, superadmin_user, maintenance_record):
        api_client.force_authenticate(user=superadmin_user)

        response = api_client.delete(detail_url(maintenance_record.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN
