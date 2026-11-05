from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class SchedulingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "scheduling"
    verbose_name = _("Programación de mantenimientos")

    def ready(self) -> None:
        from . import signals  # noqa: F401
