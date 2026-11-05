import pytest
from rest_framework.test import APIClient

from branches.tests.factories import BranchFactory
from catalog.tests.factories import EquipmentModelFactory
from users.tests.factories import AdminFactory

from .factories import EquipmentFactory


@pytest.fixture(autouse=True)
def media_storage(tmp_path, settings):
    """Aísla el storage de archivos por test usando tmp_path como MEDIA_ROOT."""
    settings.MEDIA_ROOT = tmp_path
    settings.STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    yield tmp_path


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
def equipment_model(db):
    return EquipmentModelFactory()


@pytest.fixture
def equipment(db, branch):
    return EquipmentFactory(branch=branch)
