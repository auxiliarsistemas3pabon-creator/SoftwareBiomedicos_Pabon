"""Migraciones de solicitudes (`apps.scheduling.migrations`).

- `0001`–`0002`: modelo inicial y FKs a equipo/asignados.
- `0003`: pasa a “Solicitud” (`requested_by` / `requested_date`,
  `scheduled_date` nullable) y ajusta el campo de técnico.
- `0004`: `auto_generated` y `generated_from` (solicitud origen).
- `0005`: default False en `auto_generated` para que el INSERT no
  mande NULL.
"""
