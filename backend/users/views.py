from django.utils.translation import gettext_lazy as _
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.utils import AuditAction, log_audit_event

from .filters import UserFilter
from .models import User
from .permissions import CanListAssignableUsers, IsAdminRole
from .serializers import (
    PasswordChangeSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


class SelfDeleteConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = _("No puedes eliminar tu propia cuenta.")
    default_code = "self_delete"


class UserViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios + perfil propio + cambio de contraseña."""

    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)
    filterset_class = UserFilter
    search_fields = ("username", "email", "first_name", "last_name")
    ordering_fields = ("username", "email", "role", "date_joined")
    ordering = ("username",)

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        if self.action == "set_password":
            return PasswordChangeSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == "me":
            return [IsAuthenticated()]
        if self.action in ("retrieve", "update", "partial_update", "set_password"):
            return [IsAuthenticated()]
        if self.action == "list":
            return [IsAuthenticated(), CanListAssignableUsers()]
        return [IsAuthenticated(), IsAdminRole()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not isinstance(user, User):
            return qs.none()
        if self.action == "list" and user.role not in {
            User.Role.SUPERADMIN,
            User.Role.ADMIN,
        }:
            return qs.filter(
                is_active=True,
                role__in={User.Role.INGENIERO, User.Role.TECNICO},
            )
        return qs

    def _is_superadmin(self, user):
        return getattr(user,"role",None) == User.Role.SUPERADMIN

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        is_admin = IsAdminRole().has_permission(request, self)
        is_self = obj.pk == request.user.pk
        is_superadmin_caller = self._is_superadmin(request.user)
        target_is_superadmin = obj.role == User.Role.SUPERADMIN

        if self.action in ("retrieve", "set_password"):
            if not (is_admin or is_self):
                self.permission_denied(request, message=str(_("No tienes permisos para esta acción.")))

            if (
                self.action == "set_password"
                and not is_self
                and target_is_superadmin
                and not is_superadmin_caller
            ):
                self.permission_denied(
                    request,
                    message=str(_(
                        "Solo un superadministrador puede cambiar la contraseña de otro superadministrador."
                    ))
                )

        if self.action in ("update", "partial_update"):
            if not (is_admin or is_self):
                self.permission_denied(request, message=str(_("No tienes permisos para esta acción.")))
            if not is_self and target_is_superadmin and not is_superadmin_caller:
                self.permission_denied(
                    request,
                    message=str(_("Solo un superadministrador puee modificar a otro superadministrador.")),
                )
            if is_self and not is_admin:
                forbidden = {"role", "is_active", "is_staff", "is_superuser"}
                touched = forbidden.intersection(request.data.keys())
                if touched:
                    self.permission_denied(
                        request,
                        message=str(_("No puedes modificar tu propio rol o estado.")),
                    )

    def perform_update(self, serializer):
        tracked_fields = ("role", "is_active")
        before = {f: getattr(serializer.instance, f) for f in tracked_fields}
        instance = serializer.save()
        changes = {
            f: {"from": str(before[f]), "to": str(getattr(instance, f))}
            for f in tracked_fields
            if before[f] != getattr(instance, f)
        }
        if changes:
            log_audit_event(
                self.request.user, AuditAction.UPDATE, instance,
                request=self.request, changes=changes,
            )

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise SelfDeleteConflict()
        if instance.role == User.Role.SUPERADMIN and not self._is_superadmin(self.request.user):
            raise PermissionDenied(
                _("Solo un superadministrador puede eliminar a otro superadministrador.")
            )
        log_audit_event(self.request.user, AuditAction.DELETE, instance, request=self.request)
        instance.delete()

    @action(detail=False, methods=["get"])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=True, methods=["post"], url_path="set_password")
    def set_password(self, request, pk=None):
        user = self.get_object()
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={"request": request, "target_user": user},
        )
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        log_audit_event(
            request.user, AuditAction.UPDATE, user,
            request=request, changes={"password": "changed"},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
