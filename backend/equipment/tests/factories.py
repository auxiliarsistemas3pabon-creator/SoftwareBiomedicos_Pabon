from factory.declarations import Sequence, SubFactory
from factory.django import DjangoModelFactory

from branches.tests.factories import BranchFactory
from catalog.tests.factories import EquipmentModelFactory
from common.typing_meta import FactoryMeta
from equipment.models import Equipment, EquipmentStatus


class EquipmentFactory(DjangoModelFactory):
    class Meta(FactoryMeta):
        model = Equipment

    name = Sequence(lambda n: f"Equipo {n}")
    asset_tag = Sequence(lambda n: f"EQ-{n:04d}")
    equipment_model = SubFactory(EquipmentModelFactory)
    branch = SubFactory(BranchFactory)
    location = ""
    purchase_date = None
    status = EquipmentStatus.ACTIVE
    risk_class = None
