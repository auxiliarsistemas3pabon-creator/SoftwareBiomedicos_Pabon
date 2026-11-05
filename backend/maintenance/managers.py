from django.db import models


class MaintenanceRecordQuerySet(models.QuerySet):
    def for_equipment(self, equipment_id: int) -> "MaintenanceRecordQuerySet":
        return self.filter(equipment_id=equipment_id)

    def for_branch(self, branch_id: int) -> "MaintenanceRecordQuerySet":
        return self.filter(equipment__branch_id=branch_id)

    def of_kind(self, kind: str) -> "MaintenanceRecordQuerySet":
        return self.filter(kind=kind)

    def preventive(self) -> "MaintenanceRecordQuerySet":
        return self.of_kind("PREVENTIVE")

    def corrective(self) -> "MaintenanceRecordQuerySet":
        return self.of_kind("CORRECTIVE")

    def repairs(self) -> "MaintenanceRecordQuerySet":
        return self.of_kind("REPAIR")

    def in_range(self, start, end) -> "MaintenanceRecordQuerySet":
        return self.filter(date__gte=start, date__lte=end)

    def assigned_to_engineer(self, user_id: int) -> "MaintenanceRecordQuerySet":
        return self.filter(assigned_engineer_id=user_id)

    def assigned_to_technician(self, user_id: int) -> "MaintenanceRecordQuerySet":
        return self.filter(assigned_technician_id=user_id)

    def unassigned(self) -> "MaintenanceRecordQuerySet":
        return self.filter(assigned_engineer__isnull=True, assigned_technician__isnull=True)


class MaintenanceRecordManager(models.Manager.from_queryset(MaintenanceRecordQuerySet)):
    def get_queryset(self) -> MaintenanceRecordQuerySet:
        return MaintenanceRecordQuerySet(self.model, using=self._db).select_related(
            "equipment",
            "equipment__branch",
            "assigned_engineer",
            "assigned_technician",
            "work_order",
        )

    def for_equipment(self, equipment_id: int) -> MaintenanceRecordQuerySet:
        return self.get_queryset().for_equipment(equipment_id)

    def for_branch(self, branch_id: int) -> MaintenanceRecordQuerySet:
        return self.get_queryset().for_branch(branch_id)

    def of_kind(self, kind: str) -> MaintenanceRecordQuerySet:
        return self.get_queryset().of_kind(kind)

    def preventive(self) -> MaintenanceRecordQuerySet:
        return self.get_queryset().preventive()

    def corrective(self) -> MaintenanceRecordQuerySet:
        return self.get_queryset().corrective()

    def repairs(self) -> MaintenanceRecordQuerySet:
        return self.get_queryset().repairs()

    def in_range(self, start, end) -> MaintenanceRecordQuerySet:
        return self.get_queryset().in_range(start, end)

    def assigned_to_engineer(self, user_id: int) -> MaintenanceRecordQuerySet:
        return self.get_queryset().assigned_to_engineer(user_id)

    def assigned_to_technician(self, user_id: int) -> MaintenanceRecordQuerySet:
        return self.get_queryset().assigned_to_technician(user_id)

    def unassigned(self) -> MaintenanceRecordQuerySet:
        return self.get_queryset().unassigned()
