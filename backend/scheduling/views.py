from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import HasRolePermission
from scheduling.models import MaintenanceSchedule
from scheduling.tasks import send_schedule_notification
from users.models import User

from .filters import MaintenanceScheduleFilter
from .serializers import MaintenanceScheduleSerializer


class MaintenanceScheduleViewSet(viewsets.ModelViewSet):
    """CRUD de solicitudes de mantenimiento + acciones complete/notify."""

    queryset = MaintenanceSchedule.objects.all()
    serializer_class = MaintenanceScheduleSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "scheduling"
    filterset_class = MaintenanceScheduleFilter
    search_fields = ("equipment__name",)
    ordering_fields = ("scheduled_date", "requested_date", "created_at")
    ordering = ("scheduled_date",)

    def get_queryset(self):
        qs = super().get_queryset()
        # Gestión ve todas. El operativo ve las que pidió o las que le
        # asignaron. El usuario sin perfil técnico solo ve las que él pidió.
        # El ingeniero solo consulta las asignadas a él o las que él pidió
        # (sin crear/editar/borrar solicitudes).
        user = self.request.user
        if not isinstance(user, User):
            return qs
        if user.role == User.Role.TECNICO:
            return qs.filter(Q(assigned_technician=user) | Q(requested_by=user))
        if user.role == User.Role.USUARIO:
            return qs.filter(requested_by=user)
        if user.role == User.Role.INGENIERO:
            return qs.filter(Q(assigned_engineer=user) | Q(requested_by=user))
        return qs

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        schedule = self.get_object()
        schedule.is_completed = True
        schedule.save(update_fields=["is_completed", "updated_at"])
        return Response(self.get_serializer(schedule).data)

    @action(detail=True, methods=["post"], url_path="notify")
    def notify(self, request, pk=None):
        schedule = self.get_object()
        send_schedule_notification.delay(schedule.pk)
        return Response(
            {"detail": "notification_queued"}, status=status.HTTP_200_OK
        )
