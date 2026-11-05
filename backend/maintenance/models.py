from typing import TYPE_CHECKING

from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from equipment.models import Equipment

from .managers import MaintenanceRecordManager


class MaintenanceKind(models.TextChoices):
    PREVENTIVE = "PREVENTIVE", _("Mantenimiento preventivo")
    CORRECTIVE = "CORRECTIVE", _("Mantenimiento correctivo")
    REPAIR = "REPAIR", _("Reparación mayor")
    CALIBRATION = "CALIBRATION", _("Calibración")
    INSPECTION = "INSPECTION", _("Inspección")


class MaintenanceRecord(models.Model):
    if TYPE_CHECKING:
        id: int
        equipment_id: int
        scheduled_maintenance_id: int | None
        assigned_technician_id: int | None
        _from_standalone_work_order: bool

        def get_kind_display(self) -> str: ...

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.PROTECT,
        related_name="maintenance_records",
        verbose_name=_("Equipo"),
    )
    kind = models.CharField(
        _("Tipo"),
        max_length=20,
        choices=MaintenanceKind.choices,
        db_index=True,
    )
    date = models.DateField(_("Fecha"), db_index=True)
    description = models.TextField(_("Descripción"))
    # Comentario libre de quien ejecutó el mantenimiento: hallazgos, trabajo
    # realizado, recomendaciones. Distinto de `description` (la tarea a hacer).
    observations = models.TextField(_("Observaciones del técnico"), blank=True)
    technician = models.CharField(_("Técnico"), max_length=120, blank=True)
    assigned_engineer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="engineering_records",
        limit_choices_to={"role": "ingeniero", "is_active": True},
        verbose_name=_("Ingeniero asignado"),
    )
    assigned_technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="technician_records",
        limit_choices_to={"role": "tecnico", "is_active": True},
        verbose_name=_("Técnico asignado"),
    )
    cost = models.DecimalField(
        _("Costo"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    pdf_file = models.FileField(
        _("Archivo PDF"),
        upload_to="maintenance/pdf/",
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=["pdf"])],
    )
    scheduled_maintenance = models.OneToOneField(
        "scheduling.MaintenanceSchedule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_record",
        verbose_name=_("Agendamiento cumplido"),
    )
    created_at = models.DateTimeField(_("Creado"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Actualizado"), auto_now=True)

    objects = MaintenanceRecordManager()

    class Meta:
        verbose_name = _("Registro de mantenimiento")
        verbose_name_plural = _("Registros de mantenimiento")
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["equipment", "-date"], name="maint_eq_date_idx"),
            models.Index(fields=["kind"], name="maint_kind_idx"),
            models.Index(fields=["date"], name="maint_date_idx"),
            models.Index(fields=["assigned_engineer"], name="maint_engineer_idx"),
            models.Index(fields=["assigned_technician"], name="maint_technician_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.get_kind_display()} - {self.equipment.asset_tag} - {self.date}"
