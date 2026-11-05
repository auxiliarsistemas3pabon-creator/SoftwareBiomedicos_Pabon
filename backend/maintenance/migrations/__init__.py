"""Migraciones de mantenimientos (`apps.maintenance.migrations`).

- `0001_initial`: crea `MaintenanceRecord`.
- `0002`: FKs a equipo, asignados y solicitud.
- `0003`: campo `observations` (nota de resolución).
- `0004`: amplía kinds (calibración/inspección, etc.) y retira un
  modelo obsoleto de agenda que ya no se usa.
"""
