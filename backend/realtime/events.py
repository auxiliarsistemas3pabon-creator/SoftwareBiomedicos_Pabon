"""Helpers para publicar eventos hacia el canal `/ws/notifications/`.

Se llaman desde tareas Celery / señales del backend. Si el channel layer no
está configurado (p. ej. un comando de management puntual) la publicación es
un no-op silencioso — nunca debe tumbar la lógica de negocio.
"""
from __future__ import annotations

import logging
from collections.abc import Iterable
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import notification_group_for_user

logger = logging.getLogger(__name__)


def broadcast_notification(
    payload: dict[str, Any], *, recipient_ids: Iterable[int]
) -> None:
    """Envía un evento JSON únicamente a los usuarios destinatarios."""
    groups = {
        notification_group_for_user(user_id)
        for user_id in recipient_ids
        if user_id is not None
    }
    if not groups:
        return

    layer = get_channel_layer()
    if layer is None:
        return

    async def send_to_recipients() -> None:
        for group in groups:
            await layer.group_send(
                group,
                {"type": "notification.message", "payload": payload},
            )

    try:
        async_to_sync(send_to_recipients)()
    except Exception:
        logger.exception(
            "No se pudo publicar la notificación (channel layer/Redis). "
            "La operación de negocio continúa."
        )
