from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class MaintenanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "maintenance"
    verbose_name = _("Mantenimiento")

    def ready(self) -> None:
        from . import signals  # noqa: F401
