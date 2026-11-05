from typing import TYPE_CHECKING

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditAction(models.TextChoices):
    CREATE = "create", _("Creación")
    UPDATE = "update", _("Actualización")
    DELETE = "delete", _("Eliminación")


class AuditLog(models.Model):
    if TYPE_CHECKING:
        actor_id: int | None

        def get_action_display(self) -> str: ...

    """Rastro de acciones sensibles (borrados, cambios de rol, etc.) sobre
    recursos de la API, para trazabilidad y cumplimiento."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        verbose_name=_("Actor"),
    )
    action = models.CharField(_("Acción"), max_length=10, choices=AuditAction.choices)
    model_label = models.CharField(_("Modelo"), max_length=100)
    object_id = models.CharField(_("ID del objeto"), max_length=64)
    object_repr = models.CharField(_("Representación"), max_length=255)
    changes = models.JSONField(_("Cambios"), default=dict, blank=True)
    ip_address = models.GenericIPAddressField(_("Dirección IP"), null=True, blank=True)
    created_at = models.DateTimeField(_("Fecha"), auto_now_add=True)

    class Meta:
        verbose_name = _("Registro de auditoría")
        verbose_name_plural = _("Registros de auditoría")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["model_label", "object_id"], name="audit_model_object_idx"),
            models.Index(fields=["created_at"], name="audit_created_at_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.get_action_display()} {self.model_label}#{self.object_id} por {self.actor}"
