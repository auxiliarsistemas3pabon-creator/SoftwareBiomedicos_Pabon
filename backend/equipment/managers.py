from django.db import models


class EquipmentQuerySet(models.QuerySet):
    def active(self) -> "EquipmentQuerySet":
        return self.filter(status="ACTIVE")

    def in_repair(self) -> "EquipmentQuerySet":
        return self.filter(status__in=["IN_MAINTENANCE", "IN_REPAIR"])

    def for_branch(self, branch_id: int) -> "EquipmentQuerySet":
        return self.filter(branch_id=branch_id)


class EquipmentManager(models.Manager.from_queryset(EquipmentQuerySet)):
    def get_queryset(self) -> EquipmentQuerySet:
        return EquipmentQuerySet(self.model, using=self._db).select_related(
            "branch", "equipment_model", "equipment_model__brand"
        )

    def active(self) -> EquipmentQuerySet:
        return self.get_queryset().active()

    def in_repair(self) -> EquipmentQuerySet:
        return self.get_queryset().in_repair()

    def for_branch(self, branch_id: int) -> EquipmentQuerySet:
        return self.get_queryset().for_branch(branch_id)
