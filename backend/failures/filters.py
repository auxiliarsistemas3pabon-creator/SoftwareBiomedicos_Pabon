from django_filters import rest_framework as filters

from .models import FailureRecord


class FailureRecordFilter(filters.FilterSet):
    equipment = filters.NumberFilter(field_name="equipment_id")
    branch = filters.NumberFilter(field_name="equipment__branch_id")
    area = filters.CharFilter(field_name="equipment__area", lookup_expr="iexact")
    severity = filters.CharFilter(field_name="severity", lookup_expr="iexact")
    resolved = filters.BooleanFilter(field_name="resolved")
    reported_at_after = filters.DateTimeFilter(field_name="reported_at", lookup_expr="gte")
    reported_at_before = filters.DateTimeFilter(field_name="reported_at", lookup_expr="lte")

    class Meta:
        model = FailureRecord
        fields = (
            "equipment",
            "branch",
            "area",
            "severity",
            "resolved",
            "reported_at_after",
            "reported_at_before",
        )
