"""Pruebas del summary (`apps.dashboard.tests`).

`test_api.py` + `conftest.py`: GET `/api/v1/dashboard/summary/` por
rol (técnico, coordinador, ingeniero, usuario operativo), KPIs de
vencidos, series y que `queue_overdue_alerts` se encola cuando hay
vencidos (fixture `skip_overdue_alert_queue` evita disparar Celery
en el resto de casos). No hay modelos que probar aquí.
"""
