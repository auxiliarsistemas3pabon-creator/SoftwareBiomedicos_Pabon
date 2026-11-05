from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class FailuresConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "failures"
    verbose_name = _("Reportes de falla")

    def ready(self) -> None:
        from . import signals  # noqa: F401
