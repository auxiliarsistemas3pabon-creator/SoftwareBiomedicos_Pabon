from typing import TYPE_CHECKING

from django.db import models
from django.utils.translation import gettext_lazy as _

from equipment.models import EquipmentWorkOrder


class EvidenceType(models.TextChoices):

    PHOTO = "PHOTO",_("Fotografía")

    VIDEO = "VIDEO",_("Video")

    DOCUMENT = "DOCUMENT",_("Documento")

class SignatureRole(models.TextChoices):

    TECHNICIAN = "TECHNICIAN"

    ENGINEER = "ENGINEER"

    CLIENT = "CLIENT"

    SUPERVISOR = "SUPERVISOR"

class WorkOrderSparePart(models.Model):
    if TYPE_CHECKING:
        work_order_id: int

    work_order = models.ForeignKey(
        EquipmentWorkOrder,
        on_delete=models.CASCADE,
        related_name="spare_parts",
    )

    name = models.CharField(max_length=150)

    reference = models.CharField(max_length=80)

    quantity = models.PositiveIntegerField()

    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    def __str__(self):
        return f"{self.name} x{self.quantity} - {self.work_order}"


class WorkOrderMeasurement(models.Model):

    work_order = models.ForeignKey(
        EquipmentWorkOrder,
        on_delete=models.CASCADE,
        related_name="measurements",
    )

    parameter = models.CharField(max_length=120)

    expected_value = models.CharField(max_length=100)

    measured_value = models.CharField(max_length=100)

    unit = models.CharField(max_length=20)

    passed = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.parameter} - {self.work_order.number}"


class WorkOrderEvidence(models.Model):
    if TYPE_CHECKING:
        def get_evidence_type_display(self) -> str: ...

    work_order = models.ForeignKey(
        EquipmentWorkOrder,
        on_delete=models.CASCADE,
        related_name="evidences",
    )

    evidence_type = models.CharField(
        max_length=20,
        choices=EvidenceType.choices
    )

    description = models.CharField(max_length=250)

    file = models.FileField(
        upload_to="equipment/evidence/",
        blank=True,
    )

    def __str__(self):
        return f"{self.get_evidence_type_display()} - {self.work_order.number}"


class WorkOrderSignature(models.Model):
    if TYPE_CHECKING:
        def get_role_display(self) -> str: ...

    work_order = models.ForeignKey(
        EquipmentWorkOrder,
        on_delete=models.CASCADE,
        related_name="signatures",
    )

    role = models.CharField(
        max_length=20,
        choices=SignatureRole.choices,
    )

    signed_by = models.CharField(
        max_length=150,
    )

    signed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_role_display()}: {self.signed_by}"

class WorkOrderCost(models.Model):

    work_order = models.OneToOneField(
        EquipmentWorkOrder,
        on_delete=models.CASCADE,
        related_name='cost',
    )

    labor_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    spare_parts_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    transport_cost = models.DecimalField(
        max_digits=12,
        decimal_places=12,
        default=0,
    )

    other_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    def __str__(self):
        return f"Costos de {self.work_order.number}"

