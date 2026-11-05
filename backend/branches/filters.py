from django_filters import rest_framework as filters

from .models import Branch


class BranchFilter(filters.FilterSet):
    city = filters.CharFilter(field_name="city", lookup_expr="iexact")
    is_active = filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = Branch
        fields = ("city", "is_active")
