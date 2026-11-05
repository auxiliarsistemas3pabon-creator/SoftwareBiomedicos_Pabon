import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)

def notification_group_for_user(user_id: int) -> str:
    return f"notifications.user.{user_id}"

# Código de cierre que el frontend (lib/websocket.ts) interpreta como
# "sesión inválida/expirada": deja de reintentar.
AUTH_CLOSE_CODE = 4401
# Redis/channel layer caído: el cliente sí debe reintentar (no es 4401).
CHANNEL_LAYER_CLOSE_CODE = 1013


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """Canal `/ws/notifications/`: empuja eventos del backend al frontend.

    Solo recibe (server → cliente). Los mensajes que envíe el cliente se
    ignoran.
    """

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            # Aceptamos y cerramos de inmediato con 4401 (en vez de rechazar el
            # handshake con HTTP 403) para que el navegador reciba el código en
            # `CloseEvent.code` y lib/websocket.ts deje de reintentar.
            await self.accept()
            await self.close(code=AUTH_CLOSE_CODE)
            return
        self.notification_group = notification_group_for_user(user.pk)
        try:
            await self.channel_layer.group_add(
                self.notification_group, self.channel_name
            )
        except Exception:
            logger.exception(
                "No se pudo unir al channel layer (¿Redis inalcanzable? "
                "CHANNELS_REDIS_URL debe ser redis://redis:6379/3 dentro de Docker)."
            )
            await self.accept()
            await self.close(code=CHANNEL_LAYER_CLOSE_CODE)
            return
        await self.accept()

    async def disconnect(self, code):
        notification_group = getattr(self, "notification_group", None)
        if notification_group is None:
            return
        try:
            await self.channel_layer.group_discard(
                notification_group, self.channel_name
            )
        except Exception:
            logger.debug("group_discard falló (channel layer no disponible)", exc_info=True)

    async def receive_json(self, content, **kwargs):
        # Canal de solo lectura: no se procesa nada entrante.
        pass

    # --- handlers de eventos del channel layer (type: "notification.message") ---
    async def notification_message(self, event):
        await self.send_json(event["payload"])
