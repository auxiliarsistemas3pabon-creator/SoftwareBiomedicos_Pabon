from django.db.models.deletion import ProtectedError
from django.utils.translation import gettext_lazy as _
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import HasRolePermission

from .filters import BrandFilter, EquipmentModelFilter
from .models import Brand, EquipmentModel
from .serializers import BrandSerializer, EquipmentModelSerializer


class BrandViewSet(viewsets.ModelViewSet):
    """CRUD de marcas. DELETE protegido si la marca tiene modelos asociados."""

    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"
    filterset_class = BrandFilter
    search_fields = ("name",)
    ordering_fields = ("name", "created_at")
    ordering = ("name",)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            instance.delete()
        except ProtectedError:
            return Response(
                {"detail": _("No se puede eliminar la marca porque tiene modelos asociados.")},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class EquipmentModelViewSet(viewsets.ModelViewSet):
    """CRUD de modelos de equipo. DELETE protegido si el modelo tiene equipos."""

    queryset = EquipmentModel.objects.select_related("brand")
    serializer_class = EquipmentModelSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"
    filterset_class = EquipmentModelFilter
    search_fields = ("name", "description", "brand__name")
    ordering_fields = ("name", "brand__name", "created_at")
    ordering = ("brand__name", "name")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            instance.delete()
        except ProtectedError:
            return Response(
                {"detail": _("No se puede eliminar el modelo porque tiene equipos asociados.")},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
