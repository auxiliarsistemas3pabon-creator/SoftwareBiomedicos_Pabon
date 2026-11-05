from typing import Any

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from common.typing_meta import ModelSerializerMeta

from .models import Branch


class BranchSerializer(serializers.ModelSerializer[Branch]):
    # Vacío → None: el UNIQUE de Postgres trata "" como valor y la segunda
    # sede sin correo chocaba (IntegrityError). Varios NULL sí se permiten.
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    class Meta(ModelSerializerMeta):
        model: Any = Branch
        fields = (
            "id",
            "name",
            "address",
            "city",
            "phone",
            "email",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {
            # El mensaje de unicidad lo controla validate_name / validate_email.
            "name": {"validators": []},
            "email": {"validators": []},
        }

    def validate_name(self, value: str) -> str:
        normalized = " ".join(value.split()).strip()
        if not normalized:
            raise serializers.ValidationError(_("El nombre no puede estar vacío."))

        queryset = Branch.objects.filter(name__iexact=normalized)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                _("Ya existe una sede con este nombre.")
            )
        return normalized

    def validate_email(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if not normalized:
            return None
        queryset = Branch.objects.filter(email__iexact=normalized)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                _("Ya existe una sede con este correo electrónico.")
            )
        return normalized

    def validate_city(self, value: str) -> str:
        return " ".join(value.split()).strip()

    def validate_address(self, value: str) -> str:
        return value.strip()
