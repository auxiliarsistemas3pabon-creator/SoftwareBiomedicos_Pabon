from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import MaintenanceRecord


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = (
        "equipment",
        "kind",
        "date",
        "technician",
        "assigned_engineer",
        "assigned_technician",
        "cost",
        "created_at",
    )
    list_filter = (
        "kind",
        "date",
        "equipment__branch",
        "assigned_engineer",
        "assigned_technician",
    )
    search_fields = (
        "description",
        "observations",
        "technician",
        "equipment__asset_tag",
        "equipment__name",
        "assigned_engineer__username",
        "assigned_engineer__first_name",
        "assigned_engineer__last_name",
        "assigned_technician__username",
        "assigned_technician__first_name",
        "assigned_technician__last_name",
    )
    ordering = ("-date", "-created_at")
    autocomplete_fields = ("equipment", "assigned_engineer", "assigned_technician")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            _("Información general"),
            {
                "fields": (
                    "equipment",
                    "kind",
                    "date",
                    "description",
                    "observations",
                    "technician",
                    "cost",
                )
            },
        ),
        (
            _("Asignación"),
            {"fields": ("assigned_engineer", "assigned_technician")},
        ),
        (
            _("Documentación"),
            {"fields": ("pdf_file",)},
        ),
        (
            _("Auditoría"),
            {"fields": ("created_at", "updated_at")},
        ),
    )
