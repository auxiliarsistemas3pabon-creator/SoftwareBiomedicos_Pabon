from __future__ import annotations

from typing import Any

from .models import AuditAction, AuditLog


def _client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit_event(
    actor,
    action: str,
    instance,
    *,
    request=None,
    changes: dict[str, Any] | None = None,
) -> AuditLog:
    """Registra una acción sensible (create/update/delete) sobre `instance`.

    Se llama con el estado de `instance` previo al borrado/actualización,
    ya que tras `instance.delete()` Django limpia el `pk` del objeto en memoria.
    """
    return AuditLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        model_label=f"{instance._meta.app_label}.{instance._meta.model_name}",
        object_id=str(instance.pk),
        object_repr=str(instance)[:255],
        changes=changes or {},
        ip_address=_client_ip(request),
    )


__all__ = ["AuditAction", "log_audit_event"]
