from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import BranchManager

phone_validator = RegexValidator(
    regex=r"^\+?[0-9\s\-()]{7,20}$",
    message=_("El teléfono no tiene un formato válido."),
)


class Branch(models.Model):
    name = models.CharField(
        _("Nombre"),
        max_length=120,
        unique=True,
        help_text=_("Nombre único de la sede."),
    )
    address = models.CharField(
        _("Dirección"),
        max_length=255,
    )
    city = models.CharField(
        _("Ciudad"),
        max_length=80,
        db_index=True,
    )
    phone = models.CharField(
        _("Teléfono"),
        max_length=30,
        validators=[phone_validator],
    )
    email = models.EmailField(
        _("Correo electrónico"),
        blank=True,
        null=True,
        unique=True,
        help_text=_("Opcional. Si se indica, no puede repetirse en otra sede."),
    )
    is_active = models.BooleanField(
        _("Activa"),
        default=True,
    )
    created_at = models.DateTimeField(
        _("Creada"),
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        _("Actualizada"),
        auto_now=True,
    )

    objects = BranchManager()

    class Meta:
        verbose_name = _("Sede")
        verbose_name_plural = _("Sedes")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"], name="branch_name_idx"),
            models.Index(fields=["city"], name="branch_city_idx"),
            models.Index(fields=["is_active"], name="branch_is_active_idx"),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        # Unique(email) en Postgres: "" cuenta como valor; varios NULL sí.
        if self.email == "":
            self.email = None
        super().save(*args, **kwargs)
