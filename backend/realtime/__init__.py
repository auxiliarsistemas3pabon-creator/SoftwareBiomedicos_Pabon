"""Notificaciones en tiempo real (`apps.realtime`).

No define modelos. Usa Django Channels + Redis.

- `consumers.NotificationConsumer` en `/ws/notifications/`: solo
  lectura (el cliente no manda eventos). JWT por cookie o Bearer
  (middleware). Si no hay sesión acepta y cierra con 4401 para que
  el frontend deje de reintentar. Si Redis cae, cierra 1013
  (sí reintenta). Grupo único `notifications`.
- `events.broadcast_notification()`: publica un dict JSON solo a los
  grupos individuales de los usuarios destinatarios;
  si el channel layer falla, loguea y no tumba la operación de
  negocio.
- `routing.py`: websocket_urlpatterns.
- `middleware.py`: autentica el scope ASGI.

Quien emite: tarea de email de agendamiento (`schedule_email_sent`)
y `send_overdue_alert` (`overdue_maintenance`).
"""
