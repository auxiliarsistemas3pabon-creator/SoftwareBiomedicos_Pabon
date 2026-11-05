from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import BrandManager, EquipmentModelManager


class Brand(models.Model):
    name = models.CharField(
        _("Nombre"),
        max_length=120,
        unique=True,
        db_index=True,
        help_text=_("Nombre comercial único de la marca."),
    )
    is_active = models.BooleanField(_("Activa"), default=True, db_index=True)
    created_at = models.DateTimeField(_("Creada"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Actualizada"), auto_now=True)

    objects = BrandManager()

    class Meta:
        verbose_name = _("Marca")
        verbose_name_plural = _("Marcas")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"], name="brand_name_idx"),
            models.Index(fields=["is_active"], name="brand_is_active_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class EquipmentModel(models.Model):
    brand = models.ForeignKey(
        Brand,
        on_delete=models.PROTECT,
        related_name="equipment_models",
        verbose_name=_("Marca"),
    )
    name = models.CharField(_("Modelo"), max_length=120, db_index=True)
    description = models.TextField(_("Descripción"), blank=True)
    is_active = models.BooleanField(_("Activo"), default=True, db_index=True)
    created_at = models.DateTimeField(_("Creado"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Actualizado"), auto_now=True)

    objects = EquipmentModelManager()

    class Meta:
        verbose_name = _("Modelo de equipo")
        verbose_name_plural = _("Modelos de equipo")
        ordering = ["brand__name", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["brand", "name"],
                name="equipment_model_unique_per_brand",
            ),
        ]
        indexes = [
            models.Index(fields=["brand"], name="eqmodel_brand_idx"),
            models.Index(fields=["name"], name="eqmodel_name_idx"),
            models.Index(fields=["is_active"], name="eqmodel_is_active_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.brand.name} {self.name}"
