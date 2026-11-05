"""Migraciones de auditoría (`apps.audit.migrations`).

`0001_initial` crea `AuditLog` (FK al usuario actor, acción
create/update/delete, etiqueta e id del objeto, JSON de cambios, IP
y timestamps). No hay migraciones posteriores: el esquema no ha
cambiado.
"""
