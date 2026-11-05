from factory.declarations import LazyAttribute, Sequence
from factory.django import DjangoModelFactory
from factory.helpers import post_generation

from common.typing_meta import FactoryMeta
from users.models import User


class UserFactory(DjangoModelFactory):
    class Meta(FactoryMeta):
        model = User
        django_get_or_create = ("username",)
        skip_postgeneration_save = True

    username = Sequence(lambda n: f"user{n}")
    email = LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = "Nombre"
    last_name = "Apellido"
    role = User.Role.TECNICO
    phone = ""
    is_active = True

    @post_generation
    def password(self, create, extracted, **kwargs):
        # `skip_postgeneration_save=True` no vuelve a guardar el modelo tras los
        # post-generation hooks, así que hay que persistir el hash explícitamente
        # o el usuario queda con password vacío en la BD (aunque no en memoria).
        assert isinstance(self, User)
        self.set_password(extracted or "testpass123")
        if create:
            self.save(update_fields=["password"])


class SuperadminFactory(UserFactory):
    role = User.Role.SUPERADMIN
    is_staff = True
    is_superuser = True


class AdminFactory(UserFactory):
    role = User.Role.ADMIN


class CoordinadorFactory(UserFactory):
    role = User.Role.COORDINADOR


class IngenieroFactory(UserFactory):
    role = User.Role.INGENIERO


class TecnicoFactory(UserFactory):
    role = User.Role.TECNICO


class UsuarioFactory(UserFactory):
    role = User.Role.USUARIO
