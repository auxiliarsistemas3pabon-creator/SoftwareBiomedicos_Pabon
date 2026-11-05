from django.utils.translation import gettext_lazy as _
from rest_framework.permissions import BasePermission

from users.models import User

Role = User.Role

MANAGEMENT_ROLES = {Role.SUPERADMIN, Role.ADMIN, Role.COORDINADOR}

# Acciones abstractas
VIEW, CREATE, EDIT, DELETE = "view", "create", "edit", "delete"
_ALL = frozenset({VIEW, CREATE, EDIT, DELETE})

# Matriz rol × recurso × acciones permitidas.
#
# ESPEJO EXACTO de frontend/src/lib/permissions.ts — si cambia
# uno, cambia el otro. El frontend solo esconde botones; la autorización real
# la impone `HasRolePermission` aquí. El recurso "users" tiene su propia lógica
# en api/v1/users/views.py (IsAdminRole + check_object_permissions) y NO pasa
# por esta matriz.
ROLE_MATRIX: dict[str, dict[str, frozenset[str]]] = {
    Role.SUPERADMIN: {
        "branches": _ALL,
        "equipment": _ALL,
        # Registrar / editar / borrar mantenimientos en el historial es
        # exclusivo del coordinador. El superadmin solo lo consulta.
        "maintenance": frozenset({VIEW}),
        "scheduling": _ALL,
        "failures": _ALL,
        "work_orders": _ALL,
    },
    Role.ADMIN: {
        "branches": _ALL,
        "equipment": _ALL,
        # Registrar / editar / borrar mantenimientos en el historial es
        # exclusivo del coordinador. El resto de la gestión solo lo consulta
        # (hoja de vida del equipo, KPIs).
        "maintenance": frozenset({VIEW}),
        "scheduling": _ALL,
        "failures": _ALL,
        "work_orders": _ALL,
    },
    Role.COORDINADOR: {
        "branches": frozenset({VIEW}),
        "equipment": frozenset({VIEW, CREATE, EDIT}),
        "maintenance": _ALL,
        "scheduling": _ALL,
        "failures": frozenset({VIEW, CREATE, EDIT}),
        "work_orders": _ALL,
    },
    Role.INGENIERO: {
        "branches": frozenset({VIEW}),
        "equipment": frozenset({VIEW}),
        # Consulta solicitudes asignadas (área solicitante); no las gestiona.
        # El trabajo lo ejecuta desde órdenes de trabajo y reportes de falla.
        "scheduling": frozenset({VIEW}),
        "failures": frozenset({VIEW, CREATE, EDIT}),
        "work_orders": frozenset({VIEW, CREATE, EDIT}),
    },
    Role.TECNICO: {
        "equipment": frozenset({VIEW}),
        "failures": frozenset({VIEW, CREATE}),
        "scheduling": frozenset({VIEW, CREATE}),
    },
    Role.USUARIO: {
        "equipment": frozenset({VIEW}),
        "scheduling": frozenset({VIEW, CREATE}),
    },
}

# Acción de DRF → acción abstracta.
_STANDARD_ACTIONS = {
    "list": VIEW,
    "retrieve": VIEW,
    "create": CREATE,
    "update": EDIT,
    "partial_update": EDIT,
    "destroy": DELETE,
}


def role_can(role: str | None, resource: str, action: str) -> bool:
    return action in ROLE_MATRIX.get(role or "", {}).get(resource, frozenset())


class HasRolePermission(BasePermission):
    """Autorización por rol × recurso × acción según ``ROLE_MATRIX``.

    El viewset declara ``permission_resource = "<recurso>"``. Las @action
    personalizadas cuentan como EDIT si mutan (POST/PUT/PATCH/DELETE) y como
    VIEW si son de solo lectura; se puede forzar VIEW listándolas en
    ``readonly_actions`` del viewset.
    """

    message = _("Tu rol no tiene permiso para realizar esta acción.")

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False

        resource = getattr(view, "permission_resource", None)
        if resource is None:
            # El viewset no optó por esta matriz (p. ej. users). No restringe.
            return True

        action = getattr(view, "action", None)
        action_name = action if isinstance(action, str) else None
        needed = _STANDARD_ACTIONS.get(action_name) if action_name is not None else None
        if needed is None:
            # @action custom o `metadata` (OPTIONS): read-only => VIEW, si no EDIT.
            readonly = request.method in ("GET", "HEAD", "OPTIONS") or (
                action_name in getattr(view, "readonly_actions", ())
            )
            needed = VIEW if readonly else EDIT

        return role_can(getattr(user, "role", None), resource, needed)
