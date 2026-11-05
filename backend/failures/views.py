from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.mixins import AuditLogMixin
from common.permissions import HasRolePermission

from .filters import FailureRecordFilter
from .models import FailureRecord
from .serializers import FailureRecordSerializer, ResolveFailureSerializer


class FailureRecordViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """CRUD de reportes de falla + acción `resolve` para marcarlos como resueltos."""

    queryset = FailureRecord.objects.all()
    serializer_class = FailureRecordSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "failures"
    filterset_class = FailureRecordFilter
    search_fields = ("equipment__name",)
    ordering_fields = ("reported_at", "severity", "resolved_at")
    ordering = ("-reported_at",)

    def get_queryset(self):
        qs = super().get_queryset()
        from common.area_scope import operativo_area

        area = operativo_area(self.request.user)
        if area is not None:
            if not area:
                return qs.none()
            # Solo sus reportes, y solo de equipos de su área.
            return qs.filter(
                equipment__area__iexact=area,
                reported_by=self.request.user,
            )
        return qs

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        failure = self.get_object()
        body = ResolveFailureSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        notes = body.validated_data.get("resolution_notes", "").strip()
        failure.mark_resolved(notes=notes)
        return Response(self.get_serializer(failure).data)
