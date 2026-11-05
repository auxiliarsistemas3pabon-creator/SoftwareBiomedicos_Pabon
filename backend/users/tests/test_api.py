import pytest
from django.urls import reverse

from users.models import User

from .factories import (
    IngenieroFactory,
    TecnicoFactory,
    UserFactory,
)

LIST_URL = reverse("users:user-list")


def detail_url(pk):
    return reverse("users:user-detail", args=[pk])


def set_password_url(pk):
    return reverse("users:user-set-password", args=[pk])


ME_URL = reverse("users:user-me")


@pytest.mark.django_db
class TestUserAuth:
    def test_list_requires_auth(self, api_client):
        response = api_client.get(LIST_URL)
        assert response.status_code == 401

    def test_me_requires_auth(self, api_client):
        response = api_client.get(ME_URL)
        assert response.status_code == 401


@pytest.mark.django_db
class TestUserPermissions:
    def test_tecnico_cannot_list(self, auth_client, tecnico):
        client = auth_client(tecnico)
        assert client.get(LIST_URL).status_code == 403

    def test_ingeniero_can_list_assignable_staff(
        self, auth_client, ingeniero, tecnico, admin
    ):
        client = auth_client(ingeniero)
        response = client.get(LIST_URL, {"is_active": True})
        assert response.status_code == 200
        roles = {u["role"] for u in response.json()["results"]}
        assert roles <= {"ingeniero", "tecnico"}
        assert "admin" not in roles
        assert admin.username not in {u["username"] for u in response.json()["results"]}

    def test_coordinador_can_list_assignable_staff(
        self, auth_client, coordinador, ingeniero, tecnico
    ):
        client = auth_client(coordinador)
        response = client.get(LIST_URL)
        assert response.status_code == 200
        ids = {u["id"] for u in response.json()["results"]}
        assert ingeniero.id in ids
        assert tecnico.id in ids
        assert coordinador.id not in ids

    def test_admin_can_list(self, auth_client, admin):
        client = auth_client(admin)
        assert client.get(LIST_URL).status_code == 200

    def test_superadmin_can_list(self, auth_client, superadmin):
        client = auth_client(superadmin)
        assert client.get(LIST_URL).status_code == 200

    def test_tecnico_cannot_create(self, auth_client, tecnico):
        client = auth_client(tecnico)
        payload = {
            "username": "new",
            "email": "new@x.com",
            "first_name": "N",
            "last_name": "U",
            "role": "tecnico",
            "password": "Strongpass123!",
        }
        assert client.post(LIST_URL, payload, format="json").status_code == 403

    def test_admin_cannot_create_superadmin(self, auth_client, admin):
        client = auth_client(admin)
        payload = {
            "username": "boss",
            "email": "boss@x.com",
            "first_name": "Big",
            "last_name": "Boss",
            "role": "superadmin",
            "password": "Strongpass123!",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "superadministrador" in str(response.data).lower()

    def test_superadmin_can_create_superadmin(self, auth_client, superadmin):
        client = auth_client(superadmin)
        payload = {
            "username": "boss",
            "email": "boss@x.com",
            "first_name": "Big",
            "last_name": "Boss",
            "role": "superadmin",
            "password": "Strongpass123!",
        }
        assert client.post(LIST_URL, payload, format="json").status_code == 201

    def test_tecnico_can_retrieve_self(self, auth_client, tecnico):
        client = auth_client(tecnico)
        response = client.get(detail_url(tecnico.pk))
        assert response.status_code == 200
        assert response.data["id"] == tecnico.pk

    def test_tecnico_cannot_retrieve_other(self, auth_client, tecnico):
        other = TecnicoFactory()
        client = auth_client(tecnico)
        assert client.get(detail_url(other.pk)).status_code == 403

    def test_tecnico_cannot_patch_other(self, auth_client, tecnico):
        other = TecnicoFactory()
        client = auth_client(tecnico)
        response = client.patch(detail_url(other.pk), {"first_name": "Hack"}, format="json")
        assert response.status_code == 403

    def test_tecnico_cannot_delete(self, auth_client, tecnico):
        other = TecnicoFactory()
        client = auth_client(tecnico)
        assert client.delete(detail_url(other.pk)).status_code == 403


@pytest.mark.django_db
class TestUserList:
    def test_list_paginated(self, auth_client, admin):
        IngenieroFactory.create_batch(3)
        client = auth_client(admin)
        response = client.get(LIST_URL)
        assert response.status_code == 200
        assert "results" in response.data
        assert "count" in response.data

    def test_filter_by_role(self, auth_client, admin):
        IngenieroFactory.create_batch(2)
        TecnicoFactory.create_batch(3)
        client = auth_client(admin)
        response = client.get(LIST_URL, {"role": "ingeniero"})
        assert response.status_code == 200
        assert response.data["count"] == 2

    def test_filter_is_active(self, auth_client, admin):
        UserFactory(is_active=False)
        client = auth_client(admin)
        response = client.get(LIST_URL, {"is_active": "false"})
        assert all(not u["is_active"] for u in response.data["results"])

    def test_search_by_username(self, auth_client, admin):
        UserFactory(username="lupita")
        client = auth_client(admin)
        response = client.get(LIST_URL, {"search": "lupita"})
        usernames = [u["username"] for u in response.data["results"]]
        assert "lupita" in usernames

    def test_ordering(self, auth_client, admin):
        UserFactory(username="aaa")
        UserFactory(username="zzz")
        client = auth_client(admin)
        response = client.get(LIST_URL, {"ordering": "-username"})
        usernames = [u["username"] for u in response.data["results"]]
        assert usernames == sorted(usernames, reverse=True)


@pytest.mark.django_db
class TestUserCreate:
    @pytest.fixture
    def payload(self):
        return {
            "username": "ingeniero1",
            "email": "ingeniero1@x.com",
            "first_name": "María",
            "last_name": "Gómez",
            "role": "ingeniero",
            "phone": "+57 300 555 0000",
            "password": "Strongpass123!",
        }

    def test_create_persists_and_hashes_password(self, auth_client, admin, payload):
        client = auth_client(admin)
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 201
        assert "password" not in response.data
        u = User.objects.get(username="ingeniero1")
        assert u.check_password("Strongpass123!")
        assert u.role == User.Role.INGENIERO

    def test_duplicate_username_case_insensitive(self, auth_client, admin, payload):
        UserFactory(username="ingeniero1", email="other@x.com")
        client = auth_client(admin)
        payload["username"] = "INGENIERO1"
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "nombre de usuario" in str(response.data).lower()

    def test_duplicate_email_case_insensitive(self, auth_client, admin, payload):
        UserFactory(username="other", email="ingeniero1@x.com")
        client = auth_client(admin)
        payload["email"] = "INGENIERO1@X.COM"
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "correo" in str(response.data).lower()

    def test_password_too_short(self, auth_client, admin, payload):
        client = auth_client(admin)
        payload["password"] = "short"
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "password" in response.data

    def test_phone_invalid(self, auth_client, admin, payload):
        client = auth_client(admin)
        payload["phone"] = "abcde"
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "teléfono" in str(response.data).lower()

    def test_missing_required_fields(self, auth_client, admin):
        client = auth_client(admin)
        response = client.post(LIST_URL, {}, format="json")
        assert response.status_code == 400
        for field in ("username", "email", "first_name", "last_name", "password"):
            assert field in response.data


@pytest.mark.django_db
class TestUserUpdate:
    def test_admin_patch_first_name(self, auth_client, admin):
        target = TecnicoFactory()
        client = auth_client(admin)
        response = client.patch(detail_url(target.pk), {"first_name": "Renombrado"}, format="json")
        assert response.status_code == 200
        target.refresh_from_db()
        assert target.first_name == "Renombrado"

    def test_admin_cannot_promote_to_superadmin(self, auth_client, admin):
        target = TecnicoFactory()
        client = auth_client(admin)
        response = client.patch(detail_url(target.pk), {"role": "superadmin"}, format="json")
        assert response.status_code == 400

    def test_superadmin_can_promote_to_superadmin(self, auth_client, superadmin):
        target = TecnicoFactory()
        client = auth_client(superadmin)
        response = client.patch(detail_url(target.pk), {"role": "superadmin"}, format="json")
        assert response.status_code == 200

    def test_patch_same_username_does_not_trigger_duplicate(self, auth_client, admin):
        target = TecnicoFactory(username="keepme")
        client = auth_client(admin)
        response = client.patch(detail_url(target.pk), {"username": "keepme"}, format="json")
        assert response.status_code == 200

    def test_self_patch_phone_ok(self, auth_client, tecnico):
        client = auth_client(tecnico)
        response = client.patch(
            detail_url(tecnico.pk), {"phone": "+57 300 999 8888"}, format="json"
        )
        assert response.status_code == 200

    def test_self_cannot_change_own_role(self, auth_client, tecnico):
        client = auth_client(tecnico)
        response = client.patch(detail_url(tecnico.pk), {"role": "admin"}, format="json")
        assert response.status_code == 403


@pytest.mark.django_db
class TestUserDelete:
    def test_admin_deletes_user(self, auth_client, admin):
        target = TecnicoFactory()
        client = auth_client(admin)
        response = client.delete(detail_url(target.pk))
        assert response.status_code == 204
        assert not User.objects.filter(pk=target.pk).exists()

    def test_self_delete_returns_409(self, auth_client, admin):
        client = auth_client(admin)
        response = client.delete(detail_url(admin.pk))
        assert response.status_code == 409
        assert "propia cuenta" in str(response.data).lower()

    def test_delete_nonexistent_returns_404(self, auth_client, admin):
        client = auth_client(admin)
        assert client.delete(detail_url(99999)).status_code == 404


@pytest.mark.django_db
class TestUserMe:
    def test_returns_current_user(self, auth_client, ingeniero):
        client = auth_client(ingeniero)
        response = client.get(ME_URL)
        assert response.status_code == 200
        assert response.data["id"] == ingeniero.pk
        assert response.data["role"] == "ingeniero"
        assert "password" not in response.data


@pytest.mark.django_db
class TestSetPassword:
    def test_self_change_with_correct_current(self, auth_client, tecnico):
        tecnico.set_password("Oldpass123!")
        tecnico.save()
        client = auth_client(tecnico)
        response = client.post(
            set_password_url(tecnico.pk),
            {"current_password": "Oldpass123!", "new_password": "Newpass456!"},
            format="json",
        )
        assert response.status_code == 204
        tecnico.refresh_from_db()
        assert tecnico.check_password("Newpass456!")

    def test_self_change_with_wrong_current(self, auth_client, tecnico):
        tecnico.set_password("Oldpass123!")
        tecnico.save()
        client = auth_client(tecnico)
        response = client.post(
            set_password_url(tecnico.pk),
            {"current_password": "Wrong!", "new_password": "Newpass456!"},
            format="json",
        )
        assert response.status_code == 400
        assert "incorrecta" in str(response.data).lower()

    def test_self_change_password_too_short(self, auth_client, tecnico):
        tecnico.set_password("Oldpass123!")
        tecnico.save()
        client = auth_client(tecnico)
        response = client.post(
            set_password_url(tecnico.pk),
            {"current_password": "Oldpass123!", "new_password": "short"},
            format="json",
        )
        assert response.status_code == 400

    def test_admin_changes_other_without_current(self, auth_client, admin):
        target = TecnicoFactory()
        client = auth_client(admin)
        response = client.post(
            set_password_url(target.pk),
            {"new_password": "Resetpass123!"},
            format="json",
        )
        assert response.status_code == 204
        target.refresh_from_db()
        assert target.check_password("Resetpass123!")

    def test_tecnico_cannot_change_other(self, auth_client, tecnico):
        other = TecnicoFactory()
        client = auth_client(tecnico)
        response = client.post(
            set_password_url(other.pk),
            {"new_password": "Hack123456!"},
            format="json",
        )
        assert response.status_code == 403
