from django.contrib import admin

from .models import (
    WorkOrderCost,
    WorkOrderEvidence,
    WorkOrderMeasurement,
    WorkOrderSignature,
    WorkOrderSparePart,
)

# =====================================================================
# INLINE: REPUESTOS
# =====================================================================

class WorkOrderSparePartInline(admin.TabularInline):

    model = WorkOrderSparePart
    extra = 0
    fields = ("name","reference","quantity","unit_cost","total_cost",)


# ==========================================================================
# INLINE: MEDICIONES
# ===========================================================================

class WorkOrderMeasurementInline(admin.TabularInline):

    model = WorkOrderMeasurement
    extra = 0
    fields = ("parameter","expected_value","measured_value","unit","passed",)



# ==============================================================================
# INLINE:EVIDENCIAS
# ==============================================================================

class WorkOrderEvidenceInline(admin.TabularInline):

    model = WorkOrderEvidence
    extra = 0
    fields = ("evidence_type","description","file")


# ============================================================================
# INLINE: FIRMAS
# ============================================================================

class WorkOrderSignatureInline(admin.TabularInline):

    model = WorkOrderSignature
    extra = 0
    fields = ("role""signed_by","signed_at",)
    read_only_fields = ("signed_at",)


# =============================================================================
# INLINE: COSTOS
# =============================================================================

class WorkOrderCostInline(admin.TabularInline):

    model = WorkOrderCost
    extra = 0
    max_num = 1
    fields = ("labor_cost","spare_parts_cost","transport_cost","other_cost")




# ============================================================================
# WORK ORDER MEASUREMENT
# ============================================================================

@admin.register(WorkOrderMeasurement)
class WorkOrderMeasurementAdmin(admin.ModelAdmin):

    list_display = (
        "parameter",
        "work_order",
        "expected_value",
        "measured_value",
        "unit",
        "passed"
    )

    list_filter = (
        "passed",
    )

    search_fields = (
        "parameter",
        "expected_value",
        "measured_value",
        "unit",
        "work_order__number",
    )

    autocomplete_fields = (
        "work_order",
    )


# ========================================================
# WORK ORDER EVIDENCE
# ========================================================


@admin.register(WorkOrderEvidence)
class WorkOrderEvidenceAdmin(admin.ModelAdmin):
    list_display = (
        "work_order",
        "evidence_type",
        "description",
    )

    list_filter = (
        "evidence_type",
    )

    search_fields = (
        "description",
        "work_order__number",
    )

    autocomplete_fields = (
        "work_order",
    )

# ===============================================================
# WORK ORDER SIGNATURE
# ================================================================

@admin.register(WorkOrderSignature)
class WorkOrderSignatureAdmin(admin.ModelAdmin):

    list_display = (
        "work_order",
        "role",
        "signed_by",
        "signed_at",
    )

    list_filter = (
        "role",
    )

    search_filters = (
        "signed_by",
        "role",
        "work_order__number",
    )

    ordering = (
        "signed_at",
    )

    autocomplete_fields = (
        "work_order",
    )

    readonly_fields = (
        "signed_at",
    )


# ============================================================================
# WORK ORDER COST
# ============================================================================

@admin.register(WorkOrderCost)
class WorkOrderCostAdmin(admin.ModelAdmin):

    list_display = (
        "work_order",
        "labor_cost",
        "spare_parts_cost",
        "transport_cost",
        "other_cost"
    )
