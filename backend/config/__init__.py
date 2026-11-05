"""Paquete Django del proyecto (`config`).

Es el punto de entrada de runtime, no de dominio: no define modelos.

Contiene:
- `urls.py`: `/admin/` redirige a la HomePage del frontend
  (`FRONTEND_BASE_URL`); el admin de Django queda en `/django-admin/`.
  API en `/api/v1/`, esquema OpenAPI (`/api/schema/`, `/api/docs/`,
  `/api/redoc/`). En DEBUG también sirve `/media/` y, si está
  instalado, el debug toolbar.
- `asgi.py` / `wsgi.py`: Channels (WebSocket `/ws/notifications/`) y
  el servidor HTTP de Gunicorn/Uvicorn.
- `celery.py`: app Celery `biometric` que autodescubre tareas de
  `apps.*` (emails de solicitud, cola de vencidos, etc.).
- `settings/`: `base` (Postgres, Redis, DRF, JWT, CORS, CSP, locale
  es-CO / America/Bogota), `dev` (DEBUG) y `prod` (HTTPS, secretos).

Este módulo solo reexporta la app Celery para que el worker arranque
con `celery -A config worker`. No agregar imports de apps aquí.
"""
from .celery import app as celery_app

__all__ = ("celery_app",)
