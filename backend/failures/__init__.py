"""Reportes de falla (`apps.failures`).

Modelo `FailureRecord`: equipo, descripción, severidad (Baja /
Media / Alta / Crítica), quién reportó, `reported_at`, flags
`resolved` / `resolved_at` / notas. Constraints: coherencia de
resuelto y `resolved_at >= reported_at`. `mark_resolved()` es
idempotente (no pisa una fecha ya puesta).

Tras guardar o borrar, las señales piden a
`apps.equipment.reliability` recalcular MTBF y MTTR del equipo.
El HTTP está en `api.v1.failures` (CRUD + acción `resolve`).
Admin Django en `admin.py`.
"""
