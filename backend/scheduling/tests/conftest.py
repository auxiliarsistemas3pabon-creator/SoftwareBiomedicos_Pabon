import pytest
from rest_framework.test import APIClient

from branches.tests.factories import BranchFactory
from equipment.tests.factories import EquipmentFactory
from users.tests.factories import AdminFactory, IngenieroFactory, TecnicoFactory

from .factories import MaintenanceScheduleFactory


@pytest.fixture(autouse=True)
def celery_eager(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.MAINTENANCE_NOTIFICATION_EMAILS = [
        "mantenimiento@clinic.test",
        "jefe@clinic.test",
    ]


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
def schedule(db, equipment):
    return MaintenanceScheduleFactory(equipment=equipment)


@pytest.fixture
def ingeniero(db):
    return IngenieroFactory()


@pytest.fixture
def tecnico(db):
    return TecnicoFactory()
