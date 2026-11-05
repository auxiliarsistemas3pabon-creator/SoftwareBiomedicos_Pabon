from typing import Any

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from common.typing_meta import ModelSerializerMeta

from .models import Brand, EquipmentModel


class BrandSerializer(serializers.ModelSerializer[Brand]):
    class Meta(ModelSerializerMeta):
        model: Any = Brand
        fields = (
            "id",
            "name",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {
            # El mensaje de unicidad y de "vacío" lo controla validate_name (en español).
            "name": {"validators": [], "trim_whitespace": False},
        }

    def validate_name(self, value: str) -> str:
        normalized = " ".join(value.split()).strip()
        if not normalized:
            raise serializers.ValidationError(_("El nombre no puede estar vacío."))

        queryset = Brand.objects.filter(name__iexact=normalized)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(_("Ya existe una marca con este nombre."))
        return normalized


class EquipmentModelSerializer(serializers.ModelSerializer[EquipmentModel]):
    brand_name = serializers.CharField(source="brand.name", read_only=True)

    class Meta(ModelSerializerMeta):
        model: Any = EquipmentModel
        fields = (
            "id",
            "brand",
            "brand_name",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "brand_name", "created_at", "updated_at")
        extra_kwargs = {
            # El mensaje de "vacío" lo controla validate_name (en español).
            "name": {"trim_whitespace": False},
        }

    def validate_name(self, value: str) -> str:
        normalized = " ".join(value.split()).strip()
        if not normalized:
            raise serializers.ValidationError(_("El nombre del modelo no puede estar vacío."))
        return normalized

    def validate_brand(self, value: Brand) -> Brand:
        if not value.is_active:
            raise serializers.ValidationError(_("La marca seleccionada no está activa."))
        return value

    def validate_description(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs):
        brand = attrs.get("brand", getattr(self.instance, "brand", None))
        name = attrs.get("name", getattr(self.instance, "name", None))
        if brand is not None and name:
            queryset = EquipmentModel.objects.filter(brand=brand, name__iexact=name)
            if self.instance is not None:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    {"name": _("Ya existe un modelo con este nombre para esta marca.")}
                )
        return attrs
