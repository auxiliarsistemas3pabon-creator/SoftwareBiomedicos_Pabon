import pytest

from catalog.tests.factories import EquipmentModelFactory
from equipment.managers import EquipmentManager
from equipment.models import Equipment, EquipmentStatus, RiskClass

from .factories import EquipmentFactory


def _equipment_objects() -> EquipmentManager:
    manager = Equipment.objects
    assert isinstance(manager, EquipmentManager)
    return manager


@pytest.mark.django_db
class TestEquipmentModel:
    def test_str(self, equipment):
        assert str(equipment) == f"{equipment.name} ({equipment.asset_tag})"

    def test_default_status_is_active(self, branch):
        eq_model = EquipmentModelFactory()
        eq = Equipment(
            name="x",
            asset_tag="EQ-X",
            equipment_model=eq_model,
            branch=branch,
        )
        assert eq.status == EquipmentStatus.ACTIVE

    def test_default_risk_class_is_none(self, equipment):
        assert equipment.risk_class is None

    def test_risk_class_choices_are_invima(self):
        values = {choice.value for choice in RiskClass}
        assert values == {"I", "IIA", "IIB", "III"}


@pytest.mark.django_db
class TestEquipmentManager:
    def test_active_returns_only_active(self):
        EquipmentFactory(status=EquipmentStatus.ACTIVE)
        EquipmentFactory(status=EquipmentStatus.INACTIVE)
        EquipmentFactory(status=EquipmentStatus.IN_REPAIR)
        assert _equipment_objects().active().count() == 1

    def test_in_repair_returns_maintenance_and_repair(self):
        EquipmentFactory(status=EquipmentStatus.ACTIVE)
        EquipmentFactory(status=EquipmentStatus.IN_MAINTENANCE)
        EquipmentFactory(status=EquipmentStatus.IN_REPAIR)
        assert _equipment_objects().in_repair().count() == 2

    def test_for_branch_filters_by_branch_id(self, branch):
        EquipmentFactory.create_batch(2, branch=branch)
        EquipmentFactory()
        assert _equipment_objects().for_branch(branch.id).count() == 2

    def test_select_related_avoids_n_plus_1(self, django_assert_num_queries):
        EquipmentFactory.create_batch(3)
        with django_assert_num_queries(1):
            for eq in Equipment.objects.all():
                _ = eq.branch.name
                _ = eq.equipment_model.name
                _ = eq.equipment_model.brand.name
