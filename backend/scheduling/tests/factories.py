from datetime import date, timedelta

from factory.declarations import LazyFunction, SubFactory
from factory.django import DjangoModelFactory
from factory.faker import Faker

from common.typing_meta import FactoryMeta
from equipment.tests.factories import EquipmentFactory
from scheduling.models import MaintenanceSchedule, ScheduledMaintenanceKind


class MaintenanceScheduleFactory(DjangoModelFactory):
    class Meta(FactoryMeta):
        model = MaintenanceSchedule

    equipment = SubFactory(EquipmentFactory)
    kind = ScheduledMaintenanceKind.PREVENTIVE
    scheduled_date = LazyFunction(lambda: date.today() + timedelta(days=30))
    notes = Faker("sentence", nb_words=8)
    is_completed = False
