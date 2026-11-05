from django.db import models


class FailureRecordQuerySet(models.QuerySet):
    def for_equipment(self, equipment_id: int) -> "FailureRecordQuerySet":
        return self.filter(equipment_id=equipment_id)

    def for_branch(self, branch_id: int) -> "FailureRecordQuerySet":
        return self.filter(equipment__branch_id=branch_id)

    def open(self) -> "FailureRecordQuerySet":
        return self.filter(resolved=False)

    def resolved(self) -> "FailureRecordQuerySet":
        return self.filter(resolved=True)

    def of_severity(self, severity: str) -> "FailureRecordQuerySet":
        return self.filter(severity=severity)

    def critical(self) -> "FailureRecordQuerySet":
        return self.of_severity("CRITICAL")


class FailureRecordManager(models.Manager.from_queryset(FailureRecordQuerySet)):
    def get_queryset(self) -> FailureRecordQuerySet:
        return FailureRecordQuerySet(self.model, using=self._db).select_related(
            "equipment", "equipment__branch"
        )

    def for_equipment(self, equipment_id: int) -> FailureRecordQuerySet:
        return self.get_queryset().for_equipment(equipment_id)

    def for_branch(self, branch_id: int) -> FailureRecordQuerySet:
        return self.get_queryset().for_branch(branch_id)

    def open(self) -> FailureRecordQuerySet:
        return self.get_queryset().open()

    def resolved(self) -> FailureRecordQuerySet:
        return self.get_queryset().resolved()

    def of_severity(self, severity: str) -> FailureRecordQuerySet:
        return self.get_queryset().of_severity(severity)

    def critical(self) -> FailureRecordQuerySet:
        return self.get_queryset().critical()
