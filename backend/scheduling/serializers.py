from typing import Any

from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from common.typing_meta import ModelSerializerMeta
from equipment.models import EquipmentStatus
from maintenance.models import MaintenanceRecord
from scheduling.models import MaintenanceSchedule
from users.models import User


class _AssignedUserSerializer(serializers.ModelSerializer[User]):
    """Representación mínima del usuario asignado (read-only, anidada)."""

    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta(ModelSerializerMeta):
        model: Any = User
        fields = ("id", "username", "full_name", "role", "role_display")

    def get_full_name(self, obj: User) -> str:
        return f"{obj.first_name} {obj.last_name}".strip()


class _RequestedBySerializer(serializers.ModelSerializer[User]):
    """Quién creó la solicitud (read-only, anidado)."""

    full_name = serializers.SerializerMethodField()

    class Meta(ModelSerializerMeta):
        model: Any = User
        fields = ("id", "username", "full_name", "area")

    def get_full_name(self, obj: User) -> str:
        return f"{obj.first_name} {obj.last_name}".strip()


class _MaintenanceRecordMiniSerializer(serializers.ModelSerializer[MaintenanceRecord]):
    """Representación mínima del mantenimiento que cumplió un agendamiento."""

    class Meta(ModelSerializerMeta):
        model: Any = MaintenanceRecord
        fields = ("id", "kind", "date", "description", "cost")


