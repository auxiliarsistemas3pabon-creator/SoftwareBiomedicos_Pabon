"""App contenedora de tests del dashboard (`apps.dashboard`).

No está en INSTALLED_APPS y no define modelos, señales ni tareas.
El endpoint y la agregación viven en `api.v1.dashboard` (`views.py`
arma el payload por rol y calcula KPIs, series y listas).

Este paquete solo agrupa tests de integración de
`GET /api/v1/dashboard/summary/` (alcance por rol, vencidos, cola
de alertas Celery). Pytest los recoge por ruta, no como app Django.
"""
