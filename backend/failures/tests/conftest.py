import pytest
from rest_framework.test import APIClient

from branches.tests.factories import BranchFactory
from equipment.tests.factories import EquipmentFactory
from users.tests.factories import AdminFactory

from .factories import FailureRecordFactory


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
def branch(db):
    return BranchFactory()


@pytest.fixture
def equipment(db, branch):
    return EquipmentFactory(branch=branch)


@pytest.fixture
def failure(db, equipment):
    return FailureRecordFactory(equipment=equipment)
