from django_filters import rest_framework as filters

from .models import User


class UserFilter(filters.FilterSet):
    role = filters.ChoiceFilter(choices=User.Role.choices)
    is_active = filters.BooleanFilter()

    class Meta:
        model = User
        fields = ("role", "is_active")
