"""Usuarios del sistema (`apps.users`).

`User` hereda de AbstractUser. Campos extra: email único, nombres
obligatorios, teléfono con regex, `role` y `area` (solo tiene
sentido en el rol operativo).

Roles (`User.Role`):
- `superadmin`, `admin`: gestión plena (is_admin_role).
- `coordinador`: agenda, OT, catálogo; no borra historial.
- `ingeniero`: ejecuta OT asignadas; consulta solicitudes propias.
- `tecnico` (etiqueta “Usuario operativo”): recorte por `area`
  (p. ej. Radiología) en equipos, fallas y solicitudes.
- `usuario`: solo ve/crea las solicitudes que él pidió; puede
  consultar inventario.

`UserManager` da de alta con rol. Admin Django personalizado.
HTTP en `api.v1.users` con permisos propios (no ROLE_MATRIX).
"""

# GitHub atribuye contribuciones usando la identidad Git del autor del commit.
