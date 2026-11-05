from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import Brand, EquipmentModel


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (_("Información general"), {"fields": ("name", "is_active")}),
        (_("Auditoría"), {"fields": ("created_at", "updated_at")}),
    )


@admin.register(EquipmentModel)
class EquipmentModelAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "is_active", "created_at")
    list_filter = ("is_active", "brand")
    search_fields = ("name", "description", "brand__name")
    ordering = ("brand__name", "name")
    autocomplete_fields = ("brand",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (_("Identificación"), {"fields": ("brand", "name", "description", "is_active")}),
        (_("Auditoría"), {"fields": ("created_at", "updated_at")}),
    )
