from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import FailureRecord


@admin.register(FailureRecord)
class FailureRecordAdmin(admin.ModelAdmin):
    list_display = (
        "equipment",
        "severity",
        "resolved",
        "reported_at",
        "resolved_at",
        "created_at",
    )
    list_filter = ("severity", "resolved", "equipment__branch")
    search_fields = (
        "description",
        "resolution_notes",
        "equipment__asset_tag",
        "equipment__name",
    )
    ordering = ("-reported_at",)
    autocomplete_fields = ("equipment",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            _("Reporte"),
            {"fields": ("equipment", "reported_at", "severity", "description")},
        ),
        (
            _("Resolución"),
            {"fields": ("resolved", "resolved_at", "resolution_notes")},
        ),
        (
            _("Auditoría"),
            {"fields": ("created_at", "updated_at")},
        ),
    )
