"""Pruebas de equipos y OT (`apps.equipment.tests`).

- `test_api.py` / `test_permissions.py`: CRUD, recorte por área del
  operativo, QR, historial.
- `test_work_orders.py`: OT e hijos (repuestos, mediciones,
  evidencias, firmas, costos), acción `complete` y nota obligatoria.
- `test_signals.py`: QR al crear y sync de `spare_parts_cost`.
- `test_reliability.py`: MTBF/MTTR.
- `test_services.py`: payload y archivo QR.
- `test_file_validation.py`: magic bytes / tamaño de adjuntos.
- `test_models.py` y factories/conftest.
"""
