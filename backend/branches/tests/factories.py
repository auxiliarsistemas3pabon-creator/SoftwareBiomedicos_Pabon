from factory.declarations import Iterator, LazyAttribute, Sequence
from factory.django import DjangoModelFactory
from factory.faker import Faker

from common.typing_meta import FactoryMeta
from users.tests.factories import UserFactory  # noqa: F401  (re-exportado)

from ..models import Branch


class BranchFactory(DjangoModelFactory):
    class Meta(FactoryMeta):
        model = Branch

    name = Sequence(lambda n: f"Branch {n}")
    address = Faker("street_address")
    city = Iterator(["Bogota", "Medellin", "Cali", "Barranquilla"])
    phone = Sequence(lambda n: f"+57 300 000 {n:04d}")
    email = LazyAttribute(lambda obj: f"{obj.name.lower().replace(' ', '')}@clinic.test")
    is_active = True
