from typing import Any

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from common.file_validation import EVIDENCE_EXTENSIONS, validate_uploaded_file
from common.typing_meta import ModelSerializerMeta
from workorders.models import (
    WorkOrderCost,
    WorkOrderEvidence,
    WorkOrderMeasurement,
    WorkOrderSignature,
    WorkOrderSparePart,
)


class WorkOrderSparePartSerializer(serializers.ModelSerializer[WorkOrderSparePart]):
    # calcula el costo total: cantidad x costo unitario
    total_cost = serializers.DecimalField(
        max_digits=12,decimal_places=2,read_only=True
    )

    class Meta(ModelSerializerMeta):
        model: Any = WorkOrderSparePart
        fields = '__all__'
        read_only_fields = ['id','total_cost']

    def validate_quantity(self,value):
        if value is not None and value < 1:
            raise serializers.ValidationError(_("La cantidad debe ser al menos 1."))
        return value

    def validate_unit_cost(self,value):
        if value is not None and value < 0:
            raise serializers.ValidationError(_("El costo unitario no puede ser negativo."))
        return value

    def _apply_total(self,instance):
        instance.total_cost = (instance.quantity or 0) * (instance.unit_cost or 0)
        return instance

    def create(self,validated_data):
        instance = WorkOrderSparePart(**validated_data)
        self._apply_total(instance)
        instance.save()
        return instance

    def update(self,instance,validated_data):
        for k, v in validated_data.items():
            setattr(instance,k,v)
        self._apply_total(instance)
        instance.save()
        return instance


class WorkOrderMeasurementSerializer(serializers.ModelSerializer[WorkOrderMeasurement]):

    class Meta(ModelSerializerMeta):

        model: Any = WorkOrderMeasurement

        fields = '__all__'

        read_only_fields = [
            "id",
        ]

class WorkOrderEvidenceSerializer(serializers.ModelSerializer[WorkOrderEvidence]):

    class Meta(ModelSerializerMeta):

        model: Any = WorkOrderEvidence

        fields = '__all__'

        read_only_fields = [
            "id",
        ]

    def validate_file(self,value):
        return validate_uploaded_file(value,allowed_extensions=EVIDENCE_EXTENSIONS)


class WorkOrderSignatureSerializer(serializers.ModelSerializer[WorkOrderSignature]):

    class Meta(ModelSerializerMeta):

        model: Any = WorkOrderSignature

        fields = '__all__'

        read_only_fields = [
            "id",
            "signed_at",
        ]


class WorkOrderCostSerializer(serializers.ModelSerializer[WorkOrderCost]):
    total = serializers.SerializerMethodField()

    class Meta(ModelSerializerMeta):
        model: Any = WorkOrderCost
        fields = '__all__'
        read_only_fields = ["id","spare_parts_cost","total"]


    def get_total(self,obj):
        value = (
            (obj.labor_cost or 0)
            + (obj.spare_parts_cost or 0)
            + (obj.transport_cost or 0)
            + (obj.other_cost or 0)
        )
        return f"{value:.2f}"
