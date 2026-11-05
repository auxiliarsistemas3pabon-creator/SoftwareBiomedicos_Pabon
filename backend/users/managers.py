from django.contrib.auth.models import UserManager as AuthUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserQuerySet(models.QuerySet):
    def active(self) -> "UserQuerySet":
        return self.filter(is_active=True)

    def inactive(self) -> "UserQuerySet":
        return self.filter(is_active=False)

    def by_role(self, role: str) -> "UserQuerySet":
        return self.filter(role=role)

    def staff_roles(self) -> "UserQuerySet":
        return self.filter(role__in=["superadmin", "admin"])


class UserManager(AuthUserManager.from_queryset(UserQuerySet)):
    use_in_migrations = True

    def get_queryset(self) -> UserQuerySet:
        return UserQuerySet(model=self.model, using=self._db, hints=getattr(self, "_hints", None))

    def active(self) -> UserQuerySet:
        return self.get_queryset().active()

    def inactive(self) -> UserQuerySet:
        return self.get_queryset().inactive()

    def by_role(self, role: str) -> UserQuerySet:
        return self.get_queryset().by_role(role)

    def staff_roles(self) -> UserQuerySet:
        return self.get_queryset().staff_roles()

    def _create_user(self, username, email, password, **extra_fields):
        if not username:
            raise ValueError(_("El nombre de usuario es obligatorio."))
        if not email:
            raise ValueError(_("El correo electrónico es obligatorio."))
        email = self.normalize_email(email).lower()
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", "tecnico")
        return self._create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "superadmin")
        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("El superusuario debe tener is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("El superusuario debe tener is_superuser=True."))
        return self._create_user(username, email, password, **extra_fields)
