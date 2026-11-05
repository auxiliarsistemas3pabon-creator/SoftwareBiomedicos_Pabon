from django_filters import rest_framework as filters

from .models import Brand, EquipmentModel


class BrandFilter(filters.FilterSet):
    is_active = filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = Brand
        fields = ("is_active",)


class EquipmentModelFilter(filters.FilterSet):
    brand = filters.NumberFilter(field_name="brand_id")
    is_active = filters.BooleanFilter(field_name="is_active")
    brand_is_active = filters.BooleanFilter(field_name="brand__is_active")
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")
    brand_name = filters.CharFilter(field_name="brand__name", lookup_expr="icontains")

    class Meta:
        model = EquipmentModel
        fields = ("brand", "is_active", "brand_is_active", "name", "brand_name")
