from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone

from failures.managers import FailureRecordManager
from failures.models import FailureRecord, FailureSeverity

from .factories import FailureRecordFactory


def _failure_objects() -> FailureRecordManager:
    manager = FailureRecord.objects
    assert isinstance(manager, FailureRecordManager)
    return manager

pytestmark = pytest.mark.django_db


class TestFailureRecordModel:
    def test_str_format(self, equipment):
        moment = timezone.now().replace(year=2026, month=3, day=10)
        failure = FailureRecordFactory(
            equipment=equipment,
            severity=FailureSeverity.HIGH,
            reported_at=moment,
        )
        assert str(failure) == f"Alta - {equipment.asset_tag} - 2026-03-10"

    def test_default_ordering_is_reported_at_desc(self, equipment):
        old = FailureRecordFactory(
            equipment=equipment,
            reported_at=timezone.now() - timedelta(days=10),
        )
        new = FailureRecordFactory(
            equipment=equipment,
            reported_at=timezone.now() - timedelta(days=1),
        )
        mid = FailureRecordFactory(
            equipment=equipment,
            reported_at=timezone.now() - timedelta(days=5),
        )

        ids = list(FailureRecord.objects.values_list("id", flat=True))

        assert ids == [new.id, mid.id, old.id]

    def test_default_unresolved(self, equipment):
        failure = FailureRecordFactory(equipment=equipment)
        assert failure.resolved is False
        assert failure.resolved_at is None
        assert failure.resolution_notes == ""


class TestMarkResolved:
    def test_mark_resolved_sets_flags_and_timestamp(self, equipment):
        failure = FailureRecordFactory(equipment=equipment)
        before = timezone.now()

        failure.mark_resolved(notes="Cambio de pieza")

        failure.refresh_from_db()
        assert failure.resolved is True
        assert failure.resolved_at is not None
        assert failure.resolved_at >= before
        assert failure.resolution_notes == "Cambio de pieza"

    def test_mark_resolved_without_notes_keeps_existing(self, equipment):
        failure = FailureRecordFactory(equipment=equipment)
        failure.mark_resolved()

        failure.refresh_from_db()
        assert failure.resolved is True
        assert failure.resolution_notes == ""

    def test_mark_resolved_is_idempotent(self, equipment):
        failure = FailureRecordFactory(equipment=equipment)
        failure.mark_resolved(notes="primera")

        first_resolved_at = failure.resolved_at

        # Segunda llamada — no debe mover resolved_at, ni romper.
        failure.mark_resolved(notes="")
        failure.refresh_from_db()

        assert failure.resolved is True
        assert failure.resolved_at == first_resolved_at


class TestFailureRecordManager:
    def test_open_returns_only_unresolved(self, equipment):
        FailureRecordFactory(equipment=equipment, resolved=False)
        FailureRecordFactory(
            equipment=equipment,
            resolved=True,
            resolved_at=timezone.now(),
        )

        assert _failure_objects().open().count() == 1

    def test_resolved_returns_only_resolved(self, equipment):
        FailureRecordFactory(equipment=equipment, resolved=False)
        FailureRecordFactory(
            equipment=equipment,
            resolved=True,
            resolved_at=timezone.now(),
        )

        assert _failure_objects().resolved().count() == 1

    def test_critical_returns_only_critical(self, equipment):
        FailureRecordFactory(equipment=equipment, severity=FailureSeverity.LOW)
        FailureRecordFactory(equipment=equipment, severity=FailureSeverity.CRITICAL)
        FailureRecordFactory(equipment=equipment, severity=FailureSeverity.CRITICAL)

        assert _failure_objects().critical().count() == 2

    def test_for_equipment_filters_by_equipment(self, equipment, branch):
        from equipment.tests.factories import EquipmentFactory

        other = EquipmentFactory(branch=branch)
        FailureRecordFactory.create_batch(2, equipment=equipment)
        FailureRecordFactory(equipment=other)

        qs = _failure_objects().for_equipment(equipment.id)

        assert qs.count() == 2

    def test_for_branch_filters_by_branch(self, branch):
        from branches.tests.factories import BranchFactory
        from equipment.tests.factories import EquipmentFactory

        other_branch = BranchFactory()
        eq_in = EquipmentFactory(branch=branch)
        eq_out = EquipmentFactory(branch=other_branch)
        FailureRecordFactory.create_batch(2, equipment=eq_in)
        FailureRecordFactory(equipment=eq_out)

        assert _failure_objects().for_branch(branch.id).count() == 2


class TestResolvedConsistencyConstraint:
    def test_bulk_update_resolved_true_without_resolved_at_fails(self, equipment):
        """Constraint de DB: resolved=True ⇒ resolved_at IS NOT NULL."""
        failure = FailureRecordFactory(equipment=equipment, resolved=False)

        with pytest.raises(IntegrityError):
            with transaction.atomic():
                FailureRecord.objects.filter(pk=failure.pk).update(resolved=True, resolved_at=None)
