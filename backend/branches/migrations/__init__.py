"""Migraciones de sedes (`apps.branches.migrations`).

- `0001_initial`: crea `Branch` (nombre, dirección, ciudad, teléfono,
  email, activa).
- `0002`: ajusta dirección y email (longitud / blank).
- `0003`: deja email nullable para que varios “sin correo” no choquen
  con la unicidad de Postgres (NULL ≠ NULL).
"""
