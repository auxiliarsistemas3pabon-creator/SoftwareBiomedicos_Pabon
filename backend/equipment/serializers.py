from typing import Any

from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from branches.models import Branch
from catalog.models import EquipmentModel
from common.file_validation import (
    ATTACHMENT_EXTENSIONS,
    CERTIFICATE_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    MAX_IMAGE_BYTES,
    validate_uploaded_file,
)
from common.typing_meta import ModelSerializerMeta
from workorders.serializers import (
    WorkOrderCostSerializer,
    WorkOrderEvidenceSerializer,
    WorkOrderMeasurementSerializer,
    WorkOrderSignatureSerializer,
    WorkOrderSparePartSerializer,
)

from .models import (
    Equipment,
    EquipmentAttachment,
    EquipmentCertificate,
    EquipmentInstruction,
    EquipmentWorkOrder,
)


class EquipmentSerializer(serializers.ModelSerializer[Equipment]):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    equipment_model_name = serializers.CharField(source="equipment_model.name", read_only=True)
    brand_name = serializers.CharField(source="equipment_model.brand.name", read_only=True)
    brand = serializers.IntegerField(source="equipment_model.brand_id", read_only=True)
    qr_code_url = serializers.SerializerMethodField()
    days_to_expiration = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display",read_only=True)
    risk_class_display = serializers.CharField(source="get_risk_class_display",read_only=True)

    class Meta(ModelSerializerMeta):
        model: Any = Equipment
        fields = (
            # Identificación
            "id",
            "name",
            "asset_tag",
            "internal_code",
            "serial",
            "software_identifier",

            # clasificación
            "equipment_model",
            "equipment_model_name",
            "brand",
            "brand_name",
            "branch",
            "branch_name",
            "location",
            "technology_type",
            "biomedical_classification",
            "risk_class",
            "risk_class_display",

            # Información del equipo
            "manufacturer",
            "owner",
            "client_name",
            "branch_text",
            "department",
            "city",
            "area",

            # Adquisición
            "purchase_date",
            "supplier_acquisition",
            "equipment_cost",
            "manufacture_date",
            "start_use_date",

            # Garantía
            "warranty_start_date",
            "warranty_end_date",
            "days_to_expiration",

            # Mantenimiento
            "maintenance_provider",
            "maintenance_frequency_months",
            "last_preventive",
            "next_preventive",

            # Calibración
            "calibration_date",
            "calibration_frequency_months",
            "last_calibration",
            "next_calibration",
            "corrective_count",

            # Seguridad eléctrica
            "electrical_safety_class",
            "electrical_safety_type",

            # Regulatorio
            "invima_registration",
            "ecri",

            # Vida útil
            "life_use_years",

            # Observaciones
            "observations",

            # Archivos
            "equipment_image",
            "life_sheet_pdf",

            # Estado
            "status",
            "status_display",

            # Confiabilidad
            "mtbf_hours",
            "mttr_hours",

            # QR
            "qr_code",
            "qr_code_url",

            # Auditoría
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "equipment_model_name",
            "brand",
            "brand_name",
            "qr_code",
            "qr_code_url",
            "mtbf_hours",
            "mttr_hours",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            # El mensaje de unicidad lo controla validate_asset_tag (en español).
            "asset_tag": {"validators": []},
            "risk_class": {"required": False, "allow_null": True},
        }

    def get_qr_code_url(self, obj: Equipment) -> str | None:
        if not obj.qr_code:
            return None
        request = self.context.get("request")
        url = obj.qr_code.url
        # MEDIA_URL debe ser `/media/...`. Si queda relativo, build_absolute_uri
        # lo pega al path del listado y el <img> da 404.
        if not url.startswith(("http://", "https://", "/")):
            url = f"/{url}"
        return request.build_absolute_uri(url) if request else url

    def get_days_to_expiration(self,obj:Equipment) -> int | None:
        if obj.warranty_end_date is None:
            return None
        end_date = timezone.localtime(obj.warranty_end_date).date()
        return (end_date - timezone.localdate()).days

    def validate_asset_tag(self, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise serializers.ValidationError(_("El código de inventario no puede estar vacío."))
        qs = Equipment.objects.filter(asset_tag__iexact=normalized)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                _("Ya existe un equipo con este código de inventario.")
            )
        return normalized

    def validate_name(self, value: str) -> str:
        normalized = " ".join(value.split()).strip()
        if not normalized:
            raise serializers.ValidationError(_("El nombre no puede estar vacío."))
        return normalized

    def validate_location(self, value: str) -> str:
        return value.strip()

    def validate_branch(self, value: Branch) -> Branch:
        if not value.is_active:
            raise serializers.ValidationError(_("La sede seleccionada no está activa."))
        return value

    def validate_equipment_model(self, value: EquipmentModel) -> EquipmentModel:
        if not value.is_active:
            raise serializers.ValidationError(_("El modelo seleccionado no está activo."))
        if not value.brand.is_active:
            raise serializers.ValidationError(_("La marca del modelo seleccionado no está activa."))
        return value

    def validate_purchase_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError(_("La fecha de compra no puede ser futura."))
        return value

    def validate_life_sheet_pdf(self, value):
        return validate_uploaded_file(value, allowed_extensions=DOCUMENT_EXTENSIONS)

    def validate_equipment_image(self, value):
        # ImageField ya valida (vía Pillow) que el contenido sea una imagen
        # real; acá solo falta el límite de tamaño que sí tienen los demás
        # campos de archivo del sistema.
        if value and value.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError(
                _("La imagen no puede superar los %(mb)s MB.")
                % {"mb": MAX_IMAGE_BYTES // (1024 * 1024)}
            )
        return value

class EquipmentAttachmentSerializer(serializers.ModelSerializer[EquipmentAttachment]):

    uploaded_by_name = serializers.SerializerMethodField()

    class Meta(ModelSerializerMeta):

        model: Any = EquipmentAttachment

        fields = (
            "id",
            "equipment",
            "attachment_type",
            "title",
            "file",
            "uploaded_at",
            "uploaded_by",
            "uploaded_by_name",
        )

        read_only_fields = [
            "id",
            "uploaded_at",
            # Se fuerza server-side en EquipmentAttachmentViewSet.perform_create:
            # si fuera editable, cualquiera podría atribuir el archivo a otro
            # usuario arbitrario.
            "uploaded_by",
            "uploaded_by_name",
        ]

    def get_uploaded_by_name(self,obj):

        if not obj.uploaded_by:

            return None

        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def validate_file(self, value):
        return validate_uploaded_file(value, allowed_extensions=ATTACHMENT_EXTENSIONS)

class EquipmentCertificateSerializer(serializers.ModelSerializer[EquipmentCertificate]):

    class Meta(ModelSerializerMeta):

        model: Any = EquipmentCertificate

        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
        ]

    def validate_file(self, value):
        return validate_uploaded_file(value, allowed_extensions=CERTIFICATE_EXTENSIONS)


