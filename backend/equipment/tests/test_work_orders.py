from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from equipment.models import EquipmentWorkOrder
from users.tests.factories import IngenieroFactory, TecnicoFactory

pytestmark = pytest.mark.django_db

WO_LIST = reverse("equipment:equipment-work-order-list")
SP_LIST = reverse("equipment:work-order-spare-part-list")
MS_LIST = reverse("equipment:work-order-measurement-list")
EV_LIST = reverse("equipment:work-order-evidence-list")
SG_LIST = reverse("equipment:work-order-signature-list")
CO_LIST = reverse("equipment:work-order-cost-list")


def wo_detail(pk):
    return reverse("equipment:equipment-work-order-detail", args=[pk])


def wo_details_action(pk):
    return reverse("equipment:equipment-work-order-details", args=[pk])


def _wo_payload(equipment, **overrides):
    data = {
        "equipment": equipment.id,
        "number": "OT-0001",
        "service_type": "PREVENTIVE",
        "start_date": timezone.now().isoformat(),
        "description": "Mantenimiento preventivo trimestral.",
        "status": "PENDING",
    }
    data.update(overrides)
    return data


class TestWorkOrderCrud:
    def test_create_and_list(self, auth_client, equipment):
        resp = auth_client.post(WO_LIST, _wo_payload(equipment), format="json")
        assert resp.status_code == 201, resp.json()
        body = resp.json()
        assert body["equipment_asset_tag"] == equipment.asset_tag
        assert body["service_type_display"] == "Preventivo"
        assert body["status_display"] == "Pendiente"
        assert auth_client.get(WO_LIST).json()["count"] == 1

    def test_duplicate_number_returns_400(self, auth_client, equipment):
        auth_client.post(WO_LIST, _wo_payload(equipment), format="json")
        resp = auth_client.post(WO_LIST, _wo_payload(equipment), format="json")
        assert resp.status_code == 400
        assert "Ya existe una orden" in resp.json()["number"][0]

    def test_end_before_start_returns_400(self, auth_client, equipment):
        now = timezone.now()
        resp = auth_client.post(
            WO_LIST,
            _wo_payload(
                equipment,
                start_date=now.isoformat(),
                end_date=(now - timedelta(hours=2)).isoformat(),
            ),
            format="json",
        )
        assert resp.status_code == 400
        assert "end_date" in resp.json()

    def test_filter_by_equipment_and_status(self, auth_client, equipment, branch):
        from equipment.tests.factories import EquipmentFactory

        other = EquipmentFactory(branch=branch)
        auth_client.post(WO_LIST, _wo_payload(equipment, number="A-1"), format="json")
        auth_client.post(
            WO_LIST,
            _wo_payload(equipment, number="A-2", status="FINISHED"),
            format="json",
        )
        auth_client.post(WO_LIST, _wo_payload(other, number="B-1"), format="json")

        assert auth_client.get(WO_LIST, {"equipment": equipment.id}).json()["count"] == 2
        assert auth_client.get(WO_LIST, {"status": "FINISHED"}).json()["count"] == 1


