from django_filters import rest_framework as filters

from .models import Equipment


class EquipmentFilter(filters.FilterSet):
    branch = filters.NumberFilter(field_name="branch_id")
    status = filters.CharFilter(field_name="status", lookup_expr="iexact")
    equipment_model = filters.NumberFilter(field_name="equipment_model_id")
    brand = filters.NumberFilter(field_name="equipment_model__brand_id")
    risk_class = filters.CharFilter(field_name="risk_class", lookup_expr="iexact")
    risk_class__isnull = filters.BooleanFilter(field_name="risk_class", lookup_expr="isnull")
    purchase_date_after = filters.DateFilter(field_name="purchase_date", lookup_expr="gte")
    purchase_date_before = filters.DateFilter(field_name="purchase_date", lookup_expr="lte")
    name_startswith = filters.CharFilter(field_name="name",lookup_expr="istartswith")

    class Meta:
        model = Equipment
        fields = (
            "branch",
            "status",
            "equipment_model",
            "brand",
            "risk_class",
            "risk_class__isnull",
            "purchase_date_after",
            "purchase_date_before",
            "name_startswith",
        )
