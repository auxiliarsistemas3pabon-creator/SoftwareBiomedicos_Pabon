import pytest
from rest_framework.test import APIClient

from users.tests.factories import AdminFactory, IngenieroFactory, TecnicoFactory


@pytest.fixture(autouse=True)
def skip_overdue_alert_queue(monkeypatch):
    monkeypatch.setattr(
        "dashboard.views.queue_overdue_alerts.delay",
        lambda: "skipped",
    )


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
def tecnico(db):
    return TecnicoFactory()


@pytest.fixture
def ingeniero(db):
    return IngenieroFactory()
