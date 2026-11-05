from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import Branch


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "phone", "email", "is_active", "created_at")
    list_filter = ("is_active", "city")
    search_fields = ("name", "address", "city", "email", "phone")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            _("Información general"),
            {"fields": ("name", "address", "city", "is_active")},
        ),
        (
            _("Contacto"),
            {"fields": ("phone", "email")},
        ),
        (
            _("Auditoría"),
            {"fields": ("created_at", "updated_at")},
        ),
    )
