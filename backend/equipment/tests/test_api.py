from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from branches.tests.factories import BranchFactory
from catalog.tests.factories import BrandFactory, EquipmentModelFactory
from equipment.models import Equipment, EquipmentStatus

from .factories import EquipmentFactory

LIST_URL = reverse("equipment:equipment-list")


def detail_url(pk):
    return reverse("equipment:equipment-detail", args=[pk])


def by_tag_url(tag):
    return reverse("equipment:equipment-by-asset-tag", args=[tag])


def regenerate_url(pk):
    return reverse("equipment:equipment-regenerate-qr", args=[pk])


REGENERATE_ALL_URL = reverse("equipment:equipment-regenerate-qr-all")


@pytest.mark.django_db
class TestEquipmentAuth:
    def test_list_requires_auth(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401

    def test_create_requires_auth(self, api_client, branch, equipment_model):
        payload = {
            "name": "x",
            "asset_tag": "EQ-1",
            "equipment_model": equipment_model.id,
            "branch": branch.id,
        }
        assert api_client.post(LIST_URL, payload, format="json").status_code == 401


@pytest.mark.django_db
class TestEquipmentCreate:
    def _payload(self, branch, equipment_model):
        return {
            "name": "Monitor de signos vitales",
            "asset_tag": "EQ-0001",
            "equipment_model": equipment_model.id,
            "branch": branch.id,
            "location": "UCI - cama 3",
            "purchase_date": "2024-08-15",
            "status": EquipmentStatus.ACTIVE,
        }

    def test_create_201_and_qr_url_present(self, auth_client, branch, equipment_model):
        response = auth_client.post(LIST_URL, self._payload(branch, equipment_model), format="json")
        assert response.status_code == 201
        body = response.json()
        assert body["qr_code_url"]
        assert body["qr_code_url"].startswith("http")
        assert body["asset_tag"] == "EQ-0001"
        assert body["branch_name"] == branch.name
        assert body["equipment_model"] == equipment_model.id
        assert body["equipment_model_name"] == equipment_model.name
        assert body["brand_name"] == equipment_model.brand.name
        assert body["risk_class"] is None

    def test_asset_tag_normalized_to_uppercase(self, auth_client, branch, equipment_model):
        payload = self._payload(branch, equipment_model)
        payload["asset_tag"] = "  eq-abc  "
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 201
        assert response.json()["asset_tag"] == "EQ-ABC"

    def test_sql_like_input_is_stored_as_literal_text(
        self, auth_client, branch, equipment_model, equipment
    ):
        payload = self._payload(branch, equipment_model)
        payload["name"] = "Equipo'); DROP TABLE equipment_equipment; --"
        payload["asset_tag"] = "EQ-'; DELETE FROM equipment_equipment; --"

        response = auth_client.post(LIST_URL, payload, format="json")

        assert response.status_code == 201
        assert response.json()["name"] == payload["name"]
        assert Equipment.objects.filter(
            asset_tag=response.json()["asset_tag"], name=payload["name"]
        ).exists()
        assert Equipment.objects.filter(pk=equipment.pk).exists()

    def test_duplicate_asset_tag_case_insensitive(self, auth_client, branch, equipment_model):
        EquipmentFactory(asset_tag="EQ-0001", branch=branch, equipment_model=equipment_model)
        payload = self._payload(branch, equipment_model)
        payload["asset_tag"] = "eq-0001"
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "código de inventario" in str(response.json()).lower()

    def test_future_purchase_date_returns_400(self, auth_client, branch, equipment_model):
        payload = self._payload(branch, equipment_model)
        future = (timezone.localdate() + timedelta(days=10)).isoformat()
        payload["purchase_date"] = future
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "fecha de compra" in str(response.json()).lower()

    def test_inactive_branch_returns_400(self, auth_client, equipment_model):
        inactive = BranchFactory(is_active=False)
        payload = self._payload(inactive, equipment_model)
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "no está activa" in str(response.json()).lower()

    def test_missing_required_fields(self, auth_client):
        response = auth_client.post(LIST_URL, {}, format="json")
        assert response.status_code == 400
        for field in ("name", "asset_tag", "equipment_model", "branch"):
            assert field in response.json()


@pytest.mark.django_db
class TestEquipmentList:
    def test_list_paginated(self, auth_client):
        EquipmentFactory.create_batch(3)
        response = auth_client.get(LIST_URL)
        assert response.status_code == 200
        assert "results" in response.json()
        assert response.json()["count"] == 3

    def test_filter_by_branch(self, auth_client):
        target = BranchFactory()
        EquipmentFactory.create_batch(2, branch=target)
        EquipmentFactory()
        response = auth_client.get(LIST_URL, {"branch": target.id})
        assert response.json()["count"] == 2

    def test_filter_by_status(self, auth_client):
        EquipmentFactory(status=EquipmentStatus.ACTIVE)
        EquipmentFactory(status=EquipmentStatus.IN_MAINTENANCE)
        response = auth_client.get(LIST_URL, {"status": "ACTIVE"})
        assert response.json()["count"] == 1

    def test_filter_by_equipment_model(self, auth_client):
        target_model = EquipmentModelFactory()
        EquipmentFactory.create_batch(2, equipment_model=target_model)
        EquipmentFactory()
        response = auth_client.get(LIST_URL, {"equipment_model": target_model.id})
        assert response.json()["count"] == 2

    def test_filter_by_brand(self, auth_client):
        target_brand = BrandFactory()
        m1 = EquipmentModelFactory(brand=target_brand)
        m2 = EquipmentModelFactory(brand=target_brand)
        EquipmentFactory(equipment_model=m1)
        EquipmentFactory(equipment_model=m2)
        EquipmentFactory()  # otra brand
        response = auth_client.get(LIST_URL, {"brand": target_brand.id})
        assert response.json()["count"] == 2

    def test_filter_by_purchase_date_range(self, auth_client):
        EquipmentFactory(purchase_date="2024-06-01")
        EquipmentFactory(purchase_date="2024-12-31")
        EquipmentFactory(purchase_date="2023-01-01")
        response = auth_client.get(
            LIST_URL,
            {"purchase_date_after": "2024-01-01", "purchase_date_before": "2024-12-31"},
        )
        assert response.json()["count"] == 2

    def test_search_by_asset_tag(self, auth_client):
        EquipmentFactory(asset_tag="EQ-ABC")
        EquipmentFactory(asset_tag="EQ-ZZZ")
        response = auth_client.get(LIST_URL, {"search": "ABC"})
        tags = [e["asset_tag"] for e in response.json()["results"]]
        assert "EQ-ABC" in tags

    def test_search_by_brand_name(self, auth_client):
        philips = BrandFactory(name="Philips")
        ge = BrandFactory(name="GE")
        m_philips = EquipmentModelFactory(brand=philips)
        m_ge = EquipmentModelFactory(brand=ge)
        EquipmentFactory(equipment_model=m_philips)
        EquipmentFactory(equipment_model=m_ge)
        response = auth_client.get(LIST_URL, {"search": "Philips"})
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["brand_name"] == "Philips"

    def test_search_by_equipment_model_name(self, auth_client):
        m1 = EquipmentModelFactory(name="MX450")
        m2 = EquipmentModelFactory(name="MP70")
        EquipmentFactory(equipment_model=m1)
        EquipmentFactory(equipment_model=m2)
        response = auth_client.get(LIST_URL, {"search": "MX450"})
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["equipment_model_name"] == "MX450"

    def test_ordering_by_name(self, auth_client):
        EquipmentFactory(name="Zeta")
        EquipmentFactory(name="Alfa")
        response = auth_client.get(LIST_URL, {"ordering": "name"})
        names = [e["name"] for e in response.json()["results"]]
        assert names == sorted(names)


@pytest.mark.django_db
class TestEquipmentRetrieve:
    def test_retrieve_includes_qr_code_url(self, auth_client, equipment):
        response = auth_client.get(detail_url(equipment.id))
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == equipment.id
        assert body["qr_code_url"]
        assert body["equipment_model_name"] == equipment.equipment_model.name
        assert body["brand_name"] == equipment.equipment_model.brand.name

    def test_retrieve_missing_returns_404(self, auth_client):
        assert auth_client.get(detail_url(99999)).status_code == 404


@pytest.mark.django_db
class TestEquipmentByAssetTag:
    def test_resolve_by_tag_case_insensitive(self, auth_client, equipment):
        response = auth_client.get(by_tag_url(equipment.asset_tag.lower()))
        assert response.status_code == 200
        assert response.json()["id"] == equipment.id

    def test_unknown_tag_returns_404(self, auth_client):
        assert auth_client.get(by_tag_url("DOES-NOT-EXIST")).status_code == 404


@pytest.mark.django_db
class TestEquipmentUpdate:
    def test_patch_status(self, auth_client, equipment):
        response = auth_client.patch(
            detail_url(equipment.id),
            {"status": EquipmentStatus.IN_MAINTENANCE},
            format="json",
        )
        assert response.status_code == 200
        equipment.refresh_from_db()
        assert equipment.status == EquipmentStatus.IN_MAINTENANCE

    def test_patch_with_same_asset_tag_no_duplicate_error(self, auth_client, equipment):
        response = auth_client.patch(
            detail_url(equipment.id),
            {"asset_tag": equipment.asset_tag},
            format="json",
        )
        assert response.status_code == 200

    def test_put_replaces_all_fields(self, auth_client, branch, equipment, equipment_model):
        payload = {
            "name": "Reemplazado",
            "asset_tag": "EQ-NEW",
            "equipment_model": equipment_model.id,
            "branch": branch.id,
            "location": "Quirófano",
            "purchase_date": "2024-01-01",
            "status": EquipmentStatus.ACTIVE,
        }
        response = auth_client.put(detail_url(equipment.id), payload, format="json")
        assert response.status_code == 200
        equipment.refresh_from_db()
        assert equipment.asset_tag == "EQ-NEW"
        assert equipment.location == "Quirófano"


@pytest.mark.django_db
class TestEquipmentRegenerateQr:
    def test_regenerate_replaces_file(self, auth_client, equipment):
        storage = equipment.qr_code.storage
        old_path = equipment.qr_code.name
        assert storage.exists(old_path)

        response = auth_client.post(regenerate_url(equipment.id))

        assert response.status_code == 200
        body = response.json()
        assert body["qr_code_url"]
        equipment.refresh_from_db()
        assert storage.exists(equipment.qr_code.name)

    def test_regenerate_all_covers_every_equipment(self, auth_client, branch):
        EquipmentFactory(branch=branch)
        EquipmentFactory(branch=branch)

        response = auth_client.post(REGENERATE_ALL_URL)

        assert response.status_code == 200
        assert response.json()["regenerated"] == Equipment.objects.count()
        for eq in Equipment.objects.all():
            assert eq.qr_code.storage.exists(eq.qr_code.name)

    def test_regenerate_all_missing_only(self, auth_client, branch):
        with_qr = EquipmentFactory(branch=branch)
        without_qr = EquipmentFactory(branch=branch)
        without_qr.qr_code.delete(save=True)

        response = auth_client.post(f"{REGENERATE_ALL_URL}?missing=1")

        assert response.status_code == 200
        assert response.json()["regenerated"] == 1
        without_qr.refresh_from_db()
        assert without_qr.qr_code
        del with_qr

    def test_regenerate_all_forbidden_for_tecnico(self, api_client, branch):
        from users.tests.factories import TecnicoFactory

        api_client.force_authenticate(user=TecnicoFactory())
        assert api_client.post(REGENERATE_ALL_URL).status_code == 403


@pytest.mark.django_db
class TestEquipmentDelete:
    def test_delete_204_and_removes_qr_file(self, auth_client, equipment):
        storage = equipment.qr_code.storage
        path = equipment.qr_code.name
        response = auth_client.delete(detail_url(equipment.id))
        assert response.status_code == 204
        assert not Equipment.objects.filter(pk=equipment.id).exists()
        assert not storage.exists(path)

    def test_delete_missing_returns_404(self, auth_client):
        assert auth_client.delete(detail_url(99999)).status_code == 404


@pytest.mark.django_db
class TestEquipmentRiskClass:
    def test_create_without_risk_class_defaults_to_null(self, auth_client, branch, equipment_model):
        payload = {
            "name": "Monitor",
            "asset_tag": "EQ-9001",
            "branch": branch.id,
            "equipment_model": equipment_model.id,
        }
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 201
        assert response.json()["risk_class"] is None

    def test_create_with_valid_risk_class(self, auth_client, branch, equipment_model):
        payload = {
            "name": "Desfibrilador",
            "asset_tag": "EQ-9002",
            "branch": branch.id,
            "equipment_model": equipment_model.id,
            "risk_class": "IIB",
        }
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 201
        assert response.json()["risk_class"] == "IIB"

    def test_create_with_invalid_risk_class_returns_400(self, auth_client, branch, equipment_model):
        payload = {
            "name": "X",
            "asset_tag": "EQ-9003",
            "branch": branch.id,
            "equipment_model": equipment_model.id,
            "risk_class": "X",
        }
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "risk_class" in response.json()

    def test_filter_by_risk_class(self, auth_client, branch, equipment_model):
        EquipmentFactory(branch=branch, equipment_model=equipment_model, risk_class="IIB")
        EquipmentFactory(branch=branch, equipment_model=equipment_model, risk_class="IIA")
        response = auth_client.get(LIST_URL, {"risk_class": "IIB"})
        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_filter_by_risk_class_isnull_true(self, auth_client, branch, equipment_model):
        EquipmentFactory(branch=branch, equipment_model=equipment_model, risk_class=None)
        EquipmentFactory(branch=branch, equipment_model=equipment_model, risk_class="IIA")
        response = auth_client.get(LIST_URL, {"risk_class__isnull": "true"})
        assert response.status_code == 200
        assert response.json()["count"] == 1


@pytest.mark.django_db
class TestEquipmentModelValidation:
    def test_create_with_inactive_model_returns_400(self, auth_client, branch):
        m = EquipmentModelFactory(is_active=False)
        payload = {
            "name": "X",
            "asset_tag": "EQ-9100",
            "branch": branch.id,
            "equipment_model": m.id,
        }
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "El modelo seleccionado no está activo" in response.json()["equipment_model"][0]

    def test_create_with_inactive_brand_returns_400(self, auth_client, branch):
        b = BrandFactory(is_active=False)
        m = EquipmentModelFactory(brand=b, is_active=True)
        payload = {
            "name": "X",
            "asset_tag": "EQ-9101",
            "branch": branch.id,
            "equipment_model": m.id,
        }
        response = auth_client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert (
            "La marca del modelo seleccionado no está activa"
            in response.json()["equipment_model"][0]
        )
