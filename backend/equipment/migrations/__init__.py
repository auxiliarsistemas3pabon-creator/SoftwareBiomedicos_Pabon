"""Migraciones de equipos y OT (`apps.equipment.migrations`).

- `0001`: `Equipment`, adjuntos/certificados/instrucciones, OT e
  hijos (repuestos, mediciones, evidencias, firmas, costo).
- `0002`: FKs a sede, modelo de catálogo y técnico asignado.
- `0003`: ajuste de mediciones.
- `0004`: `EquipmentWorkOrder.schedule` (OneToOne a la solicitud).
- `0005`: `EquipmentWorkOrder.maintenance_record`.
- `0006`: `cancel_reason` en la OT.
"""
