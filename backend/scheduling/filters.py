from django_filters import rest_framework as filters

from .models import MaintenanceSchedule


class MaintenanceScheduleFilter(filters.FilterSet):
    equipment = filters.NumberFilter(field_name="equipment_id")
    branch = filters.NumberFilter(field_name="equipment__branch_id")
    area = filters.CharFilter(field_name="equipment__area", lookup_expr="iexact")
    kind = filters.CharFilter(field_name="kind", lookup_expr="iexact")
    is_completed = filters.BooleanFilter(field_name="is_completed")
    scheduled_date_after = filters.DateFilter(field_name="scheduled_date", lookup_expr="gte")
    scheduled_date_before = filters.DateFilter(field_name="scheduled_date", lookup_expr="lte")
    requested_date_after = filters.DateFilter(field_name="requested_date", lookup_expr="gte")
    requested_date_before = filters.DateFilter(field_name="requested_date", lookup_expr="lte")
    requested_by = filters.NumberFilter(field_name="requested_by_id")
    assigned_engineer = filters.NumberFilter(field_name="assigned_engineer_id")
    assigned_technician = filters.NumberFilter(field_name="assigned_technician_id")
    unassigned = filters.BooleanFilter(method="filter_unassigned")
    unscheduled = filters.BooleanFilter(field_name="scheduled_date", lookup_expr="isnull")

    class Meta:
        model = MaintenanceSchedule
        fields = (
            "equipment",
            "branch",
            "area",
            "kind",
            "is_completed",
            "scheduled_date_after",
            "scheduled_date_before",
            "requested_date_after",
            "requested_date_before",
            "requested_by",
            "assigned_engineer",
            "assigned_technician",
            "unassigned",
            "unscheduled",
        )

    def filter_unassigned(self, queryset, name, value):
        if value is True:
            return queryset.filter(
                assigned_engineer__isnull=True, assigned_technician__isnull=True
            )
        if value is False:
            return queryset.exclude(
                assigned_engineer__isnull=True, assigned_technician__isnull=True
            )
        return queryset
