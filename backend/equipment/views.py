from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.mixins import AuditLogMixin
from common.permissions import HasRolePermission
from failures.models import FailureRecord, FailureSeverity
from users.models import User

from .filters import EquipmentFilter
from .models import (
    Equipment,
    EquipmentAttachment,
    EquipmentCertificate,
    EquipmentInstruction,
    EquipmentWorkOrder,
    WorkOrderStatus,
)
from .serializers import (
    EquipmentAttachmentSerializer,
    EquipmentCertificateSerializer,
    EquipmentInstructionSerializer,
    EquipmentSerializer,
    EquipmentWorkOrderDetailSerializer,
    EquipmentWorkOrderSerializer,
)
from .services import generate_qr_for_equipment


class EquipmentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    CRUD de equipos biomédicos.

    Incluye:

    - CRUD
    - búsqueda por asset_tag
    - filtros
    - ordenamiento
    - regeneración de QR
    - historial de mantenimientos

    """

    queryset = Equipment.objects.select_related(
        "branch", "equipment_model", "equipment_model__brand"
    )
    serializer_class = EquipmentSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"
    filterset_class = EquipmentFilter
    search_fields = (
        "name",
        "asset_tag",
        "equipment_model__name",
        "equipment_model__brand__name",
    )
    ordering_fields = ("name", "purchase_date", "created_at")
    ordering = ("name",)

    def get_queryset(self):
        qs = super().get_queryset()
        from common.area_scope import operativo_area

        area = operativo_area(self.request.user)
        if area is not None:
            if not area:
                return qs.none()
            return qs.filter(area__iexact=area)
        return qs

    @action(
        detail=False,
        methods=["get"],
        url_path=r"by-asset-tag/(?P<tag>[^/.]+)",
        url_name="by-asset-tag",
    )
    def by_asset_tag(self, request, tag: str = ""):
        """ Consulta un equipo utilizando su código de inventario."""
        equipment = get_object_or_404(self.get_queryset(), asset_tag__iexact=tag.strip())
        serializer = self.get_serializer(equipment)
        return Response(serializer.data)

    @action(detail=False,methods=["get"],url_path="names",url_name="names")
    def names(self,request):
        qs = self.filter_queryset(self.get_queryset())
        names = qs.order_by("name").values_list("name",flat=True).distinct()
        return Response(list(names))

    @action(detail=True, methods=["post"], url_path="regenerate-qr")
    def regenerate_qr(self, request, pk: int | None = None):
        """Regenera el código QR del equipo."""
        equipment = self.get_object()
        if equipment.qr_code:
            equipment.qr_code.delete(save=False)
        generate_qr_for_equipment(equipment)
        equipment.refresh_from_db()
        serializer = self.get_serializer(equipment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="regenerate-qr-all")
    def regenerate_qr_all(self, request):
        """Regenera el código QR de todos los equipos.

        Útil tras cambiar FRONTEND_BASE_URL o al preparar una tanda de
        etiquetas para imprimir. Con ``?missing=1`` solo cubre los equipos
        que aún no tienen QR.
        """
        queryset = self.filter_queryset(self.get_queryset())
        missing = request.query_params.get("missing") in ("1", "true", "True")
        if missing:
            queryset = queryset.filter(qr_code="")

        count = 0
        for equipment in queryset.iterator():
            if equipment.qr_code:
                equipment.qr_code.delete(save=False)
            generate_qr_for_equipment(equipment)
            count += 1

        return Response({"regenerated": count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk: int | None = None):
        """Historial paginado de mantenimientos del equipo."""
        # Imports locales para evitar cualquier riesgo de import circular:
        # apps.maintenance ya importa apps.equipment.models en su FK.
        from maintenance.models import MaintenanceRecord
        from maintenance.serializers import MaintenanceRecordSerializer

        equipment = self.get_object()
        queryset = (
            MaintenanceRecord.objects.filter(equipment=equipment)
            # Igual que la lista: solo mantenimientos ya realizados, no tareas
            # con orden de trabajo abierta.
            .exclude(work_order__status__in=("PENDING", "IN_PROGRESS", "CANCELLED"))
            .order_by("-date", "-created_at")
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MaintenanceRecordSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = MaintenanceRecordSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

class EquipmentAttachmentViewSet(viewsets.ModelViewSet):

    """CRUD de archivos adjuntos de equipos."""

    queryset = EquipmentAttachment.objects.select_related(
        "equipment",
        "uploaded_by",
    )

    serializer_class = EquipmentAttachmentSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"

    search_fields = ("title","equipment__name","equipment__asset_tag")

    ordering_fields = ("title","uploaded_at",)

    ordering = ("-uploaded_at",)

    def perform_create(self, serializer):
        # `uploaded_by` es read-only en el serializer justamente para que no
        # se pueda setear desde el request; se fija acá al usuario real.
        serializer.save(uploaded_by=self.request.user)

class EquipmentCertificateViewSet(viewsets.ModelViewSet):

    "CRUD de certificados de equipos"

    queryset = EquipmentCertificate.objects.select_related(
        "equipment",
    )

    serializer_class = EquipmentCertificateSerializer

    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"

    search_fields = (
        "certificate_number",
        "responsible",
        "equipment__name",
        "equipment__asset_tag",
    )

    ordering_fields = (
        "certificate_date",
        "created_at",
    )

    ordering = ("-certificate_date",)

class EquipmentInstructionViewSet(viewsets.ModelViewSet):

    "CRUD de instrucciones de equipos"

    queryset = EquipmentInstruction.objects.select_related(
        "equipment",
    )

    serializer_class = EquipmentInstructionSerializer

    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"

    search_fields = (
        "activity",
        "equipment__name",
        "equipment__asset_tag",
    )

    ordering_fields = (
        "instruction_type",
        "sequence",
    )

    ordering = ("instruction_type","sequence",)

_FIELD_ROLES = (User.Role.TECNICO,User.Role.INGENIERO)

def _only_own_work_orders(user) -> bool:
    return bool(
        user and user.is_authenticated and getattr(user,"role",None) in _FIELD_ROLES
)


def _maintenance_record_for(work_order: EquipmentWorkOrder):
    """El registro de mantenimiento que esta orden dejó (o cerró) en el
    historial del equipo, sin importar su origen: enlace directo
    (`maintenance_record`) o vía la solicitud de origen (`schedule`)."""
    if work_order.maintenance_record_id:
        return work_order.maintenance_record
    if work_order.schedule_id:
        # Import local: apps.maintenance.models ya importa apps.equipment.models.
        from maintenance.models import MaintenanceRecord

        return MaintenanceRecord.objects.filter(
            scheduled_maintenance_id=work_order.schedule_id
        ).first()
    return None


class EquipmentWorkOrderViewSet(AuditLogMixin, viewsets.ModelViewSet):

    "CRUD de órdenes de trabajo de equipos"

    queryset = EquipmentWorkOrder.objects.select_related(
        "equipment",
        "technician",
        "schedule",
    )

    serializer_class = EquipmentWorkOrderSerializer

    def get_serializer_class(self):
        if self.action == "details":
            return EquipmentWorkOrderDetailSerializer
        return EquipmentWorkOrderSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "work_orders"

    def get_queryset(self):
        qs = super().get_queryset()
        if _only_own_work_orders(self.request.user):
            qs = qs.filter(technician=self.request.user)
        equipment_name = (self.request.query_params.get("equipment_name") or "").strip()
        if equipment_name:
            qs = qs.filter(equipment__name__istartswith=equipment_name)
        return qs

    def perform_create(self, serializer):
        # Un técnico/ingeniero que crea una orden sin indicar responsable queda
        # asignado a sí mismo (si no, no la vería: su lista está filtrada a las
        # suyas).
        user = self.request.user
        if _only_own_work_orders(user) and not serializer.validated_data.get(
            "technician"
        ):
            serializer.save(technician=user)
        else:
            serializer.save()

    filterset_fields = ("equipment", "status", "service_type", "technician")
    search_fields = ("number",)

    ordering_fields = ("number", "start_date", "end_date", "status", "created_at")
    ordering = ("-start_date",)

    @action(detail=True, methods=["get"], url_path="details")
    def details(self, request, pk: int | None = None):
        """Devuelve una orden de trabajo junto a sus elementos relacionados."""
        work_order = get_object_or_404(
            self.get_queryset()
            .prefetch_related(
                "spare_parts", "measurements", "evidences", "signatures"
            )
            .select_related("cost"),
            pk=self.kwargs["pk"],
        )
        self.check_object_permissions(request, work_order)
        return Response(self.get_serializer(work_order).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk: int | None = None):
        """El responsable marca su orden como realizada.

        Pasa a ``FINISHED`` con fecha de fin, y las señales de
        ``apps.maintenance`` / ``apps.scheduling`` dejan el mantenimiento en el
        historial del equipo (y cierran la solicitud de origen, si la hubo).
        ``get_queryset`` ya restringe a los roles de campo sus propias órdenes,
        así que un técnico solo puede realizar las que tiene asignadas.

        Body opcional: ``observations`` — hallazgos / trabajo hecho /
        recomendaciones; queda en el registro de mantenimiento.

        Si vienen ``failure_description`` y ``failure_severity``, se crea de
        una vez el reporte de falla (resuelto) del mismo equipo.
        """
        work_order = self.get_object()
        if work_order.status == WorkOrderStatus.CANCELLED:
            raise ValidationError(
                {"detail": _("La orden está cancelada; no se puede realizar.")}
            )

        observations = str(request.data.get("observations") or "").strip()
        if not observations:
            raise ValidationError(
                {
                    "observations": _(
                        "La nota de resolución es obligatoria."
                    )
                }
            )

        target_status = str(
            request.data.get("status") or WorkOrderStatus.FINISHED
        ).strip()
        if target_status in (WorkOrderStatus.PENDING, WorkOrderStatus.IN_PROGRESS):
            work_order.status = target_status
            work_order.save(update_fields=["status"])
            return Response(self.get_serializer(work_order).data)

        role = getattr(request.user, "role", None)
        if (
            role == User.Role.INGENIERO
            and work_order.status == WorkOrderStatus.PENDING
        ):
            raise ValidationError(
                {
                    "detail": _(
                        "Primero pasa la orden a En proceso; no se puede finalizar de una."
                    )
                }
            )

        failure_description = str(
            request.data.get("failure_description") or ""
        ).strip()
        failure_severity = str(
            request.data.get("failure_severity") or ""
        ).strip()
        failure_resolution_notes = str(
            request.data.get("failure_resolution_notes") or observations
        ).strip()

        if failure_description and failure_severity not in FailureSeverity.values:
            raise ValidationError(
                {
                    "failure_severity": _(
                        "Indica la severidad de la falla (Baja, Media, Alta o Crítica)."
                    )
                }
            )

        transitioning = work_order.status != WorkOrderStatus.FINISHED

        if transitioning:
            work_order.status = WorkOrderStatus.FINISHED
            if work_order.end_date is None:
                work_order.end_date = timezone.now()
            work_order.save(update_fields=["status", "end_date"])
            work_order.refresh_from_db()

        if observations:
            record = _maintenance_record_for(work_order)
            if record is not None:
                record.observations = observations
                record.save(update_fields=["observations", "updated_at"])

        if transitioning and failure_description:
            now = timezone.now()
            FailureRecord.objects.create(
                equipment=work_order.equipment,
                reported_by=request.user
                if getattr(request.user, "is_authenticated", False)
                else None,
                reported_at=now,
                description=failure_description,
                severity=failure_severity,
                resolved=True,
                resolved_at=now,
                resolution_notes=failure_resolution_notes,
            )

        return Response(self.get_serializer(work_order).data)


