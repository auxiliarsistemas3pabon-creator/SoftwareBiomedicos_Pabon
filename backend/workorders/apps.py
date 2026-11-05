from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class WorkordersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'workorders'
    verbose_name = _("Ordenes de Trabajo")
