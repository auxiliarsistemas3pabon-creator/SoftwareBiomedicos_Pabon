import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from users.managers import UserManager
from users.models import User

from .factories import UserFactory


def _user_objects() -> UserManager:
    manager = User.objects
    assert isinstance(manager, UserManager)
    return manager


@pytest.mark.django_db
class TestUserModel:
    def test_str(self):
        u = UserFactory(username="juan", role=User.Role.INGENIERO)
        assert str(u) == "juan (Ingeniero biomédico)"

    def test_default_role_is_tecnico(self):
        u = User(username="x", email="x@x.com", first_name="A", last_name="B")
        assert u.role == User.Role.TECNICO

    def test_is_admin_role_property(self):
        assert UserFactory(role=User.Role.SUPERADMIN).is_admin_role
        assert UserFactory(role=User.Role.ADMIN).is_admin_role
        assert not UserFactory(role=User.Role.COORDINADOR).is_admin_role
        assert not UserFactory(role=User.Role.INGENIERO).is_admin_role
        assert not UserFactory(role=User.Role.TECNICO).is_admin_role

    def test_phone_invalid_raises(self):
        u = UserFactory.build(phone="abc")
        with pytest.raises(ValidationError):
            u.full_clean()

    def test_phone_valid(self):
        u = UserFactory.build(phone="+57 300 555 1234")
        u.full_clean()

    def test_email_unique(self):
        UserFactory(email="dup@x.com")
        with pytest.raises(IntegrityError):
            UserFactory(email="dup@x.com")


@pytest.mark.django_db
class TestUserManager:
    def test_active_inactive(self):
        UserFactory(is_active=True)
        UserFactory(is_active=False)
        assert _user_objects().active().count() == 1
        assert _user_objects().inactive().count() == 1

    def test_by_role(self):
        UserFactory(role=User.Role.INGENIERO)
        UserFactory(role=User.Role.INGENIERO)
        UserFactory(role=User.Role.TECNICO)
        assert _user_objects().by_role(User.Role.INGENIERO).count() == 2

    def test_staff_roles(self):
        UserFactory(role=User.Role.SUPERADMIN, is_staff=True, is_superuser=True)
        UserFactory(role=User.Role.ADMIN)
        UserFactory(role=User.Role.TECNICO)
        assert _user_objects().staff_roles().count() == 2

    def test_create_user_defaults(self):
        u = User.objects.create_user(username="alice", email="alice@x.com", password="secret123")
        assert u.is_staff is False
        assert u.is_superuser is False
        assert u.role == User.Role.TECNICO
        assert u.check_password("secret123")

    def test_create_superuser_defaults(self):
        u = User.objects.create_superuser(
            username="boss",
            email="boss@x.com",
            password="superpass123",
            first_name="A",
            last_name="B",
        )
        assert u.is_staff is True
        assert u.is_superuser is True
        assert u.role == User.Role.SUPERADMIN

    def test_create_user_requires_username(self):
        with pytest.raises(ValueError, match="nombre de usuario es obligatorio"):
            User.objects.create_user(username="", email="x@x.com", password="secret")

    def test_create_user_requires_email(self):
        with pytest.raises(ValueError, match="correo electrónico es obligatorio"):
            User.objects.create_user(username="x", email="", password="secret")
