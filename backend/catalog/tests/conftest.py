import pytest
from rest_framework.test import APIClient

from users.tests.factories import AdminFactory

from .factories import BrandFactory, EquipmentModelFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return AdminFactory()


@pytest.fixture
def auth_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def brand(db):
    return BrandFactory()


@pytest.fixture
def equipment_model(db, brand):
    return EquipmentModelFactory(brand=brand)
