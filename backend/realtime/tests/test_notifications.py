import asyncio
from unittest.mock import AsyncMock

import pytest
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken

from realtime import events
from realtime.consumers import (
    AUTH_CLOSE_CODE,
    CHANNEL_LAYER_CLOSE_CODE,
    notification_group_for_user,
)
from realtime.events import broadcast_notification
from realtime.middleware import CookieJWTAuthMiddleware
from realtime.routing import websocket_urlpatterns
from users.tests.factories import TecnicoFactory

pytestmark = pytest.mark.django_db

WS_APP = CookieJWTAuthMiddleware(URLRouter(websocket_urlpatterns))
PATH = "/ws/notifications/"


def _cookie_header(token: str) -> list[tuple[bytes, bytes]]:
    return [(b"cookie", f"access_token={token}".encode())]


def _close_code_for(headers):
    """Conecta y devuelve el código con que el consumer cierra la conexión."""

    async def scenario():
        comm = WebsocketCommunicator(WS_APP, PATH, headers=headers)
        await comm.connect()
        out = await comm.receive_output(timeout=2)
        await comm.disconnect()
        return out

    return async_to_sync(scenario)()


def test_anonymous_handshake_is_closed_with_4401():
    out = _close_code_for(None)
    assert out["type"] == "websocket.close"
    assert out["code"] == AUTH_CLOSE_CODE


def test_invalid_token_is_closed_with_4401():
    out = _close_code_for(_cookie_header("not-a-real-jwt"))
    assert out["type"] == "websocket.close"
    assert out["code"] == AUTH_CLOSE_CODE


def test_authenticated_user_connects_and_receives_targeted_messages():
    user = TecnicoFactory()
    other_user = TecnicoFactory()
    token = str(AccessToken.for_user(user))
    other_token = str(AccessToken.for_user(other_user))
    payload = {"type": "schedule_email_sent", "schedule_id": 7, "subject": "x"}

    async def scenario():
        comm = WebsocketCommunicator(WS_APP, PATH, headers=_cookie_header(token))
        other_comm = WebsocketCommunicator(
            WS_APP, PATH, headers=_cookie_header(other_token)
        )
        connected, _ = await comm.connect()
        other_connected, _ = await other_comm.connect()
        assert connected is True
        assert other_connected is True

        layer = get_channel_layer()
        assert layer is not None
        await layer.group_send(
            notification_group_for_user(user.pk),
            {"type": "notification.message", "payload": payload},
        )
        received = await comm.receive_json_from(timeout=2)
        other_received_nothing = await other_comm.receive_nothing(timeout=0.1)
        await comm.disconnect()
        await other_comm.disconnect()
        return received, other_received_nothing

    received, other_received_nothing = async_to_sync(scenario)()
    assert received == payload
    assert other_received_nothing is True


def test_authenticated_user_via_bearer_header_connects():
    token = str(AccessToken.for_user(TecnicoFactory()))

    async def scenario():
        comm = WebsocketCommunicator(
            WS_APP, PATH, headers=[(b"authorization", f"Bearer {token}".encode())]
        )
        connected, _ = await comm.connect()
        await comm.disconnect()
        return connected

    assert async_to_sync(scenario)() is True


def test_channel_layer_outage_closes_with_1013(monkeypatch):
    class BoomLayer:
        """Suficiente para Channels 4.2 AsyncConsumer.__call__.

        El consumer pide new_channel + receive al arrancar, y luego group_add
        en connect(). El fallo de Redis se simula ahí, que es el try/except
        que cierra con 1013.
        """

        async def new_channel(self, *args, **kwargs):
            return "test.channel"

        async def receive(self, *args, **kwargs):
            await asyncio.get_running_loop().create_future()

        async def group_add(self, *args, **kwargs):
            raise ConnectionError("redis down")

        async def group_discard(self, *args, **kwargs):
            return None

    monkeypatch.setattr(
        "channels.consumer.get_channel_layer",
        lambda *a, **k: BoomLayer(),
    )
    token = str(AccessToken.for_user(TecnicoFactory()))
    out = _close_code_for(_cookie_header(token))
    assert out["type"] == "websocket.close"
    assert out["code"] == CHANNEL_LAYER_CLOSE_CODE


def test_broadcast_notification_wraps_payload_for_each_recipient(monkeypatch):
    class _FakeLayer:
        group_send = AsyncMock()

    fake_layer = _FakeLayer()
    monkeypatch.setattr(events, "get_channel_layer", lambda: fake_layer)

    broadcast_notification(
        {"type": "schedule_email_sent", "schedule_id": 3},
        recipient_ids=[7, 7],
    )

    fake_layer.group_send.assert_awaited_once_with(
        "notifications.user.7",
        {
            "type": "notification.message",
            "payload": {"type": "schedule_email_sent", "schedule_id": 3},
        },
    )


def test_broadcast_notification_is_noop_without_layer(monkeypatch):
    monkeypatch.setattr(events, "get_channel_layer", lambda: None)
    # No debe lanzar.
    broadcast_notification({"type": "x"}, recipient_ids=[7])


def test_broadcast_notification_is_noop_without_recipients(monkeypatch):
    class _FakeLayer:
        group_send = AsyncMock()

    fake_layer = _FakeLayer()
    monkeypatch.setattr(events, "get_channel_layer", lambda: fake_layer)

    broadcast_notification({"type": "x"}, recipient_ids=[])

    fake_layer.group_send.assert_not_awaited()


def test_broadcast_notification_swallows_channel_layer_errors(monkeypatch):
    async def boom(*_args, **_kwargs):
        raise TimeoutError("Timeout reading from redis:6379")

    class _BoomLayer:
        group_send = staticmethod(boom)

    fake_layer = _BoomLayer()
    monkeypatch.setattr(events, "get_channel_layer", lambda: fake_layer)
    broadcast_notification({"type": "x"}, recipient_ids=[7])


class TestScheduleEmailBroadcast:
    def test_task_broadcasts_after_email(self, settings, monkeypatch):
        from branches.tests.factories import BranchFactory
        from equipment.tests.factories import EquipmentFactory
        from scheduling import tasks
        from scheduling.tasks import send_schedule_notification
        from scheduling.tests.factories import MaintenanceScheduleFactory

        settings.CELERY_TASK_ALWAYS_EAGER = True
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        settings.MAINTENANCE_NOTIFICATION_EMAILS = ["a@clinic.test"]

        captured: dict = {}
        captured_recipients: list[int] = []

        def capture(payload, *, recipient_ids):
            captured.update(payload)
            captured_recipients.extend(recipient_ids)

        monkeypatch.setattr(
            tasks, "broadcast_notification", capture
        )

        branch = BranchFactory(name="Sede Central", email="")
        equipment = EquipmentFactory(branch=branch, asset_tag="EQ-WS-1")
        schedule = MaintenanceScheduleFactory(equipment=equipment)

        send_schedule_notification(schedule.pk)

        assert captured["type"] == "schedule_email_sent"
        assert captured["schedule_id"] == schedule.pk
        assert captured["equipment_asset_tag"] == "EQ-WS-1"
        assert captured["branch_name"] == "Sede Central"
        assert "sent_at" in captured
        assert "subject" in captured
        assert captured_recipients == []
