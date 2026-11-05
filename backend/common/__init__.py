"""Utilidades compartidas de la API v1 (`api.v1.common`).

No es un recurso de negocio: concentra lo que reutilizan las vistas.

- `permissions.HasRolePermission` + `ROLE_MATRIX`: matriz rol × recurso
  × acción (view/create/edit/delete), espejo del frontend. El técnico
  no tiene `work_orders` ni `maintenance` ni `branches`. El rol
  `usuario` puede consultar equipos y crear solicitudes, pero no tiene
  fallas, OT, sedes ni historial. Users no usa esta matriz.
- `area_scope.operativo_area()`: recorta querysets del rol `tecnico`
  a su campo `area` (p. ej. Radiología).
- `pagination.DefaultPagination`: page/page_size; honra `page_size`
  hasta 200 (el tamaño por defecto sale de settings DRF).
- `file_validation.validate_uploaded_file`: extensión, tamaño y magic
  bytes de PDFs, imágenes y evidencias.
- `authentication.CookieJWTAuthentication`: acepta Bearer o cookie
  `access_token`; las mutaciones por cookie exigen CSRF.
- `mixins.AuditLogMixin`: registra borrados en `AuditLog`.
- `views.HealthView` y vistas JWT cookie/body (login, refresh, logout).

Cambiar algo aquí afecta a todos los endpoints de v1.
"""
