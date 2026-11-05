"""Migraciones de fallas (`apps.failures.migrations`).

- `0001_initial`: crea `FailureRecord` (equipo, severidad,
  descripción, resolved).
- `0002`: constraint `resolved_at` posterior a `reported_at`.
- `0003`: FK `reported_by` al usuario que reportó.
"""
