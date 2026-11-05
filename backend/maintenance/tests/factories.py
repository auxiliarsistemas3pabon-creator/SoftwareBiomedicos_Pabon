from datetime import date

from factory.declarations import LazyFunction, Sequence, SubFactory
from factory.django import DjangoModelFactory
from factory.faker import Faker

from common.typing_meta import FactoryMeta
from equipment.tests.factories import EquipmentFactory
from maintenance.models import MaintenanceKind, MaintenanceRecord


class MaintenanceRecordFactory(DjangoModelFactory):
    class Meta(FactoryMeta):
        model = MaintenanceRecord

    equipment = SubFactory(EquipmentFactory)
    kind = MaintenanceKind.PREVENTIVE
    date = LazyFunction(lambda: date(2026, 1, 15))
    description = Faker("sentence", nb_words=10)
    technician = Sequence(lambda n: f"Técnico {n}")
    cost = Sequence(lambda n: 100000 + n * 1000)
