from datetime import date, timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from equipment.tests.factories import EquipmentFactory
from maintenance.models import MaintenanceKind, MaintenanceRecord
from users.tests.factories import IngenieroFactory, TecnicoFactory

from .factories import MaintenanceRecordFactory

pytestmark = pytest.mark.django_db


LIST_URL = reverse("maintenance:record-list")


def detail_url(pk: int) -> str:
    return reverse("maintenance:record-detail", args=[pk])


def history_url(pk: int) -> str:
    return reverse("equipment:equipment-history", args=[pk])


class TestMaintenanceAuth:
    def test_list_requires_auth(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401

    def test_create_requires_auth(self, api_client, equipment):
        payload = {
            "equipment": equipment.id,
            "kind": MaintenanceKind.PREVENTIVE,
            "date": "2026-01-01",
            "description": "x",
        }
        assert api_client.post(LIST_URL, payload, format="json").status_code == 401


class TestMaintenanceCreate:
    def _payload(self, equipment, **overrides):
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

    def test_create_without_pdf_returns_201(self, auth_client, equipment):
        response = auth_client.post(LIST_URL, self._payload(equipment), format="json")

        assert response.status_code == 201
        body = response.json()
        assert body["equipment"] == equipment.id
        assert body["equipment_asset_tag"] == equipment.asset_tag
        assert body["pdf_file"] in (None, "")
        assert body["pdf_file_url"] is None
        assert MaintenanceRecord.objects.count() == 1

    def test_create_with_observations_roundtrips(self, auth_client, equipment):
        response = auth_client.post(
            LIST_URL,
            self._payload(
                equipment,
                observations="  Se cambió el fusible F2; tablero OK.  ",
            ),
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["observations"] == "Se cambió el fusible F2; tablero OK."

    def test_observations_optional_defaults_blank(self, auth_client, equipment):
        response = auth_client.post(LIST_URL, self._payload(equipment), format="json")
        assert response.status_code == 201
        assert response.json()["observations"] == ""

    def test_create_strips_description(self, auth_client, equipment):
        response = auth_client.post(
            LIST_URL,
            self._payload(equipment, description="   Mantenimiento OK   "),
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["description"] == "Mantenimiento OK"

    def test_create_with_future_date_returns_400(self, auth_client, equipment):
        future = (timezone.localdate() + timedelta(days=5)).isoformat()
        response = auth_client.post(LIST_URL, self._payload(equipment, date=future), format="json")
        assert response.status_code == 400
        assert "La fecha no puede ser futura." in response.json()["date"][0]

    def test_create_with_empty_description_returns_400(self, auth_client, equipment):
        response = auth_client.post(
            LIST_URL, self._payload(equipment, description="   "), format="json"
        )
        assert response.status_code == 400
        assert "La descripción es obligatoria." in response.json()["description"][0]

    def test_create_with_negative_cost_returns_400(self, auth_client, equipment):
        response = auth_client.post(LIST_URL, self._payload(equipment, cost="-1.00"), format="json")
        assert response.status_code == 400
        assert "El costo no puede ser negativo." in response.json()["cost"][0]

    def test_create_missing_required_fields_returns_400(self, auth_client):
        response = auth_client.post(LIST_URL, {}, format="json")
        assert response.status_code == 400
        body = response.json()
        for required in ("equipment", "kind", "date", "description"):
            assert required in body


def _finish_wo(record):
    """El registro asignado nace con una orden de trabajo abierta; hasta que
    no se termina, es una tarea y no aparece en el historial."""
    from equipment.models import EquipmentWorkOrder

    EquipmentWorkOrder.objects.filter(maintenance_record=record).update(
        status="FINISHED"
    )


class TestMaintenanceListScopedByRole:
    """Técnico/ingeniero ven en el historial solo los mantenimientos suyos que
    ya están realizados (orden de trabajo terminada). Los que están en curso
    viven en "Órdenes de trabajo". Gestión ve todo."""

    def test_tecnico_only_sees_own_finished_maintenances(
        self, api_client, tecnico, equipment
    ):
        from users.tests.factories import TecnicoFactory

        mios = MaintenanceRecordFactory.create_batch(
            2, equipment=equipment, assigned_technician=tecnico
        )
        for r in mios:
            _finish_wo(r)
        # En curso (orden abierta) -> no aparece en el historial.
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=tecnico)
        # Ajeno y sin asignar.
        MaintenanceRecordFactory(
            equipment=equipment, assigned_technician=TecnicoFactory()
        )
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=None)

        api_client.force_authenticate(user=tecnico)
        response = api_client.get(LIST_URL)

        assert response.status_code == 403

    def test_open_work_order_hides_record_from_technician_history(
        self, api_client, tecnico, equipment
    ):
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=tecnico)

        api_client.force_authenticate(user=tecnico)
        assert api_client.get(LIST_URL).status_code == 403

    def test_management_sees_all_including_in_progress(
        self, auth_client, tecnico, equipment
    ):
        MaintenanceRecordFactory.create_batch(
            2, equipment=equipment, assigned_technician=tecnico
        )
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=None)

        response = auth_client.get(LIST_URL)

        assert response.status_code == 200
        assert response.json()["count"] == 3

    def test_ingeniero_only_sees_own_finished_maintenances(
        self, api_client, ingeniero, tecnico, equipment
    ):
        from users.tests.factories import IngenieroFactory

        r1 = MaintenanceRecordFactory(
            equipment=equipment, assigned_engineer=ingeniero
        )
        r2 = MaintenanceRecordFactory(
            equipment=equipment, assigned_technician=ingeniero
        )
        _finish_wo(r1)
        _finish_wo(r2)
        MaintenanceRecordFactory(
            equipment=equipment, assigned_engineer=IngenieroFactory()
        )
        MaintenanceRecordFactory(equipment=equipment, assigned_technician=tecnico)
        MaintenanceRecordFactory(equipment=equipment)

        api_client.force_authenticate(user=ingeniero)
        response = api_client.get(LIST_URL)

        assert response.status_code == 403


