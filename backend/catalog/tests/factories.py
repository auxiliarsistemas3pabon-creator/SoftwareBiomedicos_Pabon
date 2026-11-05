from factory.declarations import Sequence, SubFactory
from factory.django import DjangoModelFactory
from factory.faker import Faker

from common.typing_meta import FactoryMeta

from ..models import Brand, EquipmentModel


class BrandFactory(DjangoModelFactory):
    class Meta(FactoryMeta):
        model = Brand

    name = Sequence(lambda n: f"Brand {n}")
    is_active = True


class EquipmentModelFactory(DjangoModelFactory):
    class Meta(FactoryMeta):
        model = EquipmentModel

    brand = SubFactory(BrandFactory)
    name = Sequence(lambda n: f"M-{n:04d}")
    description = Faker("sentence", nb_words=8)
    is_active = True