class EquipmentInstructionSerializer(serializers.ModelSerializer[EquipmentInstruction]):

    class Meta(ModelSerializerMeta):

        model: Any = EquipmentInstruction
        fields = '__all__'

        read_only_fields = [
            "id",
        ]


_WORK_ORDER_FIELDS = (
    "id",
    "equipment",
    "equipment_asset_tag",
    "equipment_name",
    "number",
    "service_type",
    "service_type_display",
    "start_date",
    "end_date",
    "description",
    "technician",
    "technician_name",
    "status",
    "status_display",
    "report",
    "schedule",
    "schedule_info",
    "created_at",
)


class EquipmentWorkOrderSerializer(serializers.ModelSerializer[EquipmentWorkOrder]):

    technician_name = serializers.SerializerMethodField()
    equipment_asset_tag = serializers.CharField(
        source="equipment.asset_tag", read_only=True
    )
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    service_type_display = serializers.CharField(
        source="get_service_type_display", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    schedule_info = serializers.SerializerMethodField()

    class Meta(ModelSerializerMeta):

        model: Any = EquipmentWorkOrder

        fields = _WORK_ORDER_FIELDS

        read_only_fields = [
            "id",
            "equipment_asset_tag",
            "equipment_name",
            "service_type_display",
            "status_display",
            "technician_name",
            "schedule",
            "schedule_info",
            "created_at",
        ]
        extra_kwargs = {
            # El mensaje de "ya existe" lo emite validate_number (en español);
            # se desactiva el UniqueValidator auto-generado por unique=True.
            "number": {"validators": []},
        }

    def get_technician_name(self, obj):
        if not obj.technician:
            return None
        return obj.technician.get_full_name() or obj.technician.username

    def get_schedule_info(self, obj):
        s = obj.schedule
        if s is None:
            return None
        return {
            "id": s.id,
            "kind": s.kind,
            "scheduled_date": s.scheduled_date,
            "requested_date": s.requested_date,
            "is_completed": s.is_completed,
        }

    def validate_number(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError(_("El número de la orden es obligatorio."))
        qs = EquipmentWorkOrder.objects.filter(number__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(_("Ya existe una orden con este número."))
        return value

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", None))
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if (
            self.instance is not None
            and status == "FINISHED"
            and self.instance.status == "PENDING"
            and getattr(user, "role", None) == "ingeniero"
        ):
            raise serializers.ValidationError(
                {
                    "status": _(
                        "Primero pasa la orden a En proceso; no se puede finalizar de una."
                    )
                }
            )
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if status == "FINISHED" and not end:
            attrs["end_date"] = timezone.now()
            end = attrs["end_date"]
        # Al terminar, la fecha fin es el momento real del trabajo; puede ser
        # anterior a un inicio programado a futuro.
        if start and end and end < start and status != "FINISHED":
            raise serializers.ValidationError(
                {"end_date": _("La fecha de fin no puede ser anterior al inicio.")}
            )
        return attrs

    def validate_report(self, value):
        return validate_uploaded_file(value, allowed_extensions=DOCUMENT_EXTENSIONS)


class EquipmentWorkOrderDetailSerializer(EquipmentWorkOrderSerializer):
    """Orden de trabajo + sus elementos relacionados (para la acción `details`)."""

    spare_parts = WorkOrderSparePartSerializer(many=True, read_only=True)
    measurements = WorkOrderMeasurementSerializer(many=True, read_only=True)
    evidences = WorkOrderEvidenceSerializer(many=True, read_only=True)
    signatures = WorkOrderSignatureSerializer(many=True, read_only=True)
    cost = serializers.SerializerMethodField()

    class Meta(EquipmentWorkOrderSerializer.Meta):
        fields = _WORK_ORDER_FIELDS + (
            "spare_parts",
            "measurements",
            "evidences",
            "signatures",
            "cost",
        )

    def get_cost(self, obj):
        cost = getattr(obj, "cost", None)
        return WorkOrderCostSerializer(cost).data if cost is not None else None