class TestMaintenanceList:
    def test_list_paginated(self, auth_client, equipment):
        MaintenanceRecordFactory.create_batch(3, equipment=equipment)

        response = auth_client.get(LIST_URL)

        assert response.status_code == 200
        body = response.json()
        assert body["count"] == 3
        assert "results" in body

    def test_filter_by_equipment(self, auth_client, branch):
        eq1 = EquipmentFactory(branch=branch)
        eq2 = EquipmentFactory(branch=branch)
        MaintenanceRecordFactory.create_batch(2, equipment=eq1)
        MaintenanceRecordFactory(equipment=eq2)

        response = auth_client.get(LIST_URL, {"equipment": eq1.id})

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_filter_by_kind(self, auth_client, equipment):
        MaintenanceRecordFactory(equipment=equipment, kind=MaintenanceKind.PREVENTIVE)
        MaintenanceRecordFactory(equipment=equipment, kind=MaintenanceKind.CORRECTIVE)
        MaintenanceRecordFactory(equipment=equipment, kind=MaintenanceKind.REPAIR)

        response = auth_client.get(LIST_URL, {"kind": "CORRECTIVE"})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_filter_by_date_range(self, auth_client, equipment):
        MaintenanceRecordFactory(equipment=equipment, date=date(2025, 1, 1))
        MaintenanceRecordFactory(equipment=equipment, date=date(2025, 6, 15))
        MaintenanceRecordFactory(equipment=equipment, date=date(2026, 1, 1))

        response = auth_client.get(
            LIST_URL,
            {"date_after": "2025-01-01", "date_before": "2025-12-31"},
        )

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_filter_by_branch(self, auth_client):
        from branches.tests.factories import BranchFactory

        b1 = BranchFactory()
        b2 = BranchFactory()
        eq1 = EquipmentFactory(branch=b1)
        eq2 = EquipmentFactory(branch=b2)
        MaintenanceRecordFactory.create_batch(2, equipment=eq1)
        MaintenanceRecordFactory(equipment=eq2)

        response = auth_client.get(LIST_URL, {"branch": b1.id})

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_search_by_description(self, auth_client, equipment):
        # La búsqueda es por el responsable, no por la descripción.
        target = IngenieroFactory(first_name="Beatriz", last_name="Nunez")
        other = IngenieroFactory(first_name="Oscar", last_name="Perez")
        MaintenanceRecordFactory(
            equipment=equipment,
            description="Cambio de batería",
            assigned_engineer=target,
        )
        MaintenanceRecordFactory(
            equipment=equipment,
            description="Calibración general",
            assigned_engineer=other,
        )

        response = auth_client.get(LIST_URL, {"search": "Beatriz"})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_search_by_technician(self, auth_client, equipment):
        MaintenanceRecordFactory(equipment=equipment, technician="Maria Lopez")
        MaintenanceRecordFactory(equipment=equipment, technician="Juan Perez")

        response = auth_client.get(LIST_URL, {"search": "Maria"})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_search_by_equipment_asset_tag(self, auth_client, branch):
        # La búsqueda es por el técnico asignado, no por la placa.
        eq_target = EquipmentFactory(asset_tag="EQ-TARGET", branch=branch)
        eq_other = EquipmentFactory(asset_tag="EQ-OTHER", branch=branch)
        tech = TecnicoFactory(first_name="Ramiro", last_name="Diaz")
        other_tech = TecnicoFactory(first_name="Nora", last_name="Gil")
        MaintenanceRecordFactory(equipment=eq_target, assigned_technician=tech)
        MaintenanceRecordFactory(equipment=eq_other, assigned_technician=other_tech)

        response = auth_client.get(LIST_URL, {"search": "Ramiro"})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_default_ordering_desc_by_date(self, auth_client, equipment):
        MaintenanceRecordFactory(equipment=equipment, date=date(2025, 1, 1))
        MaintenanceRecordFactory(equipment=equipment, date=date(2026, 1, 1))
        MaintenanceRecordFactory(equipment=equipment, date=date(2025, 6, 15))

        response = auth_client.get(LIST_URL)

        dates = [item["date"] for item in response.json()["results"]]
        assert dates == sorted(dates, reverse=True)

    def test_ordering_by_cost_asc(self, auth_client, equipment):
        MaintenanceRecordFactory(equipment=equipment, cost=300)
        MaintenanceRecordFactory(equipment=equipment, cost=100)
        MaintenanceRecordFactory(equipment=equipment, cost=200)

        response = auth_client.get(LIST_URL, {"ordering": "cost"})

        costs = [float(item["cost"]) for item in response.json()["results"]]
        assert costs == sorted(costs)