class MaintenanceScheduleSerializer(serializers.ModelSerializer[MaintenanceSchedule]):
    equipment_asset_tag = serializers.CharField(source="equipment.asset_tag", read_only=True)
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    branch_name = serializers.CharField(source="equipment.branch.name", read_only=True)
    # Sin esto, ModelSerializer generaría el PrimaryKeyRelatedField aplicando
    # el `limit_choices_to` del modelo (role/is_active) como queryset. Eso
    # hace que un PK de rol incorrecto o inactivo falle en el parseo del
    # campo con el genérico "Clave primaria ... inválida - objeto no existe",
    # antes de que corran validate_assigned_engineer/_technician de abajo —
    # así que el usuario nunca ve el mensaje específico ("debe tener el rol
    # de...", "no está activo"). Con queryset=User.objects.all() el campo
    # solo exige que el PK exista; el rol/estado lo valida el validate_* de
    # más abajo con su propio mensaje. `limit_choices_to` se conserva en el
    # modelo porque sigue filtrando el dropdown del admin, que es para lo que
    # sirve.
    assigned_engineer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    assigned_technician = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    # Un solo responsable en el formulario: se enruta al FK de ingeniero u
    # operativo según el rol, sin romper los campos existentes.
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    assigned_engineer_detail = _AssignedUserSerializer(
        source="assigned_engineer", read_only=True
    )
    assigned_technician_detail = _AssignedUserSerializer(
        source="assigned_technician", read_only=True
    )
    requested_by_detail = _RequestedBySerializer(source="requested_by", read_only=True)
    requesting_area = serializers.SerializerMethodField()
    # La solicitud nace sin fecha programada; la gestión la fija después.
    scheduled_date = serializers.DateField(required=False, allow_null=True)
    maintenance_record = serializers.SerializerMethodField()
    maintenance_record_detail = serializers.SerializerMethodField()
    # Orden de trabajo que se crea sola al asignar la solicitud.
    work_order = serializers.SerializerMethodField()

    class Meta(ModelSerializerMeta):
        model: Any = MaintenanceSchedule
        fields = (
            "id",
            "equipment",
            "equipment_asset_tag",
            "equipment_name",
            "branch_name",
            "kind",
            "requested_date",
            "requested_by",
            "requested_by_detail",
            "requesting_area",
            "scheduled_date",
            "notes",
            "assigned_engineer",
            "assigned_engineer_detail",
            "assigned_technician",
            "assigned_technician_detail",
            "assigned_to",
            "notified_at",
            "is_completed",
            "auto_generated",
            "generated_from",
            "maintenance_record",
            "maintenance_record_detail",
            "work_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "equipment_asset_tag",
            "equipment_name",
            "branch_name",
            "requested_date",
            "requested_by",
            "requested_by_detail",
            "requesting_area",
            "assigned_engineer_detail",
            "assigned_technician_detail",
            "notified_at",
            "auto_generated",
            "generated_from",
            "maintenance_record",
            "maintenance_record_detail",
            "work_order",
            "created_at",
            "updated_at",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Al programar/editar, el equipo y el tipo ya están en la solicitud
        # y no se pueden cambiar (solo se eligen al crear).
        if isinstance(self.instance, MaintenanceSchedule):
            self.fields["equipment"].read_only = True
            self.fields["kind"].read_only = True

    def create(self, validated_data):
        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            validated_data["requested_by"] = request.user
        return super().create(validated_data)

    def _record(self, obj):
        # Acceso seguro al reverso OneToOne: si no hay vínculo, devuelve None
        # en lugar de levantar RelatedObjectDoesNotExist.
        return getattr(obj, "maintenance_record", None)

    def get_maintenance_record(self, obj):
        record = self._record(obj)
        return record.id if record is not None else None

    def get_maintenance_record_detail(self, obj):
        record = self._record(obj)
        if record is None:
            return None
        return _MaintenanceRecordMiniSerializer(record, context=self.context).data

    def get_work_order(self, obj):
        wo = getattr(obj, "work_order", None)
        if wo is None:
            return None
        end = wo.end_date
        return {
            "id": wo.id,
            "number": wo.number,
            "status": wo.status,
            "end_date": end.isoformat() if end else None,
        }

    def get_requesting_area(self, obj) -> str | None:
        requester = obj.requested_by
        if requester is not None:
            area = (requester.area or "").strip()
            if area:
                return area
        equipment = obj.equipment
        area = (getattr(equipment, "area", None) or "").strip()
        return area or None

    def validate_equipment(self, value):
        if value.status == EquipmentStatus.INACTIVE:
            raise serializers.ValidationError(
                _("El equipo no está disponible para programación.")
            )
        return value

    def validate_scheduled_date(self, value):
        if value is None:
            return value
        if self.instance is None and value < timezone.localdate():
            raise serializers.ValidationError(
                _("La fecha programada no puede ser pasada.")
            )
        return value

    def validate_notes(self, value):
        return value.strip() if value else value

    def validate_assigned_engineer(self, value):
        if value is None:
            return value
        if not value.is_active:
            raise serializers.ValidationError(
                _("El usuario asignado no está activo.")
            )
        if value.role != User.Role.INGENIERO:
            raise serializers.ValidationError(
                _("El usuario asignado debe tener el rol de ingeniero biomédico.")
            )
        return value

    def validate_assigned_technician(self, value):
        if value is None:
            return value
        if not value.is_active:
            raise serializers.ValidationError(
                _("El usuario asignado no está activo.")
            )
        if value.role != User.Role.TECNICO:
            raise serializers.ValidationError(
                _("El usuario asignado debe tener el rol de usuario operativo.")
            )
        return value

    def validate_assigned_to(self, value):
        if value is None:
            return value
        if not value.is_active:
            raise serializers.ValidationError(
                _("El usuario asignado no está activo.")
            )
        if value.role not in {User.Role.INGENIERO, User.Role.TECNICO}:
            raise serializers.ValidationError(
                _("El asignado debe ser ingeniero biomédico o usuario operativo.")
            )
        return value

    def validate(self, attrs):
        assigned_to = attrs.pop("assigned_to", serializers.empty)
        if assigned_to is not serializers.empty:
            if assigned_to is None:
                attrs["assigned_engineer"] = None
                attrs["assigned_technician"] = None
            elif assigned_to.role == User.Role.INGENIERO:
                attrs["assigned_engineer"] = assigned_to
                attrs["assigned_technician"] = None
            else:
                attrs["assigned_technician"] = assigned_to
                attrs["assigned_engineer"] = None
        return attrs
