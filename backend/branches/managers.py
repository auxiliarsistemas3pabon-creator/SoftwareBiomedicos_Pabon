from django.db import models


class BranchQuerySet(models.QuerySet):
    def active(self) -> "BranchQuerySet":
        return self.filter(is_active=True)

    def inactive(self) -> "BranchQuerySet":
        return self.filter(is_active=False)

    def by_city(self, city: str) -> "BranchQuerySet":
        return self.filter(city__iexact=city)


class BranchManager(models.Manager.from_queryset(BranchQuerySet)):
    def get_queryset(self) -> BranchQuerySet:
        return BranchQuerySet(self.model, using=self._db)

    def active(self) -> BranchQuerySet:
        return self.get_queryset().active()

    def inactive(self) -> BranchQuerySet:
        return self.get_queryset().inactive()

    def by_city(self, city: str) -> BranchQuerySet:
        return self.get_queryset().by_city(city)
