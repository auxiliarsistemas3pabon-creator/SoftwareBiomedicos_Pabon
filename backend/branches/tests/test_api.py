import pytest
from django.urls import reverse
from rest_framework import status

from ..models import Branch
from .factories import BranchFactory

pytestmark = pytest.mark.django_db


LIST_URL = reverse("branches:branch-list")


def detail_url(branch_id: int) -> str:
    return reverse("branches:branch-detail", args=[branch_id])


class TestBranchAuth:
    def test_list_requires_authentication(self, api_client):
        response = api_client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_requires_authentication(self, api_client):
        response = api_client.post(LIST_URL, data={}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestBranchList:
    def test_list_returns_paginated_branches(self, auth_client):
        BranchFactory.create_batch(3)

        response = auth_client.get(LIST_URL)

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["count"] == 3
        assert "results" in body

    def test_list_filter_by_city(self, auth_client):
        BranchFactory(name="B1", city="Bogota")
        BranchFactory(name="B2", city="Bogota")
        BranchFactory(name="B3", city="Medellin")

        response = auth_client.get(LIST_URL, {"city": "Bogota"})

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 2

    def test_list_filter_by_is_active(self, auth_client):
        BranchFactory(name="A", is_active=True)
        BranchFactory(name="B", is_active=False)

        response = auth_client.get(LIST_URL, {"is_active": "false"})

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["count"] == 1
        assert body["results"][0]["name"] == "B"

    def test_list_search_by_name(self, auth_client):
        BranchFactory(name="Northern Clinic")
        BranchFactory(name="Southern Clinic")
        BranchFactory(name="Central Plaza")

        response = auth_client.get(LIST_URL, {"search": "Clinic"})

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 2

    def test_list_search_by_address(self, auth_client):
        # La búsqueda de sedes es solo por nombre, no por dirección.
        BranchFactory(name="One", address="Calle 100 #15-20")
        BranchFactory(name="Two", address="Avenida Siempre Viva 742")

        by_address = auth_client.get(LIST_URL, {"search": "Siempre Viva"})
        assert by_address.status_code == status.HTTP_200_OK
        assert by_address.json()["count"] == 0

        response = auth_client.get(LIST_URL, {"search": "Two"})
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["count"] == 1
        assert body["results"][0]["name"] == "Two"

    def test_list_ordering_by_city(self, auth_client):
        BranchFactory(name="A", city="Cali")
        BranchFactory(name="B", city="Bogota")
        BranchFactory(name="C", city="Medellin")

        response = auth_client.get(LIST_URL, {"ordering": "city"})

        assert response.status_code == status.HTTP_200_OK
        cities = [item["city"] for item in response.json()["results"]]
        assert cities == sorted(cities)


class TestBranchRetrieve:
    def test_retrieve_branch(self, auth_client, branch):
        response = auth_client.get(detail_url(branch.id))

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["id"] == branch.id
        assert body["name"] == branch.name

    def test_retrieve_missing_returns_404(self, auth_client):
        response = auth_client.get(detail_url(9999))
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestBranchCreate:
    def _payload(self, **overrides):
        data = {
            "name": "Sede Norte",
            "address": "Calle 100 #15-20",
            "city": "Bogota",
            "phone": "+57 300 555 1234",
            "email": "norte@clinic.test",
            "is_active": True,
        }
        data.update(overrides)
        return data

    def test_create_branch(self, auth_client):
        response = auth_client.post(LIST_URL, data=self._payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Branch.objects.count() == 1
        created = Branch.objects.first()
        assert created is not None
        assert created.name == "Sede Norte"
        assert created.city == "Bogota"

    def test_create_with_duplicate_name_returns_400_in_spanish(self, auth_client):
        BranchFactory(name="Sede Norte")

        response = auth_client.post(LIST_URL, data=self._payload(), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        body = response.json()
        assert "name" in body
        assert "Ya existe una sede con este nombre" in body["name"][0]

    def test_create_two_branches_without_email(self, auth_client):
        first = auth_client.post(
            LIST_URL, data=self._payload(name="Sede A", email=""), format="json"
        )
        second = auth_client.post(
            LIST_URL, data=self._payload(name="Sede B", email=""), format="json"
        )
        assert first.status_code == status.HTTP_201_CREATED, first.json()
        assert second.status_code == status.HTTP_201_CREATED, second.json()
        assert first.json()["email"] in (None, "")
        assert second.json()["email"] in (None, "")

    def test_create_with_duplicate_email_returns_400_in_spanish(self, auth_client):
        auth_client.post(LIST_URL, data=self._payload(), format="json")
        response = auth_client.post(
            LIST_URL,
            data=self._payload(name="Sede Sur", email="norte@clinic.test"),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Ya existe una sede con este correo electrónico" in response.json()["email"][0]

    def test_create_with_invalid_phone_returns_400_in_spanish(self, auth_client):
        response = auth_client.post(
            LIST_URL,
            data=self._payload(phone="invalid"),
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        body = response.json()
        assert "phone" in body
        assert "El teléfono no tiene un formato válido" in body["phone"][0]

    def test_create_normalizes_name_whitespace(self, auth_client):
        response = auth_client.post(
            LIST_URL,
            data=self._payload(name="   Sede   Norte   "),
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["name"] == "Sede Norte"

    def test_create_missing_required_fields_returns_400(self, auth_client):
        response = auth_client.post(LIST_URL, data={}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        body = response.json()
        for required in ("name", "address", "city", "phone"):
            assert required in body


class TestBranchUpdate:
    def test_put_updates_all_fields(self, auth_client, branch):
        payload = {
            "name": "Updated Name",
            "address": "New Address 123",
            "city": "Cali",
            "phone": "+57 301 222 3344",
            "email": "updated@clinic.test",
            "is_active": False,
        }

        response = auth_client.put(detail_url(branch.id), data=payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        branch.refresh_from_db()
        assert branch.name == "Updated Name"
        assert branch.city == "Cali"
        assert branch.is_active is False

    def test_patch_partial_update(self, auth_client, branch):
        response = auth_client.patch(
            detail_url(branch.id),
            data={"is_active": False},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        branch.refresh_from_db()
        assert branch.is_active is False

    def test_patch_with_duplicate_name_returns_400(self, auth_client):
        BranchFactory(name="Existing")
        target = BranchFactory(name="Original")

        response = auth_client.patch(
            detail_url(target.id),
            data={"name": "Existing"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Ya existe una sede con este nombre" in response.json()["name"][0]

    def test_patch_with_same_name_succeeds(self, auth_client, branch):
        response = auth_client.patch(
            detail_url(branch.id),
            data={"name": branch.name},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK


class TestBranchDelete:
    def test_delete_branch(self, admin_client, branch):
        response = admin_client.delete(detail_url(branch.id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Branch.objects.filter(id=branch.id).exists()

    def test_delete_missing_returns_404(self, admin_client):
        response = admin_client.delete(detail_url(9999))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_by_non_management_role_returns_403(self, tecnico_client, branch):
        response = tecnico_client.delete(detail_url(branch.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Branch.objects.filter(id=branch.id).exists()

    def test_create_by_tecnico_returns_403(self, tecnico_client):
        response = tecnico_client.post(
            LIST_URL,
            {"name": "Sede X", "city": "Pasto", "address": "Calle 1",
             "phone": "+57 300 000 0000", "email": "x@x.test"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_edit_by_tecnico_returns_403(self, tecnico_client, branch):
        response = tecnico_client.patch(
            detail_url(branch.id), {"city": "Cali"}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
