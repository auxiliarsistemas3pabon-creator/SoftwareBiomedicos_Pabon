"""Historial de mantenimientos ya ejecutados (`apps.maintenance`).

Modelo `MaintenanceRecord`: tipo (preventivo / correctivo /
reparación / calibración / inspección), fecha, descripción,
`observations`, responsables (ingeniero y/o técnico), costo, PDF
opcional. OneToOne opcional a la solicitud cumplida y a la OT.

Señales (`signals.py`):
- Un registro con responsable y sin solicitud crea/actualiza la OT.
- Al pasar la OT a FINISHED se actualiza fecha/costo del registro o
  se genera uno nuevo (y se copia la nota de resolución).
- Borrar el registro quita el PDF del storage y reabre la solicitud
  ligada (`is_completed=False`).

No es el flujo de “en proceso”: eso vive en `EquipmentWorkOrder`.
HTTP en `api.v1.maintenance`. Admin Django en `admin.py`.
"""
