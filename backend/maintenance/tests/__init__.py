"""Pruebas de mantenimientos (`apps.maintenance.tests`).

- `test_api.py` / `test_permissions.py`: CRUD; solo coordinador muta;
  superadmin/admin consultan.
- `test_assignment.py`: responsables ingeniero/técnico.
- `test_schedule_link.py`: enlace OneToOne a la solicitud.
- `test_work_order_sync.py`: señales al terminar o crear OT.
- `test_uploads.py`: PDF del registro.
- `test_models.py`, factories y conftest.
"""
