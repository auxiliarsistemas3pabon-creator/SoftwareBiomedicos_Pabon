from django.utils.translation import gettext_lazy as _
from rest_framework import permissions

from .models import User


class CanListAssignableUsers(permissions.BasePermission):
    """GET de usuarios para armar el selector de responsable.

    Admin ve a todos. Coordinador e ingeniero solo necesitan el listado de
    ingenieros y usuarios operativos activos. El resto no lista.
    """

    message = _("No tienes permisos para esta acción.")

    _ALLOWED_PERMISSIONS = {
        User.Role.SUPERADMIN,
        User.Role.ADMIN,
        User.Role.COORDINADOR,
        User.Role.INGENIERO,
    }

    def has_permission(self, request, view) -> bool:
        u = request.user
        return bool(isinstance(u, User) and u.is_authenticated and u.role in self._ALLOWED_PERMISSIONS)


class IsAdminRole(permissions.BasePermission):
    """Permite el acceso a usuarios con rol superadmin o admin."""

    message = _("No tienes permisos para esta acción.")

    def has_permission(self, request, view) -> bool:
        u = request.user
        return bool(
            isinstance(u, User)
            and u.is_authenticated
            and u.role in {User.Role.SUPERADMIN, User.Role.ADMIN}
        )

    def has_object_permission(self, request, view, obj) -> bool:
        return self.has_permission(request, view)


class IsSelf(permissions.BasePermission):
    """Permite el acceso solo si el objeto es el propio usuario autenticado."""

    message = _("No tienes permisos para esta acción.")

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        return obj.pk == request.user.pk
