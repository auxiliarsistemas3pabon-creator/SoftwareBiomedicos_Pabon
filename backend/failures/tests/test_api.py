from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from equipment.tests.factories import EquipmentFactory
from failures.models import FailureRecord, FailureSeverity
from users.tests.factories import TecnicoFactory

from .factories import FailureRecordFactory

pytestmark = pytest.mark.django_db


LIST_URL = reverse("failures:failure-list")


def detail_url(pk: int) -> str:
    return reverse("failures:failure-detail", args=[pk])


def resolve_url(pk: int) -> str:
    return reverse("failures:failure-resolve", args=[pk])


class TestFailureAuth:
    def test_list_requires_auth(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401

    def test_create_requires_auth(self, api_client, equipment):
        payload = {
            "equipment": equipment.id,
            "description": "x",
            "severity": FailureSeverity.LOW,
        }
        assert api_client.post(LIST_URL, payload, format="json").status_code == 401

    def test_resolve_requires_auth(self, api_client, failure):
        assert api_client.post(resolve_url(failure.id)).status_code == 401


class TestFailureCreate:
    def _payload(self, equipment, **overrides):
        data = {
            "equipment": equipment.id,
            "description": "El sensor de oxígeno marca valores erráticos.",
            "severity": FailureSeverity.HIGH,
        }
        data.update(overrides)
        return data

    def test_create_returns_201(self, auth_client, equipment):
        response = auth_client.post(LIST_URL, self._payload(equipment), format="json")

        assert response.status_code == 201
        body = response.json()
        assert body["equipment"] == equipment.id
        assert body["equipment_asset_tag"] == equipment.asset_tag
        assert body["branch_name"] == equipment.branch.name
        assert body["resolved"] is False
        assert body["resolved_at"] is None
        assert FailureRecord.objects.count() == 1

    def test_create_defaults_reported_at_to_now(self, auth_client, equipment):
        before = timezone.now()
        response = auth_client.post(LIST_URL, self._payload(equipment), format="json")

        assert response.status_code == 201
        reported = response.json()["reported_at"]
        # Si no enviamos reported_at, debe poblarse con un default cercano a "now".
        assert reported is not None
        # Persistido en BD: debe ser >= before.
        record = FailureRecord.objects.get(pk=response.json()["id"])
        assert record.reported_at >= before

    def test_create_strips_description(self, auth_client, equipment):
        response = auth_client.post(
            LIST_URL,
            self._payload(equipment, description="   Falla X   "),
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["description"] == "Falla X"

    def test_create_with_empty_description_returns_400(self, auth_client, equipment):
        response = auth_client.post(
            LIST_URL,
            self._payload(equipment, description="   "),
            format="json",
        )
        assert response.status_code == 400
        assert "La descripción es obligatoria." in response.json()["description"][0]

    def test_create_with_future_reported_at_returns_400(self, auth_client, equipment):
        future = (timezone.now() + timedelta(days=1)).isoformat()
        response = auth_client.post(
            LIST_URL,
            self._payload(equipment, reported_at=future),
            format="json",
        )
        assert response.status_code == 400
        assert "La fecha de reporte no puede ser futura." in response.json()["reported_at"][0]

    def test_create_with_resolved_at_but_not_resolved_returns_400(self, auth_client, equipment):
        response = auth_client.post(
            LIST_URL,
            self._payload(
                equipment,
                resolved=False,
                resolved_at=timezone.now().isoformat(),
            ),
            format="json",
        )
        assert response.status_code == 400
        assert (
            "No se puede definir 'resuelta el' sin marcar la falla como resuelta."
            in response.json()["resolved_at"][0]
        )

    def test_create_with_resolved_at_before_reported_at_returns_400(self, auth_client, equipment):
        reported = timezone.now()
        before_reported = (reported - timedelta(hours=1)).isoformat()
        response = auth_client.post(
            LIST_URL,
            self._payload(
                equipment,
                reported_at=reported.isoformat(),
                resolved=True,
                resolved_at=before_reported,
            ),
            format="json",
        )
        assert response.status_code == 400
        assert (
            "La fecha de resolución no puede ser anterior al reporte."
            in response.json()["resolved_at"][0]
        )

    def test_create_resolved_true_without_resolved_at_autofills(self, auth_client, equipment):
        response = auth_client.post(
            LIST_URL,
            self._payload(equipment, resolved=True),
            format="json",
        )

        assert response.status_code == 201
        body = response.json()
        assert body["resolved"] is True
        assert body["resolved_at"] is not None

    def test_create_missing_required_returns_400(self, auth_client):
        response = auth_client.post(LIST_URL, {}, format="json")
        assert response.status_code == 400
        body = response.json()
        for required in ("equipment", "description", "severity"):
            assert required in body


class TestFailureList:
    def test_list_paginated(self, auth_client, equipment):
        FailureRecordFactory.create_batch(3, equipment=equipment)

        response = auth_client.get(LIST_URL)

        assert response.status_code == 200
        body = response.json()
        assert body["count"] == 3
        assert "results" in body

    def test_filter_by_equipment(self, auth_client, branch):
        eq1 = EquipmentFactory(branch=branch)
        eq2 = EquipmentFactory(branch=branch)
        FailureRecordFactory.create_batch(2, equipment=eq1)
        FailureRecordFactory(equipment=eq2)

        response = auth_client.get(LIST_URL, {"equipment": eq1.id})

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_filter_by_branch(self, auth_client):
        from branches.tests.factories import BranchFactory

        b1 = BranchFactory()
        b2 = BranchFactory()
        eq1 = EquipmentFactory(branch=b1)
        eq2 = EquipmentFactory(branch=b2)
        FailureRecordFactory.create_batch(2, equipment=eq1)
        FailureRecordFactory(equipment=eq2)

        response = auth_client.get(LIST_URL, {"branch": b1.id})

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_filter_by_severity(self, auth_client, equipment):
        FailureRecordFactory(equipment=equipment, severity=FailureSeverity.LOW)
        FailureRecordFactory(equipment=equipment, severity=FailureSeverity.CRITICAL)
        FailureRecordFactory(equipment=equipment, severity=FailureSeverity.CRITICAL)

        response = auth_client.get(LIST_URL, {"severity": "CRITICAL"})

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_filter_by_resolved(self, auth_client, equipment):
        FailureRecordFactory(equipment=equipment, resolved=False)
        FailureRecordFactory(
            equipment=equipment,
            resolved=True,
            resolved_at=timezone.now(),
        )

        response = auth_client.get(LIST_URL, {"resolved": "true"})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_filter_by_reported_at_range(self, auth_client, equipment):
        now = timezone.now()
        FailureRecordFactory(equipment=equipment, reported_at=now - timedelta(days=10))
        FailureRecordFactory(equipment=equipment, reported_at=now - timedelta(days=5))
        FailureRecordFactory(equipment=equipment, reported_at=now - timedelta(days=1))

        response = auth_client.get(
            LIST_URL,
            {
                "reported_at_after": (now - timedelta(days=7)).isoformat(),
                "reported_at_before": now.isoformat(),
            },
        )

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_search_by_description(self, auth_client, branch):
        # La búsqueda es por nombre del equipo, no por la descripción.
        pantalla = EquipmentFactory(name="Pantalla principal", branch=branch)
        otro = EquipmentFactory(name="Fuente de poder", branch=branch)
        FailureRecordFactory(equipment=pantalla, description="Pantalla rota")
        FailureRecordFactory(equipment=otro, description="Sin energía")

        response = auth_client.get(LIST_URL, {"search": "Pantalla"})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_search_by_resolution_notes(self, auth_client, branch):
        # La búsqueda es por nombre del equipo, no por las notas de resolución.
        con_nota = EquipmentFactory(name="Equipo bateria", branch=branch)
        sin_nota = EquipmentFactory(name="Equipo otro", branch=branch)
        FailureRecordFactory(
            equipment=con_nota,
            resolved=True,
            resolved_at=timezone.now(),
            resolution_notes="Reemplazo de batería completado",
        )
        FailureRecordFactory(equipment=sin_nota, resolution_notes="")

        response = auth_client.get(LIST_URL, {"search": "bateria"})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_search_by_asset_tag(self, auth_client, branch):
        # La búsqueda es por nombre del equipo, no por la placa.
        target = EquipmentFactory(name="Equipo TARGET", asset_tag="FAIL-TARGET", branch=branch)
        other = EquipmentFactory(name="Equipo OTHER", asset_tag="FAIL-OTHER", branch=branch)
        FailureRecordFactory(equipment=target)
        FailureRecordFactory(equipment=other)

        response = auth_client.get(LIST_URL, {"search": "TARGET"})

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_default_ordering_desc_by_reported_at(self, auth_client, equipment):
        now = timezone.now()
        FailureRecordFactory(equipment=equipment, reported_at=now - timedelta(days=10))
        FailureRecordFactory(equipment=equipment, reported_at=now - timedelta(days=1))
        FailureRecordFactory(equipment=equipment, reported_at=now - timedelta(days=5))

        response = auth_client.get(LIST_URL)

        timestamps = [item["reported_at"] for item in response.json()["results"]]
        assert timestamps == sorted(timestamps, reverse=True)


class TestFailureRetrieve:
    def test_retrieve(self, auth_client, failure):
        response = auth_client.get(detail_url(failure.id))

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == failure.id
        assert body["equipment_asset_tag"] == failure.equipment.asset_tag

    def test_retrieve_missing_returns_404(self, auth_client):
        assert auth_client.get(detail_url(99999)).status_code == 404


class TestFailureUpdate:
    def test_patch_partial(self, auth_client, failure):
        response = auth_client.patch(
            detail_url(failure.id),
            {"severity": FailureSeverity.CRITICAL},
            format="json",
        )

        assert response.status_code == 200
        failure.refresh_from_db()
        assert failure.severity == FailureSeverity.CRITICAL

    def test_put_replaces_all_fields(self, auth_client, failure):
        payload = {
            "equipment": failure.equipment.id,
            "description": "Nueva descripción de la falla.",
            "severity": FailureSeverity.LOW,
            "resolved": False,
        }
        response = auth_client.put(detail_url(failure.id), payload, format="json")

        assert response.status_code == 200
        failure.refresh_from_db()
        assert failure.description == "Nueva descripción de la falla."
        assert failure.severity == FailureSeverity.LOW

    def test_patch_with_invalid_resolved_at_returns_400(self, auth_client, failure):
        response = auth_client.patch(
            detail_url(failure.id),
            {"resolved": False, "resolved_at": timezone.now().isoformat()},
            format="json",
        )
        assert response.status_code == 400
        assert (
            "No se puede definir 'resuelta el' sin marcar la falla como resuelta."
            in response.json()["resolved_at"][0]
        )


class TestFailureDelete:
    def test_delete(self, auth_client, failure):
        response = auth_client.delete(detail_url(failure.id))

        assert response.status_code == 204
        assert not FailureRecord.objects.filter(id=failure.id).exists()

    def test_delete_missing_returns_404(self, auth_client):
        assert auth_client.delete(detail_url(99999)).status_code == 404


class TestResolveAction:
    def test_resolve_marks_failure_resolved(self, auth_client, failure):
        assert failure.resolved is False

        response = auth_client.post(resolve_url(failure.id))

        assert response.status_code == 200
        body = response.json()
        assert body["resolved"] is True
        assert body["resolved_at"] is not None

        failure.refresh_from_db()
        assert failure.resolved is True
        assert failure.resolved_at is not None

    def test_resolve_persists_notes(self, auth_client, failure):
        notes = "Se reemplazó el sensor de oxígeno por uno nuevo."
        response = auth_client.post(
            resolve_url(failure.id),
            {"resolution_notes": notes},
            format="json",
        )

        assert response.status_code == 200
        assert response.json()["resolution_notes"] == notes
        failure.refresh_from_db()
        assert failure.resolution_notes == notes

    def test_resolve_is_idempotent(self, auth_client, failure):
        first = auth_client.post(
            resolve_url(failure.id),
            {"resolution_notes": "primera resolución"},
            format="json",
        )
        assert first.status_code == 200
        first_resolved_at = first.json()["resolved_at"]

        second = auth_client.post(resolve_url(failure.id))

        assert second.status_code == 200
        body = second.json()
        assert body["resolved"] is True
        # resolved_at no debe moverse en la segunda llamada.
        assert body["resolved_at"] == first_resolved_at

    def test_resolve_missing_returns_404(self, auth_client):
        assert auth_client.post(resolve_url(99999)).status_code == 404


class TestOperativoFailureScope:
    """El operativo solo ve y crea reportes propios, de equipos de su área."""

    def _client(self, api_client, **kwargs):
        user = TecnicoFactory(**kwargs)
        api_client.force_authenticate(user=user)
        return api_client, user

    def test_lists_only_own_reports_in_own_area(self, api_client, branch):
        mine = EquipmentFactory(branch=branch, area="Radiología")
        other_area = EquipmentFactory(branch=branch, area="UCI")
        client, user = self._client(api_client, area="Radiología")
        peer = TecnicoFactory(area="Radiología")

        own = FailureRecordFactory(equipment=mine, reported_by=user)
        FailureRecordFactory(equipment=mine, reported_by=peer)
        FailureRecordFactory(equipment=other_area, reported_by=user)

        response = client.get(LIST_URL)
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["results"]}
        assert ids == {own.id}

    def test_create_sets_reported_by_and_stays_in_area(self, api_client, branch):
        equipment = EquipmentFactory(branch=branch, area="Radiología")
        client, user = self._client(api_client, area="Radiología")

        response = client.post(
            LIST_URL,
            {
                "equipment": equipment.id,
                "description": "El monitor no enciende.",
                "severity": FailureSeverity.MEDIUM,
                "resolved": True,
                "resolution_notes": "intento de diagnóstico",
            },
            format="json",
        )

        assert response.status_code == 201
        body = response.json()
        assert body["reported_by"] == user.id
        assert body["resolved"] is False
        assert body["resolution_notes"] == ""
        record = FailureRecord.objects.get(pk=body["id"])
        assert record.reported_by_id == user.id

    def test_cannot_report_other_area_equipment(self, api_client, branch):
        other = EquipmentFactory(branch=branch, area="UCI")
        client, _user = self._client(api_client, area="Radiología")

        response = client.post(
            LIST_URL,
            {
                "equipment": other.id,
                "description": "Falla observada.",
                "severity": FailureSeverity.LOW,
            },
            format="json",
        )
        assert response.status_code == 400

    def test_cannot_resolve(self, api_client, branch):
        equipment = EquipmentFactory(branch=branch, area="Radiología")
        client, user = self._client(api_client, area="Radiología")
        failure = FailureRecordFactory(equipment=equipment, reported_by=user)

        response = client.post(resolve_url(failure.id))
        assert response.status_code == 403

