import pytest
from rest_framework.test import APIClient

from users.tests.factories import AdminFactory, TecnicoFactory

from .factories import BranchFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, db):
    # Las sedes solo las gestiona superadmin/admin (ver ROLE_MATRIX). El resto
    # de tests de CRUD usan este cliente para probar validación/normalización,
    # no permisos.
    api_client.force_authenticate(user=AdminFactory())
    return api_client


@pytest.fixture
def tecnico_client(api_client, db):
    api_client.force_authenticate(user=TecnicoFactory())
    return api_client


@pytest.fixture
def admin_client(api_client, db):
    api_client.force_authenticate(user=AdminFactory())
    return api_client


@pytest.fixture
def branch(db):
    return BranchFactory()
