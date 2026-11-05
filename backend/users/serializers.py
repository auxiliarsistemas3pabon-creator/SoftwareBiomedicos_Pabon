from typing import Any

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from common.typing_meta import ModelSerializerMeta

from .models import User


def _normalize_text(value: str) -> str:
    return " ".join(value.split()).strip()


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _normalize_username(value: str) -> str:
    return value.strip()


class UserSerializer(serializers.ModelSerializer[User]):
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta(ModelSerializerMeta):
        model: Any = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "phone",
            "area",
            "is_active",
            "date_joined",
            "last_login",
        )
        read_only_fields = ("id", "role_display", "date_joined", "last_login")


class UserCreateSerializer(serializers.ModelSerializer[User]):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta(ModelSerializerMeta):
        model: Any = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "phone",
            "area",
            "is_active",
            "password",
            "date_joined",
            "last_login",
        )
        read_only_fields = ("id", "role_display", "date_joined", "last_login")

    def validate_username(self, value: str) -> str:
        normalized = _normalize_username(value)
        if not normalized:
            raise serializers.ValidationError(_("El nombre de usuario no puede estar vacío."))
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError(
                _("Ya existe un usuario con este nombre de usuario.")
            )
        return normalized

    def validate_email(self, value: str) -> str:
        normalized = _normalize_email(value)
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError(
                _("Ya existe un usuario con este correo electrónico.")
            )
        return normalized

    def validate_first_name(self, value: str) -> str:
        normalized = _normalize_text(value)
        if not normalized:
            raise serializers.ValidationError(_("Los nombres no pueden estar vacíos."))
        return normalized

    def validate_last_name(self, value: str) -> str:
        normalized = _normalize_text(value)
        if not normalized:
            raise serializers.ValidationError(_("Los apellidos no pueden estar vacíos."))
        return normalized

    def validate_role(self, value: str) -> str:
        request = self.context.get("request")
        caller = getattr(request, "user", None)
        if value == User.Role.SUPERADMIN:
            if caller is None or caller.role != User.Role.SUPERADMIN:
                raise serializers.ValidationError(
                    _("Solo un superadministrador puede asignar el rol superadministrador.")
                )
        return value

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        is_active = validated_data.pop("is_active", True)
        user = User.objects.create_user(password=password, **validated_data)
        if not is_active:
            user.is_active = False
            user.save(update_fields=["is_active"])
        return user


class UserUpdateSerializer(serializers.ModelSerializer[User]):
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta(ModelSerializerMeta):
        model: Any = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "phone",
            "area",
            "is_active",
            "date_joined",
            "last_login",
        )
        read_only_fields = ("id", "role_display", "date_joined", "last_login")

    def validate_username(self, value: str) -> str:
        normalized = _normalize_username(value)
        if not normalized:
            raise serializers.ValidationError(_("El nombre de usuario no puede estar vacío."))
        qs = User.objects.filter(username__iexact=normalized)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                _("Ya existe un usuario con este nombre de usuario.")
            )
        return normalized

    def validate_email(self, value: str) -> str:
        normalized = _normalize_email(value)
        qs = User.objects.filter(email__iexact=normalized)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                _("Ya existe un usuario con este correo electrónico.")
            )
        return normalized

    def validate_first_name(self, value: str) -> str:
        normalized = _normalize_text(value)
        if not normalized:
            raise serializers.ValidationError(_("Los nombres no pueden estar vacíos."))
        return normalized

    def validate_last_name(self, value: str) -> str:
        normalized = _normalize_text(value)
        if not normalized:
            raise serializers.ValidationError(_("Los apellidos no pueden estar vacíos."))
        return normalized

    def validate_role(self, value: str) -> str:
        request = self.context.get("request")
        caller = getattr(request, "user", None)
        target = self.instance
        is_superadmin_caller = caller is not None and caller.role == User.Role.SUPERADMIN

        promoting_to_superadmin = value == User.Role.SUPERADMIN
        demoting_existing_superadmin = (
            target is not None
            and target.role == User.Role.SUPERADMIN
            and value != User.Role.SUPERADMIN
        )

        if (promoting_to_superadmin or demoting_existing_superadmin) and not is_superadmin_caller:
            raise serializers.ValidationError(
                _("Solo un superadministrador puede asignar el rol superadministrador.")
            )
        return value


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=False, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate_new_password(self, value: str) -> str:
        target = self.context.get("target_user")
        try:
            validate_password(value, user=target)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        target = self.context.get("target_user")
        caller = getattr(request, "user", None)

        is_self = caller is not None and target is not None and caller.pk == target.pk

        if is_self and target is not None:
            current = attrs.get("current_password")
            if not current:
                raise serializers.ValidationError(
                    {"current_password": _("Este campo es requerido para cambiar tu propia contraseña.")}
                )
            if not target.check_password(current):
                raise serializers.ValidationError(
                    {"current_password": _("La contraseña actual es incorrecta.")}
                )
        return attrs
