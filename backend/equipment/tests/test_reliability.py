from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone

from equipment.reliability import compute_metrics, recompute_for
from failures.models import FailureSeverity
from failures.tests.factories import FailureRecordFactory

pytestmark = pytest.mark.django_db


def _make_failure(equipment, *, reported_at, resolved_at=None):
    """Crea una falla forzando timestamps específicos (bypassea default=now).

    Arma la instancia con `.build()` (sin tocar la DB) y fija reported_at/
    resolved_at ANTES del único save(). Insertar primero con el default de
    reported_at (now) y corregirlo después con un save separado —como se
    hacía antes— deja pasar por la DB una fila intermedia con resolved_at ya
    fijado pero reported_at todavía en "now", lo que viola la constraint
    `failure_resolved_at_after_reported_at` cuando resolved_at es anterior.
    """
    failure = FailureRecordFactory.build(
        equipment=equipment,
        severity=FailureSeverity.HIGH,
        resolved=resolved_at is not None,
        resolved_at=resolved_at,
        reported_at=reported_at,
    )
    failure.save()
    return failure


class TestComputeMetrics:
    def test_no_failures_yields_null(self, equipment):
        mtbf, mttr = compute_metrics(equipment)
        assert mtbf is None
        assert mttr is None

    def test_one_failure_unresolved_both_null(self, equipment):
        now = timezone.now()
        _make_failure(equipment, reported_at=now)

        mtbf, mttr = compute_metrics(equipment)
        assert mtbf is None
        assert mttr is None

    def test_one_failure_resolved_mtbf_null_mttr_set(self, equipment):
        reported = timezone.now() - timedelta(hours=10)
        resolved = reported + timedelta(hours=4)
        _make_failure(equipment, reported_at=reported, resolved_at=resolved)

        mtbf, mttr = compute_metrics(equipment)
        assert mtbf is None
        assert mttr == Decimal("4.00")

    def test_two_failures_mtbf_is_delta(self, equipment):
        t0 = timezone.now() - timedelta(hours=100)
        _make_failure(equipment, reported_at=t0)
        _make_failure(equipment, reported_at=t0 + timedelta(hours=48))

        mtbf, _ = compute_metrics(equipment)
        assert mtbf == Decimal("48.00")

    def test_three_failures_mtbf_is_mean_of_deltas(self, equipment):
        t0 = timezone.now() - timedelta(hours=200)
        _make_failure(equipment, reported_at=t0)
        _make_failure(equipment, reported_at=t0 + timedelta(hours=24))
        _make_failure(equipment, reported_at=t0 + timedelta(hours=24 + 72))

        mtbf, _ = compute_metrics(equipment)
        assert mtbf == Decimal("48.00")  # (24 + 72) / 2

    def test_mttr_averages_only_resolved(self, equipment):
        t0 = timezone.now() - timedelta(hours=200)
        _make_failure(
            equipment, reported_at=t0, resolved_at=t0 + timedelta(hours=4)
        )
        _make_failure(
            equipment,
            reported_at=t0 + timedelta(hours=50),
            resolved_at=t0 + timedelta(hours=56),
        )
        _make_failure(equipment, reported_at=t0 + timedelta(hours=100))  # pendiente

        _, mttr = compute_metrics(equipment)
        assert mttr == Decimal("5.00")  # (4h + 6h) / 2


class TestSignalRecomputes:
    def test_create_triggers_recompute(self, equipment):
        assert equipment.mtbf_hours is None
        assert equipment.mttr_hours is None

        t0 = timezone.now() - timedelta(hours=100)
        _make_failure(
            equipment, reported_at=t0, resolved_at=t0 + timedelta(hours=2)
        )
        _make_failure(
            equipment,
            reported_at=t0 + timedelta(hours=48),
            resolved_at=t0 + timedelta(hours=52),
        )

        equipment.refresh_from_db()
        assert equipment.mtbf_hours == Decimal("48.00")
        assert equipment.mttr_hours == Decimal("3.00")

    def test_mark_resolved_recomputes_mttr(self, equipment):
        reported = timezone.now() - timedelta(hours=10)
        failure = _make_failure(equipment, reported_at=reported)
        equipment.refresh_from_db()
        assert equipment.mttr_hours is None

        failure.resolved = True
        failure.resolved_at = reported + timedelta(hours=3)
        failure.save(update_fields=["resolved", "resolved_at"])

        equipment.refresh_from_db()
        assert equipment.mttr_hours == Decimal("3.00")

    def test_delete_recomputes(self, equipment):
        t0 = timezone.now() - timedelta(hours=100)
        f1 = _make_failure(equipment, reported_at=t0)
        _make_failure(equipment, reported_at=t0 + timedelta(hours=48))
        equipment.refresh_from_db()
        assert equipment.mtbf_hours == Decimal("48.00")

        f1.delete()

        equipment.refresh_from_db()
        # Solo queda una falla → MTBF vuelve a None.
        assert equipment.mtbf_hours is None


class TestSerializerReadonly:
    def test_metrics_appear_in_response(self, auth_client, equipment):
        recompute_for(equipment)
        url = reverse("equipment:equipment-detail", args=[equipment.id])

        response = auth_client.get(url)

        assert response.status_code == 200
        body = response.json()
        assert "mtbf_hours" in body
        assert "mttr_hours" in body

    def test_metrics_ignored_on_write(self, auth_client, equipment):
        url = reverse("equipment:equipment-detail", args=[equipment.id])

        response = auth_client.patch(
            url,
            {"mtbf_hours": "999.99", "mttr_hours": "888.88"},
            format="json",
        )

        assert response.status_code == 200
        equipment.refresh_from_db()
        # No se persisten; el signal de fallas (sin fallas) los deja en null.
        assert equipment.mtbf_hours is None
        assert equipment.mttr_hours is None
