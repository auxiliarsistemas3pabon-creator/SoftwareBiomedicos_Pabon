import pytest
from django.urls import reverse
from rest_framework import status

from ..models import Brand, EquipmentModel
from .factories import BrandFactory, EquipmentModelFactory

pytestmark = pytest.mark.django_db


BRAND_LIST_URL = reverse("catalog:brand-list")
MODEL_LIST_URL = reverse("catalog:equipment-model-list")


def brand_detail_url(pk: int) -> str:
    return reverse("catalog:brand-detail", args=[pk])


def model_detail_url(pk: int) -> str:
    return reverse("catalog:equipment-model-detail", args=[pk])


class TestBrandAuth:
    def test_list_requires_auth(self, api_client):
        assert api_client.get(BRAND_LIST_URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_requires_auth(self, api_client):
        response = api_client.post(BRAND_LIST_URL, {"name": "X"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestBrandCreate:
    def test_create_brand(self, auth_client):
        response = auth_client.post(BRAND_LIST_URL, {"name": "Philips"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["id"]
        assert body["is_active"] is True
        assert body["created_at"]
        assert body["updated_at"]
        assert Brand.objects.count() == 1

    def test_duplicate_name_case_insensitive_returns_400(self, auth_client):
        BrandFactory(name="Philips")
        response = auth_client.post(BRAND_LIST_URL, {"name": "PHILIPS"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Ya existe una marca con este nombre" in response.json()["name"][0]

    def test_blank_name_returns_400(self, auth_client):
        response = auth_client.post(BRAND_LIST_URL, {"name": "   "}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "El nombre no puede estar vacío" in response.json()["name"][0]


class TestBrandList:
    def test_list_paginated(self, auth_client):
        BrandFactory.create_batch(3)
        response = auth_client.get(BRAND_LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 3

    def test_filter_is_active_false(self, auth_client):
        BrandFactory(is_active=True)
        BrandFactory(is_active=False)
        response = auth_client.get(BRAND_LIST_URL, {"is_active": "false"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 1

    def test_search_partial_name(self, auth_client):
        BrandFactory(name="Philips")
        BrandFactory(name="Mindray")
        response = auth_client.get(BRAND_LIST_URL, {"search": "Phil"})
        assert response.status_code == status.HTTP_200_OK
        names = [b["name"] for b in response.json()["results"]]
        assert "Philips" in names
        assert "Mindray" not in names


class TestBrandUpdate:
    def test_patch_is_active(self, auth_client, brand):
        response = auth_client.patch(
            brand_detail_url(brand.id), {"is_active": False}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        brand.refresh_from_db()
        assert brand.is_active is False


class TestBrandDelete:
    def test_delete_without_models_returns_204(self, auth_client, brand):
        response = auth_client.delete(brand_detail_url(brand.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Brand.objects.filter(pk=brand.id).exists()

    def test_delete_with_models_returns_409(self, auth_client, brand):
        EquipmentModelFactory(brand=brand)
        response = auth_client.delete(brand_detail_url(brand.id))
        assert response.status_code == status.HTTP_409_CONFLICT
        assert "No se puede eliminar la marca" in response.json()["detail"]


class TestEquipmentModelAuth:
    def test_list_requires_auth(self, api_client):
        assert api_client.get(MODEL_LIST_URL).status_code == status.HTTP_401_UNAUTHORIZED


class TestEquipmentModelCreate:
    def test_create_with_active_brand(self, auth_client, brand):
        payload = {
            "brand": brand.id,
            "name": "MX450",
            "description": "Monitor multiparámetro",
        }
        response = auth_client.post(MODEL_LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["brand"] == brand.id
        assert body["brand_name"] == brand.name
        assert EquipmentModel.objects.count() == 1

    def test_create_with_inactive_brand_returns_400(self, auth_client):
        b = BrandFactory(is_active=False)
        payload = {"brand": b.id, "name": "MX450"}
        response = auth_client.post(MODEL_LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "La marca seleccionada no está activa" in response.json()["brand"][0]

    def test_blank_name_returns_400(self, auth_client, brand):
        payload = {"brand": brand.id, "name": "   "}
        response = auth_client.post(MODEL_LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "El nombre del modelo no puede estar vacío" in response.json()["name"][0]

    def test_duplicate_per_brand_returns_400(self, auth_client, brand):
        EquipmentModelFactory(brand=brand, name="MX450")
        payload = {"brand": brand.id, "name": "mx450"}
        response = auth_client.post(MODEL_LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Ya existe un modelo con este nombre para esta marca" in response.json()["name"][0]

    def test_same_name_other_brand_succeeds(self, auth_client, brand):
        EquipmentModelFactory(brand=brand, name="MX450")
        other = BrandFactory()
        payload = {"brand": other.id, "name": "MX450"}
        response = auth_client.post(MODEL_LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED


class TestEquipmentModelFilters:
    def test_filter_by_brand(self, auth_client, brand):
        EquipmentModelFactory.create_batch(2, brand=brand)
        EquipmentModelFactory()  # otra brand
        response = auth_client.get(MODEL_LIST_URL, {"brand": brand.id})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 2

    def test_filter_by_brand_is_active(self, auth_client):
        active = BrandFactory(is_active=True)
        inactive = BrandFactory(is_active=False)
        EquipmentModelFactory(brand=active)
        EquipmentModelFactory(brand=inactive)
        response = auth_client.get(MODEL_LIST_URL, {"brand_is_active": "true"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 1

    def test_search_by_name(self, auth_client, brand):
        EquipmentModelFactory(brand=brand, name="MX450")
        EquipmentModelFactory(brand=brand, name="MP70")
        response = auth_client.get(MODEL_LIST_URL, {"search": "MX450"})
        names = [m["name"] for m in response.json()["results"]]
        assert "MX450" in names
        assert "MP70" not in names

    def test_search_by_brand_name(self, auth_client):
        b1 = BrandFactory(name="Philips")
        b2 = BrandFactory(name="Mindray")
        EquipmentModelFactory(brand=b1)
        EquipmentModelFactory(brand=b2)
        response = auth_client.get(MODEL_LIST_URL, {"search": "Philips"})
        for m in response.json()["results"]:
            assert m["brand_name"] == "Philips"


class TestEquipmentModelDelete:
    def test_delete_without_equipment_returns_204(self, auth_client, equipment_model):
        response = auth_client.delete(model_detail_url(equipment_model.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_with_equipment_returns_409(self, auth_client, equipment_model):
        from equipment.tests.factories import EquipmentFactory

        EquipmentFactory(equipment_model=equipment_model)
        response = auth_client.delete(model_detail_url(equipment_model.id))
        assert response.status_code == status.HTTP_409_CONFLICT
        assert "No se puede eliminar el modelo" in response.json()["detail"]
