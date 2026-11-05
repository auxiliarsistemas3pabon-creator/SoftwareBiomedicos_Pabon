import pytest
from django.db import IntegrityError

from ..managers import BrandManager, EquipmentModelManager
from ..models import Brand, EquipmentModel
from .factories import BrandFactory, EquipmentModelFactory


def _brand_objects() -> BrandManager:
    manager = Brand.objects
    assert isinstance(manager, BrandManager)
    return manager


def _model_objects() -> EquipmentModelManager:
    manager = EquipmentModel.objects
    assert isinstance(manager, EquipmentModelManager)
    return manager

pytestmark = pytest.mark.django_db


class TestBrandModel:
    def test_str(self):
        b = BrandFactory(name="Philips")
        assert str(b) == "Philips"

    def test_active_inactive_managers(self):
        BrandFactory(name="A", is_active=True)
        BrandFactory(name="B", is_active=False)

        assert _brand_objects().active().count() == 1
        assert _brand_objects().inactive().count() == 1


class TestEquipmentModelModel:
    def test_str(self, brand):
        m = EquipmentModelFactory(brand=brand, name="MX450")
        assert str(m) == f"{brand.name} MX450"

    def test_unique_per_brand_constraint(self, brand):
        EquipmentModelFactory(brand=brand, name="MX450")
        with pytest.raises(IntegrityError):
            EquipmentModel.objects.create(brand=brand, name="MX450")

    def test_same_name_allowed_across_brands(self):
        b1 = BrandFactory(name="Philips")
        b2 = BrandFactory(name="Mindray")
        EquipmentModelFactory(brand=b1, name="MX450")
        # No debe levantar IntegrityError
        EquipmentModel.objects.create(brand=b2, name="MX450")

    def test_for_brand_manager(self, brand):
        EquipmentModelFactory.create_batch(3, brand=brand)
        EquipmentModelFactory()  # otra brand
        assert _model_objects().for_brand(brand.id).count() == 3

    def test_with_active_brand_manager(self):
        active = BrandFactory(is_active=True)
        inactive = BrandFactory(is_active=False)
        EquipmentModelFactory(brand=active)
        EquipmentModelFactory(brand=inactive)
        assert _model_objects().with_active_brand().count() == 1
