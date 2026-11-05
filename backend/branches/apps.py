from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class BranchesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "branches"
    verbose_name = _("Sedes")
