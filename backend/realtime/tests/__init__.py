"""Pruebas de realtime (`apps.realtime.tests`).

`test_notifications.py`: handshake WebSocket (4401 si no hay JWT),
`broadcast_notification` a usuarios destinatarios, y el evento
`schedule_email_sent` que emite la tarea Celery tras el correo de
agendamiento. No hay modelos.
"""
