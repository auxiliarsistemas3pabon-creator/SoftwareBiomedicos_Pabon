from typing import Any

from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from common.area_scope import operativo_area
from common.typing_meta import ModelSerializerMeta

from .models import FailureRecord


class FailureRecordSerializer(serializers.ModelSerializer[FailureRecord]):
    equipment_asset_tag = serializers.CharField(source="equipment.asset_tag", read_only=True)
    branch_name = serializers.CharField(source="equipment.branch.name", read_only=True)
    equipment_area = serializers.CharField(source="equipment.area", read_only=True)
    # Sin trim_whitespace para que un valor "   " caiga en validate_description
    # y dispare el mensaje en español, en lugar del genérico de DRF.
    description = serializers.CharField(trim_whitespace=False)

    class Meta(ModelSerializerMeta):
        model: Any = FailureRecord
        fields = (
            "id",
            "equipment",
            "equipment_asset_tag",
            "branch_name",
            "equipment_area",
            "reported_by",
            "reported_at",
            "description",
            "severity",
            "resolved",
            "resolved_at",
            "resolution_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "reported_by", "created_at", "updated_at")

    def validate_description(self, value: str) -> str:
        normalized = value.strip() if value else ""
        if not normalized:
            raise serializers.ValidationError(_("La descripción es obligatoria."))
        return normalized

    def validate_resolution_notes(self, value: str) -> str:
        return value.strip() if value else ""

    def validate_reported_at(self, value):
        if value and value > timezone.now():
            raise serializers.ValidationError(_("La fecha de reporte no puede ser futura."))
        return value

    def validate(self, attrs):
        instance = self.instance
        resolved = attrs.get("resolved", getattr(instance, "resolved", False))
        # Distingue "no enviado" de "enviado como null" para validación cruzada.
        resolved_at_in_payload = "resolved_at" in attrs
        resolved_at = attrs.get("resolved_at", getattr(instance, "resolved_at", None))

        # En creación, si el cliente no manda `reported_at`, el campo usa su
        # default (`timezone.now`) recién al construirse la instancia — DESPUÉS
        # de este validate(). Si más abajo también autocompletamos
        # `resolved_at` con un `timezone.now()` propio, quedan dos "ahora"
        # independientes evaluados en momentos distintos, y por una carrera de
        # microsegundos `resolved_at` puede terminar *antes* que `reported_at`
        # y violar la constraint de DB `failure_resolved_at_after_reported_at`
        # (ver apps/failures/models.py). Fijamos aquí un único `now` y lo
        # usamos para ambos campos cuando falta alguno, así nunca hay carrera.
        now = timezone.now()
        if instance is None and "reported_at" not in attrs:
            attrs["reported_at"] = now
        reported_at = attrs.get("reported_at", getattr(instance, "reported_at", None))

        if resolved and resolved_at is None:
            attrs["resolved_at"] = now
            resolved_at = attrs["resolved_at"]

        if not resolved and resolved_at is not None:
            # Solo error si el cliente envió `resolved_at` explícitamente; si la
            # instancia ya lo traía, simplemente lo limpiamos al "des-resolver".
            if resolved_at_in_payload:
                raise serializers.ValidationError(
                    {
                        "resolved_at": _(
                            "No se puede definir 'resuelta el' sin marcar la falla como"
                            " resuelta."
                        )
                    }
                )
            attrs["resolved_at"] = None
            resolved_at = None

        if resolved_at and reported_at and resolved_at < reported_at:
            raise serializers.ValidationError(
                {"resolved_at": _("La fecha de resolución no puede ser anterior al reporte.")}
            )

        request = self.context.get("request")
        user = getattr(request, "user", None)
        area = operativo_area(user)
        if area is not None:
            # El operativo informa lo que observa: no marca resolución ni notas técnicas.
            attrs["resolved"] = False
            attrs["resolved_at"] = None
            attrs["resolution_notes"] = ""
            equipment = attrs.get("equipment", getattr(instance, "equipment", None))
            eq_area = (getattr(equipment, "area", None) or "").strip()
            if not area:
                raise serializers.ValidationError(
                    {
                        "equipment": _(
                            "Tu usuario operativo no tiene un área asignada. Pide a un administrador que la configure."
                        )
                    }
                )
            if equipment is not None and eq_area.lower() != area.lower():
                raise serializers.ValidationError(
                    {
                        "equipment": _(
                            "Solo puedes reportar fallas de equipos de tu área (%(area)s)."
                        )
                        % {"area": area}
                    }
                )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            validated_data["reported_by"] = user
        return super().create(validated_data)


class ResolveFailureSerializer(serializers.Serializer):
    """Body opcional del endpoint POST /failures/{id}/resolve/."""

    resolution_notes = serializers.CharField(required=False, allow_blank=True)
