"""Alcance por área para el rol operativo (`tecnico`)."""
from users.models import User


def operativo_area(user) -> str | None:
    """Área del operativo, o None si no es ese rol.

    Cadena vacía (área no configurada) se trata como sin alcance: el caller
    debe filtrar a queryset vacío.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return None
    if getattr(user, "role", None) != User.Role.TECNICO:
        return None
    return (getattr(user, "area", None) or "").strip()