class TestMaintenanceRetrieve:
    def test_retrieve_record(self, auth_client, maintenance_record):
        response = auth_client.get(detail_url(maintenance_record.id))

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == maintenance_record.id
        assert body["equipment_asset_tag"] == maintenance_record.equipment.asset_tag

    def test_retrieve_missing_returns_404(self, auth_client):
        assert auth_client.get(detail_url(99999)).status_code == 404


class TestMaintenanceUpdate:
    def test_patch_partial_update(self, auth_client, maintenance_record):
        response = auth_client.patch(
            detail_url(maintenance_record.id),
            {"description": "Descripción actualizada"},
            format="json",
        )

        assert response.status_code == 200
        maintenance_record.refresh_from_db()
        assert maintenance_record.description == "Descripción actualizada"

    def test_put_replaces_all_fields(self, auth_client, maintenance_record):
        payload = {
            "equipment": maintenance_record.equipment.id,
            "kind": MaintenanceKind.CORRECTIVE,
            "date": "2026-02-01",
            "description": "Reemplazo total del registro",
            "cost": "999.00",
        }
        response = auth_client.put(detail_url(maintenance_record.id), payload, format="json")

        assert response.status_code == 200
        maintenance_record.refresh_from_db()
        assert maintenance_record.kind == MaintenanceKind.CORRECTIVE
        assert maintenance_record.description == "Reemplazo total del registro"

    def test_technician_field_is_read_only_and_derived(
        self, auth_client, equipment, tecnico
    ):
        record = MaintenanceRecordFactory(
            equipment=equipment, technician="Texto viejo", assigned_technician=None
        )
        # Un registro antiguo sin FK muestra su texto histórico.
        assert auth_client.get(detail_url(record.id)).json()["technician"] == (
            "Texto viejo"
        )
        # Al asignar un técnico, el campo pasa a derivar de la asignación e
        # ignora cualquier `technician` enviado en el body.
        resp = auth_client.patch(
            detail_url(record.id),
            {"assigned_technician": tecnico.id, "technician": "IGNORADO"},
            format="json",
        )
        assert resp.status_code == 200
        expected = f"{tecnico.first_name} {tecnico.last_name}".strip()
        assert resp.json()["technician"] == expected

    def test_patch_with_future_date_returns_400(self, auth_client, maintenance_record):
        future = (timezone.localdate() + timedelta(days=10)).isoformat()
        response = auth_client.patch(
            detail_url(maintenance_record.id), {"date": future}, format="json"
        )
        assert response.status_code == 400
        assert "La fecha no puede ser futura." in response.json()["date"][0]


class TestMaintenanceDelete:
    def test_delete_record(self, auth_client, maintenance_record):
        response = auth_client.delete(detail_url(maintenance_record.id))

        assert response.status_code == 204
        assert not MaintenanceRecord.objects.filter(id=maintenance_record.id).exists()

    def test_delete_missing_returns_404(self, auth_client):
        assert auth_client.delete(detail_url(99999)).status_code == 404


class TestEquipmentHistoryAction:
    def test_history_returns_only_records_of_equipment(self, auth_client, branch):
        target = EquipmentFactory(branch=branch)
        other = EquipmentFactory(branch=branch)
        MaintenanceRecordFactory.create_batch(3, equipment=target)
        MaintenanceRecordFactory(equipment=other)

        response = auth_client.get(history_url(target.id))

        assert response.status_code == 200
        body = response.json()
        assert body["count"] == 3
        for item in body["results"]:
            assert item["equipment"] == target.id

    def test_history_paginated_response(self, auth_client, equipment):
        MaintenanceRecordFactory.create_batch(2, equipment=equipment)

        response = auth_client.get(history_url(equipment.id))

        assert response.status_code == 200
        body = response.json()
        assert "results" in body
        assert "count" in body

    def test_history_returns_404_for_unknown_equipment(self, auth_client):
        assert auth_client.get(history_url(99999)).status_code == 404

    def test_history_requires_auth(self, api_client, equipment):
        assert api_client.get(history_url(equipment.id)).status_code == 401