class TestWorkOrderChildren:
    @pytest.fixture
    def wo(self, auth_client, equipment):
        return EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-CHILD",
            service_type="CORRECTIVE",
            start_date=timezone.now(),
            description="x",
        )

    def test_spare_part_total_cost_is_computed(self, auth_client, wo):
        resp = auth_client.post(
            SP_LIST,
            {
                "work_order": wo.id,
                "name": "Fusible",
                "reference": "F-2A",
                "quantity": 3,
                "unit_cost": "1500.00",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["total_cost"] == "4500.00"
        details = auth_client.get(wo_details_action(wo.id)).json()
        assert details["cost"]["spare_parts_cost"] == "4500.00"
        assert details["cost"]["total"] == "4500.00"

    def test_details_action_nests_children(self, auth_client, wo):
        auth_client.post(
            SP_LIST,
            {"work_order": wo.id, "name": "P", "reference": "R", "quantity": 1,
             "unit_cost": "10.00"},
            format="json",
        )
        auth_client.post(
            MS_LIST,
            {"work_order": wo.id, "parameter": "Temperatura", "expected_value": "37",
             "measured_value": "37.1", "unit": "C", "passed": True},
            format="json",
        )
        auth_client.post(
            SG_LIST,
            {"work_order": wo.id, "role": "TECHNICIAN", "signed_by": "Juan P."},
            format="json",
        )

        body = auth_client.get(wo_details_action(wo.id)).json()
        assert len(body["spare_parts"]) == 1
        assert len(body["measurements"]) == 1
        assert len(body["signatures"]) == 1
        assert body["evidences"] == []
        # El costo de repuestos se calcula solo al agregar líneas.
        assert body["cost"]["spare_parts_cost"] == "10.00"
        cost_id = body["cost"]["id"]
        cost_url = reverse("equipment:work-order-cost-detail", args=[cost_id])
        patched = auth_client.patch(
            cost_url, {"labor_cost": "50000"}, format="json"
        )
        assert patched.status_code == 200
        assert patched.json()["labor_cost"] == "50000.00"
        assert patched.json()["spare_parts_cost"] == "10.00"

    def test_filter_children_by_work_order(self, auth_client, wo, equipment):
        other = EquipmentWorkOrder.objects.create(
            equipment=equipment, number="OT-OTHER", service_type="PREVENTIVE",
            start_date=timezone.now(), description="y",
        )
        auth_client.post(
            MS_LIST,
            {"work_order": wo.id, "parameter": "P1", "expected_value": "1",
             "measured_value": "1", "unit": "u", "passed": True},
            format="json",
        )
        auth_client.post(
            MS_LIST,
            {"work_order": other.id, "parameter": "P2", "expected_value": "2",
             "measured_value": "2", "unit": "u", "passed": True},
            format="json",
        )
        assert auth_client.get(MS_LIST, {"work_order": wo.id}).json()["count"] == 1


class TestWorkOrderPermissions:
    def test_tecnico_cannot_create(self, api_client, equipment):
        api_client.force_authenticate(user=TecnicoFactory())
        created = api_client.post(WO_LIST, _wo_payload(equipment), format="json")
        assert created.status_code == status.HTTP_403_FORBIDDEN

    def test_tecnico_cannot_delete(self, api_client, equipment):
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment, number="OT-DEL", service_type="PREVENTIVE",
            start_date=timezone.now(), description="z",
        )
        api_client.force_authenticate(user=TecnicoFactory())
        assert api_client.delete(wo_detail(wo.id)).status_code == (
            status.HTTP_403_FORBIDDEN
        )


class TestWorkOrderScopedByRole:
    """Técnico e ingeniero solo ven/editan las órdenes que tienen asignadas."""

    def _wo(self, equipment, number, technician=None):
        return EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number=number,
            service_type="PREVENTIVE",
            start_date=timezone.now(),
            description="x",
            technician=technician,
        )

    def test_field_role_only_sees_own_orders(self, api_client, equipment):
        ing = IngenieroFactory()
        self._wo(equipment, "OT-MIA", technician=ing)
        self._wo(equipment, "OT-AJENA", technician=TecnicoFactory())
        self._wo(equipment, "OT-SIN")

        api_client.force_authenticate(user=ing)
        assert api_client.get(WO_LIST).json()["count"] == 1

    def test_management_sees_all_orders(self, auth_client, equipment):
        self._wo(equipment, "OT-A", technician=TecnicoFactory())
        self._wo(equipment, "OT-B")

        assert auth_client.get(WO_LIST).json()["count"] == 2

    def test_field_role_created_order_is_self_assigned(self, api_client, equipment):
        ing = IngenieroFactory()
        api_client.force_authenticate(user=ing)

        created = api_client.post(
            WO_LIST, _wo_payload(equipment, number="OT-AUTO"), format="json"
        )

        assert created.status_code == 201
        assert created.json()["technician"] == ing.id
        assert api_client.get(WO_LIST).json()["count"] == 1

    def test_field_role_cannot_touch_others_order(self, api_client, equipment):
        wo = self._wo(equipment, "OT-OTRO", technician=TecnicoFactory())
        api_client.force_authenticate(user=IngenieroFactory())

        # No la ve...
        assert api_client.get(wo_detail(wo.id)).status_code == 404
        # ...ni puede colgarle un repuesto.
        resp = api_client.post(
            SP_LIST,
            {
                "work_order": wo.id,
                "name": "Fusible",
                "reference": "F-1",
                "quantity": 1,
                "unit_cost": "1000.00",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_field_role_can_work_on_own_order_children(self, api_client, equipment):
        ing = IngenieroFactory()
        wo = self._wo(equipment, "OT-PROPIA", technician=ing)
        api_client.force_authenticate(user=ing)

        resp = api_client.post(
            SP_LIST,
            {
                "work_order": wo.id,
                "name": "Empaque",
                "reference": "E-9",
                "quantity": 2,
                "unit_cost": "5000.00",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert api_client.get(SP_LIST, {"work_order": wo.id}).json()["count"] == 1


def wo_complete(pk):
    return reverse("equipment:equipment-work-order-complete", args=[pk])


class TestWorkOrderCompleteCreatesFailure:
    def test_complete_without_failure_fields_leaves_no_report(
        self, auth_client, equipment
    ):
        from failures.models import FailureRecord

        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-NOFAIL",
            service_type="PREVENTIVE",
            start_date=timezone.now(),
            description="Preventivo",
        )
        resp = auth_client.post(
            wo_complete(wo.id),
            {"observations": "Preventivo realizado."},
            format="json",
        )
        assert resp.status_code == 200
        wo.refresh_from_db()
        assert wo.status == "FINISHED"
        assert wo.end_date is not None
        assert resp.json()["end_date"] is not None
        assert FailureRecord.objects.count() == 0

    def test_finish_with_future_start_still_sets_end_date(
        self, auth_client, equipment
    ):
        start = timezone.now() + timedelta(days=3)
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-FUTURE",
            service_type="PREVENTIVE",
            start_date=start,
            description="Programado a futuro",
        )
        resp = auth_client.patch(
            wo_detail(wo.id),
            {"status": "FINISHED"},
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        wo.refresh_from_db()
        assert wo.status == "FINISHED"
        assert wo.end_date is not None
        assert wo.end_date < wo.start_date

    def test_engineer_complete_creates_resolved_failure(
        self, api_client, equipment
    ):
        from failures.models import FailureRecord, FailureSeverity

        ing = IngenieroFactory()
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-FAIL",
            service_type="CORRECTIVE",
            start_date=timezone.now(),
            description="No enciende",
            technician=ing,
            status="IN_PROGRESS",
        )
        api_client.force_authenticate(user=ing)
        resp = api_client.post(
            wo_complete(wo.id),
            {
                "observations": "Se cambió fusible.",
                "failure_description": "Equipo no enciende",
                "failure_severity": "HIGH",
                "failure_resolution_notes": "Se cambió fusible.",
            },
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        wo.refresh_from_db()
        assert wo.status == "FINISHED"
        fail = FailureRecord.objects.get()
        assert fail.equipment_id == equipment.id
        assert fail.reported_by_id == ing.id
        assert fail.description == "Equipo no enciende"
        assert fail.severity == FailureSeverity.HIGH
        assert fail.resolved is True
        assert fail.resolved_at is not None
        assert fail.resolution_notes == "Se cambió fusible."

    def test_complete_does_not_duplicate_failure_on_second_call(
        self, api_client, equipment
    ):
        from failures.models import FailureRecord

        ing = IngenieroFactory()
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-DUP",
            service_type="CORRECTIVE",
            start_date=timezone.now(),
            description="Falla",
            technician=ing,
            status="IN_PROGRESS",
        )
        api_client.force_authenticate(user=ing)
        payload = {
            "observations": "Listo.",
            "failure_description": "Falla",
            "failure_severity": "MEDIUM",
        }
        assert api_client.post(wo_complete(wo.id), payload, format="json").status_code == 200
        assert api_client.post(wo_complete(wo.id), payload, format="json").status_code == 200
        assert FailureRecord.objects.count() == 1

    def test_invalid_severity_does_not_finish_order(self, auth_client, equipment):
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-BADSEV",
            service_type="CORRECTIVE",
            start_date=timezone.now(),
            description="x",
        )
        resp = auth_client.post(
            wo_complete(wo.id),
            {
                "observations": "Diagnóstico.",
                "failure_description": "Algo",
                "failure_severity": "NOPE",
            },
            format="json",
        )
        assert resp.status_code == 400
        wo.refresh_from_db()
        assert wo.status == "PENDING"

    def test_complete_requires_resolution_notes(self, auth_client, equipment):
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-NONOTES",
            service_type="PREVENTIVE",
            start_date=timezone.now(),
            description="x",
        )
        resp = auth_client.post(wo_complete(wo.id), {}, format="json")
        assert resp.status_code == 400
        wo.refresh_from_db()
        assert wo.status == "PENDING"

    def test_in_progress_does_not_finish(self, auth_client, equipment):
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-PROG",
            service_type="PREVENTIVE",
            start_date=timezone.now(),
            description="x",
        )
        resp = auth_client.post(
            wo_complete(wo.id),
            {"observations": "Empecé el trabajo.", "status": "IN_PROGRESS"},
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        wo.refresh_from_db()
        assert wo.status == "IN_PROGRESS"
        assert wo.end_date is None

    def test_engineer_cannot_finish_from_pending(self, api_client, equipment):
        ing = IngenieroFactory()
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-JUMP",
            service_type="CORRECTIVE",
            start_date=timezone.now(),
            description="x",
            technician=ing,
            status="PENDING",
        )
        api_client.force_authenticate(user=ing)
        resp = api_client.post(
            wo_complete(wo.id),
            {"observations": "Listo.", "status": "FINISHED"},
            format="json",
        )
        assert resp.status_code == 400
        wo.refresh_from_db()
        assert wo.status == "PENDING"

