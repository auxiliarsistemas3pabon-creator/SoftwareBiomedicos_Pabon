from typing import TYPE_CHECKING

from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from equipment.models import Equipment

from .managers import FailureRecordManager


class FailureSeverity(models.TextChoices):
    LOW = "LOW", _("Baja")
    MEDIUM = "MEDIUM", _("Media")
    HIGH = "HIGH", _("Alta")
    CRITICAL = "CRITICAL", _("Crítica")


class FailureRecord(models.Model):
    if TYPE_CHECKING:
        id: int
        equipment_id: int
        reported_by_id: int | None

        def get_severity_display(self) -> str: ...

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.PROTECT,
        related_name="failures",
        verbose_name=_("Equipo"),
    )
    reported_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="failure_reports",
        verbose_name=_("Reportado por"),
    )
    reported_at = models.DateTimeField(
        _("Reportada el"),
        default=timezone.now,
        db_index=True,
    )
    description = models.TextField(_("Descripción"))
    severity = models.CharField(
        _("Severidad"),
        max_length=10,
        choices=FailureSeverity.choices,
        db_index=True,
    )
    resolved = models.BooleanField(_("Resuelta"), default=False, db_index=True)
    resolved_at = models.DateTimeField(_("Resuelta el"), null=True, blank=True)
    resolution_notes = models.TextField(_("Notas de resolución"), blank=True)
    created_at = models.DateTimeField(_("Creada"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Actualizada"), auto_now=True)

    objects = FailureRecordManager()

    class Meta:
        verbose_name = _("Reporte de falla")
        verbose_name_plural = _("Reportes de falla")
        ordering = ["-reported_at"]
        indexes = [
            models.Index(fields=["equipment", "-reported_at"], name="fail_eq_reported_idx"),
            models.Index(fields=["severity"], name="fail_severity_idx"),
            models.Index(fields=["resolved"], name="fail_resolved_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(resolved=False) | Q(resolved_at__isnull=False),
                name="failure_resolved_consistency",
            ),
            models.CheckConstraint(
                condition=Q(resolved_at__isnull=True) | Q(resolved_at__gte=models.F("reported_at")),
                name="failure_resolved_at_after_reported_at",
            )
        ]

    def __str__(self) -> str:
        return (
            f"{self.get_severity_display()} - {self.equipment.asset_tag} - "
            f"{self.reported_at:%Y-%m-%d}"
        )

    def mark_resolved(self, notes: str = "") -> None:
        """Marca la falla como resuelta de forma idempotente.

        Si ya estaba resuelta, no muta `resolved_at` (sí permite agregar notas).
        """
        update_fields: list[str] = []
        if not self.resolved:
            self.resolved = True
            self.resolved_at = timezone.now()
            update_fields.extend(["resolved", "resolved_at"])
        if notes:
            self.resolution_notes = notes
            update_fields.append("resolution_notes")
        if update_fields:
            update_fields.append("updated_at")
            self.save(update_fields=update_fields)
