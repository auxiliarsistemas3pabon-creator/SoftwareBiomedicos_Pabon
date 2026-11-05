import pytest
from django.urls import reverse

from equipment.tests.factories import EquipmentFactory
from maintenance.models import MaintenanceKind, MaintenanceRecord
from scheduling.tests.factories import MaintenanceScheduleFactory

from .factories import MaintenanceRecordFactory

pytestmark = pytest.mark.django_db


LIST_URL = reverse("maintenance:record-list")


def detail_url(pk: int) -> str:
    return reverse("maintenance:record-detail", args=[pk])


def _payload(equipment, **overrides):
    data = {
        "equipment": equipment.id,
        "kind": MaintenanceKind.PREVENTIVE,
        "date": "2026-01-15",
        "description": "Mantenimiento programado ejecutado.",
        "technician": "Juan Perez",
    }
    data.update(overrides)
    return data


class TestCreateLinkedToSchedule:
    def test_create_record_with_schedule_completes_it(self, auth_client, equipment):
        schedule = MaintenanceScheduleFactory(equipment=equipment, is_completed=False)

        response = auth_client.post(
            LIST_URL,
            _payload(equipment, scheduled_maintenance=schedule.id),
            format="json",
        )

        assert response.status_code == 201, response.content
        body = response.json()
        assert body["scheduled_maintenance"] == schedule.id
        assert body["scheduled_maintenance_detail"]["id"] == schedule.id
        assert body["scheduled_maintenance_detail"]["is_completed"] is True

        schedule.refresh_from_db()
        assert schedule.is_completed is True

    def test_create_without_link_leaves_field_null(self, auth_client, equipment):
        response = auth_client.post(LIST_URL, _payload(equipment), format="json")

        assert response.status_code == 201
        body = response.json()
        assert body["scheduled_maintenance"] is None
        assert body["scheduled_maintenance_detail"] is None

    def test_create_with_schedule_for_different_equipment_returns_400(
        self, auth_client, branch
    ):
        eq_a = EquipmentFactory(branch=branch)
        eq_b = EquipmentFactory(branch=branch)
        schedule = MaintenanceScheduleFactory(equipment=eq_a, is_completed=False)

        response = auth_client.post(
            LIST_URL,
            _payload(eq_b, scheduled_maintenance=schedule.id),
            format="json",
        )

        assert response.status_code == 400
        assert "El agendamiento corresponde a otro equipo." in str(response.json())

    def test_create_with_already_completed_schedule_returns_400(
        self, auth_client, equipment
    ):
        schedule = MaintenanceScheduleFactory(equipment=equipment, is_completed=True)

        response = auth_client.post(
            LIST_URL,
            _payload(equipment, scheduled_maintenance=schedule.id),
            format="json",
        )

        assert response.status_code == 400
        assert "El agendamiento ya fue cumplido." in str(response.json())

    def test_one_to_one_blocks_double_link(self, auth_client, equipment):
        schedule = MaintenanceScheduleFactory(equipment=equipment, is_completed=False)
        MaintenanceRecordFactory(equipment=equipment, scheduled_maintenance=schedule)
        schedule.is_completed = True
        schedule.save(update_fields=["is_completed"])

        response = auth_client.post(
            LIST_URL,
            _payload(equipment, scheduled_maintenance=schedule.id),
            format="json",
        )

        assert response.status_code == 400
        # El validador del serializer detiene la petición antes que el constraint DB.
        assert "El agendamiento ya fue cumplido." in str(response.json())


class TestUpdateLink:
    def test_patch_can_set_link_when_unset(self, auth_client, equipment):
        record = MaintenanceRecordFactory(equipment=equipment, scheduled_maintenance=None)
        schedule = MaintenanceScheduleFactory(equipment=equipment, is_completed=False)

        response = auth_client.patch(
            detail_url(record.id),
            {"scheduled_maintenance": schedule.id},
            format="json",
        )

        assert response.status_code == 200, response.content
        record.refresh_from_db()
        schedule.refresh_from_db()
        assert record.scheduled_maintenance_id == schedule.id
        assert schedule.is_completed is True

    def test_patch_cannot_replace_existing_link(self, auth_client, equipment):
        first = MaintenanceScheduleFactory(equipment=equipment, is_completed=False)
        record = MaintenanceRecordFactory(equipment=equipment, scheduled_maintenance=first)
        first.is_completed = True
        first.save(update_fields=["is_completed"])
        other = MaintenanceScheduleFactory(equipment=equipment, is_completed=False)

        response = auth_client.patch(
            detail_url(record.id),
            {"scheduled_maintenance": other.id},
            format="json",
        )

        assert response.status_code == 400
        assert "No se puede cambiar el agendamiento" in str(response.json())

    def test_patch_resending_same_link_is_ok(self, auth_client, equipment):
        schedule = MaintenanceScheduleFactory(equipment=equipment, is_completed=False)
        record = MaintenanceRecordFactory(
            equipment=equipment, scheduled_maintenance=schedule
        )
        schedule.is_completed = True
        schedule.save(update_fields=["is_completed"])

        response = auth_client.patch(
            detail_url(record.id),
            {"scheduled_maintenance": schedule.id, "description": "Actualizado"},
            format="json",
        )

        assert response.status_code == 200, response.content
        record.refresh_from_db()
        assert record.description == "Actualizado"
        assert record.scheduled_maintenance_id == schedule.id


class TestScheduleSerializerExposesReverse:
    def test_schedule_detail_includes_maintenance_record_null_by_default(
        self, auth_client, equipment
    ):
        schedule = MaintenanceScheduleFactory(equipment=equipment)
        url = reverse("scheduling:maintenance-detail", args=[schedule.id])

        response = auth_client.get(url)

        assert response.status_code == 200
        body = response.json()
        assert body["maintenance_record"] is None
        assert body["maintenance_record_detail"] is None

    def test_schedule_detail_includes_maintenance_record_when_linked(
        self, auth_client, equipment
    ):
        schedule = MaintenanceScheduleFactory(equipment=equipment, is_completed=False)
        record = MaintenanceRecord.objects.create(
            equipment=equipment,
            kind=MaintenanceKind.PREVENTIVE,
            date="2026-02-01",
            description="Cumplido",
            scheduled_maintenance=schedule,
        )
        schedule.is_completed = True
        schedule.save(update_fields=["is_completed"])
        url = reverse("scheduling:maintenance-detail", args=[schedule.id])

        response = auth_client.get(url)

        assert response.status_code == 200
        body = response.json()
        assert body["maintenance_record"] == record.id
        assert body["maintenance_record_detail"] is not None
        assert body["maintenance_record_detail"]["id"] == record.id
        assert body["maintenance_record_detail"]["date"] == "2026-02-01"
