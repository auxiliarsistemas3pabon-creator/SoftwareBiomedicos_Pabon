"""Inventario biomédico y órdenes de trabajo (`apps.equipment`).

Modelos:
- `Equipment`: placa única, serie, sede, modelo de catálogo, área,
  estado (Operativo / Fuera de servicio / En mantenimiento / En
  reparación), clase de riesgo INVIMA, tipo de tecnología, MTBF/MTTR
  persistidos, QR PNG.
- Adjuntos de hoja de vida: `EquipmentInstruction`,
  `EquipmentCertificate`, `EquipmentAttachment`.
- `EquipmentWorkOrder`: número, tipo, estado (PENDING / IN_PROGRESS /
  FINISHED / CANCELLED), técnico asignado, fechas. OneToOne opcional
  a `MaintenanceSchedule` y/o `MaintenanceRecord`. Hijos:
  `WorkOrderSparePart`, `WorkOrderMeasurement`, `WorkOrderEvidence`,
  `WorkOrderSignature`, `WorkOrderCost`.

Servicios y señales:
- `services.generate_qr_for_equipment`: PNG cuyo payload es
  `{FRONTEND_BASE_URL}/admin/equipos/{id}` (id inmutable, no placa).
- Señales: QR al crear; borra el archivo QR al borrar el equipo;
  recalcula `spare_parts_cost` al cambiar o quitar repuestos.
- `reliability.recompute_for`: MTBF (promedio entre fallas) y MTTR
  (promedio reported→resolved). Lo disparan las señales de fallas.

Comandos: `import_equipment` (CSV, upsert por placa) y
`regenerate_qr`. HTTP en `api.v1.equipment`.
"""
