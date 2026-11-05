import pytest
from rest_framework.test import APIClient

from .factories import (
    AdminFactory,
    CoordinadorFactory,
    IngenieroFactory,
    SuperadminFactory,
    TecnicoFactory,
    UserFactory,
)


# pytest
@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client):
    def _make(user):
        api_client.force_authenticate(user=user)
        return api_client

    return _make


@pytest.fixture
def superadmin(db):
    return SuperadminFactory()


@pytest.fixture
def admin(db):
    return AdminFactory()


@pytest.fixture
def coordinador(db):
    return CoordinadorFactory()


@pytest.fixture
def ingeniero(db):
    return IngenieroFactory()


@pytest.fixture
def tecnico(db):
    return TecnicoFactory()


@pytest.fixture
def user(db):
    return UserFactory()
