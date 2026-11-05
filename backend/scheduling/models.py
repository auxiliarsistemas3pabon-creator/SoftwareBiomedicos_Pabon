from typing import TYPE_CHECKING

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from equipment.models import Equipment

from .managers import MaintenanceScheduleManager


class ScheduledMaintenanceKind(models.TextChoices):
    PREVENTIVE = "PREVENTIVE", _("Mantenimiento preventivo")
    REPAIR = "REPAIR", _("Reparación")


class MaintenanceSchedule(models.Model):
    if TYPE_CHECKING:
        id: int
        equipment_id: int
        assigned_engineer_id: int | None
        assigned_technician_id: int | None
        _previous_engineer_id: int | None
        _previous_technician_id: int | None

        def get_kind_display(self) -> str: ...

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.PROTECT,
        related_name="schedules",
        verbose_name=_("Equipo"),
    )
    kind = models.CharField(
        _("Tipo"),
        max_length=20,
        choices=ScheduledMaintenanceKind.choices,
        db_index=True,
    )
    requested_date = models.DateField(
        _("Fecha de solicitud"),
        default=timezone.localdate,
        db_index=True,
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_schedules",
        verbose_name=_("Solicitado por"),
    )
    # Una solicitud nace sin fecha programada; la fija quien la agenda/asigna
    # después (gestión). Por eso es opcional.
    scheduled_date = models.DateField(
        _("Fecha programada"), null=True, blank=True, db_index=True
    )
    notes = models.TextField(_("Notas"), blank=True)
    assigned_engineer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="engineering_schedules",
        limit_choices_to={"role": "ingeniero", "is_active": True},
        verbose_name=_("Ingeniero asignado"),
    )
    assigned_technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="technician_schedules",
        limit_choices_to={"role": "tecnico", "is_active": True},
        verbose_name=_("Técnico asignado"),
    )
    notified_at = models.DateTimeField(_("Notificado el"), null=True, blank=True)
    is_completed = models.BooleanField(_("Completado"), default=False, db_index=True)
    # Columnas que ya existían en Postgres (migración 0004 aplicada sin el
    # archivo en el repo). Sin default, el INSERT de una solicitud nueva
    # mandaba NULL y reventaba con IntegrityError.
    auto_generated = models.BooleanField(_("Generada automáticamente"), default=False)
    generated_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_schedules",
        verbose_name=_("Solicitud origen"),
    )
    created_at = models.DateTimeField(_("Creado"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Actualizado"), auto_now=True)

    objects = MaintenanceScheduleManager()

    class Meta:
        verbose_name = _("Solicitud de mantenimiento")
        verbose_name_plural = _("Solicitudes de mantenimiento")
        ordering = ["scheduled_date"]
        indexes = [
            models.Index(fields=["equipment", "scheduled_date"], name="sched_eq_date_idx"),
            models.Index(fields=["scheduled_date", "is_completed"], name="sched_date_comp_idx"),
            models.Index(fields=["assigned_engineer"], name="sched_engineer_idx"),
            models.Index(fields=["assigned_technician"], name="sched_technician_idx"),
        ]

    def __str__(self) -> str:
        fecha = self.scheduled_date or _("sin programar")
        return f"{self.get_kind_display()} - {self.equipment.asset_tag} - {fecha}"
