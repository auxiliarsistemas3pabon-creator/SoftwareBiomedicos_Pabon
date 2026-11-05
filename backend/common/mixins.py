from typing import TYPE_CHECKING

from audit.utils import AuditAction, log_audit_event

if TYPE_CHECKING:
    from rest_framework import viewsets

    _AuditMixinBase = viewsets.ModelViewSet
else:
    _AuditMixinBase = object


class AuditLogMixin(_AuditMixinBase):
    """Deja un AuditLog cada vez que se elimina un recurso vía la API."""

    def perform_destroy(self, instance):
        log_audit_event(self.request.user, AuditAction.DELETE, instance, request=self.request)
        super().perform_destroy(instance)
