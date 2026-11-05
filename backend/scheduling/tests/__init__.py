"""Pruebas de solicitudes (`apps.scheduling.tests`).

- `test_api.py` / `test_permissions.py`: ROLE_MATRIX, visibilidad
  (gestión todo; técnico/ingeniero lo suyo; usuario solo lo que pidió),
  `complete` y `notify`.
- `test_assignment.py`: responsable ingeniero o técnico.
- `test_signals.py` / `test_work_order_sync.py`: OT al asignar y
  estado del equipo.
- `test_tasks.py`: email, cola de vencidos (lock, stagger, una
  alerta/día) y WS `overdue_maintenance`.
- `test_models.py`, factories y conftest.
"""
