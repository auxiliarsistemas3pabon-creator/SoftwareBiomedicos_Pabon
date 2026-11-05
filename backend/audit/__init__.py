"""Auditoría de acciones sensibles (`apps.audit`).

No expone endpoints: es infraestructura de trazabilidad.

- `models.AuditLog`: actor (User o nulo), acción create/update/delete,
  etiqueta del modelo, id y repr del objeto, `changes` JSON e IP.
  Índices por modelo+objeto y por fecha.
- `utils.log_audit_event()`: crea el registro; toma IP de
  `X-Forwarded-For` o `REMOTE_ADDR`. Lo invocan `AuditLogMixin`
  (borrados de recursos) y `api.v1.users` (cambios de rol, de activo
  y de contraseña). Hay que llamarlo con el estado previo al delete
  porque Django limpia el pk en memoria.
- `admin.py`: consulta en Django Admin.
- No hay señales automáticas: solo se escribe cuando alguien llama
  explícitamente a `log_audit_event`.
"""
