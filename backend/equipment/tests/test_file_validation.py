import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from equipment.models import AttachmentType, EvidenceType, WorkOrderType
from users.tests.factories import UserFactory

ATTACHMENTS_URL = reverse("equipment:equipment-attachment-list")
CERTIFICATES_URL = reverse("equipment:equipment-certificate-list")
WORK_ORDERS_URL = reverse("equipment:equipment-work-order-list")
EVIDENCES_URL = reverse("equipment:work-order-evidence-list")


def _pdf_file(name="doc.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4\n%mock pdf for tests\n", content_type="application/pdf")


def _png_file(name="photo.png"):
    return SimpleUploadedFile(name, b"\x89PNG\r\n\x1a\n" + b"0" * 32, content_type="image/png")


def _oversized_png_file(name="huge.png"):
    # El límite para png es 8 MB; generamos 8 MB + 1 byte con la firma correcta.
    content = b"\x89PNG\r\n\x1a\n" + (b"0" * (8 * 1024 * 1024 + 1))
    return SimpleUploadedFile(name, content, content_type="image/png")


def _fake_exe_file(name="malware.exe"):
    return SimpleUploadedFile(name, b"MZ\x90\x00fake-exe", content_type="application/octet-stream")


def _mismatched_pdf_file(name="fake.pdf"):
    # Extensión .pdf pero contenido que no empieza con "%PDF-".
    return SimpleUploadedFile(name, b"esto no es un pdf de verdad", content_type="application/pdf")


@pytest.mark.django_db
class TestEquipmentAttachmentFileValidation:
    def test_rejects_disallowed_extension(self, auth_client, equipment):
        response = auth_client.post(
            ATTACHMENTS_URL,
            {
                "equipment": equipment.id,
                "attachment_type": AttachmentType.MANUAL,
                "title": "Manual",
                "file": _fake_exe_file(),
            },
            format="multipart",
        )
        assert response.status_code == 400
        assert "file" in response.json()

    def test_rejects_content_that_does_not_match_extension(self, auth_client, equipment):
        response = auth_client.post(
            ATTACHMENTS_URL,
            {
                "equipment": equipment.id,
                "attachment_type": AttachmentType.MANUAL,
                "title": "Manual",
                "file": _mismatched_pdf_file(),
            },
            format="multipart",
        )
        assert response.status_code == 400
        assert "file" in response.json()

    def test_rejects_oversized_file(self, auth_client, equipment):
        response = auth_client.post(
            ATTACHMENTS_URL,
            {
                "equipment": equipment.id,
                "attachment_type": AttachmentType.PHOTO,
                "title": "Foto",
                "file": _oversized_png_file(),
            },
            format="multipart",
        )
        assert response.status_code == 400
        assert "file" in response.json()

    def test_accepts_valid_file_and_forces_uploaded_by_to_request_user(
        self, auth_client, admin_user, equipment
    ):
        other_user = UserFactory()

        response = auth_client.post(
            ATTACHMENTS_URL,
            {
                "equipment": equipment.id,
                "attachment_type": AttachmentType.CERTIFICATE,
                "title": "Certificado",
                "file": _pdf_file(),
                # Intento de spoofing: el cliente manda un uploaded_by ajeno.
                "uploaded_by": other_user.id,
            },
            format="multipart",
        )

        assert response.status_code == 201
        assert response.json()["uploaded_by"] == admin_user.id
        assert response.json()["uploaded_by"] != other_user.id


@pytest.mark.django_db
class TestEquipmentLifeSheetPdfValidation:
    def test_rejects_non_pdf(self, auth_client, branch, equipment_model):
        payload = {
            "name": "Ventilador",
            "asset_tag": "EQ-9001",
            "equipment_model": equipment_model.id,
            "branch": branch.id,
            "life_sheet_pdf": _fake_exe_file(),
        }
        response = auth_client.post(
            reverse("equipment:equipment-list"), payload, format="multipart"
        )
        assert response.status_code == 400
        assert "life_sheet_pdf" in response.json()

    def test_accepts_valid_pdf(self, auth_client, branch, equipment_model):
        payload = {
            "name": "Ventilador",
            "asset_tag": "EQ-9002",
            "equipment_model": equipment_model.id,
            "branch": branch.id,
            "life_sheet_pdf": _pdf_file(),
        }
        response = auth_client.post(
            reverse("equipment:equipment-list"), payload, format="multipart"
        )
        assert response.status_code == 201


@pytest.mark.django_db
class TestEquipmentCertificateFileValidation:
    def test_rejects_non_pdf_non_image(self, auth_client, equipment):
        response = auth_client.post(
            CERTIFICATES_URL,
            {
                "equipment": equipment.id,
                "certificate_number": "CERT-1",
                "certificate_date": "2026-01-01",
                "responsible": "Juan",
                "file": _fake_exe_file(),
            },
            format="multipart",
        )
        assert response.status_code == 400
        assert "file" in response.json()

    def test_accepts_valid_pdf(self, auth_client, equipment):
        response = auth_client.post(
            CERTIFICATES_URL,
            {
                "equipment": equipment.id,
                "certificate_number": "CERT-2",
                "certificate_date": "2026-01-01",
                "responsible": "Juan",
                "file": _pdf_file(),
            },
            format="multipart",
        )
        assert response.status_code == 201


@pytest.mark.django_db
class TestWorkOrderReportAndEvidenceValidation:
    def test_work_order_report_rejects_non_pdf(self, auth_client, equipment):
        response = auth_client.post(
            WORK_ORDERS_URL,
            {
                "equipment": equipment.id,
                "number": "OT-1",
                "service_type": WorkOrderType.PREVENTIVE,
                "start_date": "2026-01-01T08:00:00Z",
                "description": "Mantenimiento preventivo",
                "report": _fake_exe_file(),
            },
            format="multipart",
        )
        assert response.status_code == 400
        assert "report" in response.json()

    def test_evidence_rejects_disallowed_extension(self, auth_client, equipment):
        work_order = auth_client.post(
            WORK_ORDERS_URL,
            {
                "equipment": equipment.id,
                "number": "OT-2",
                "service_type": WorkOrderType.PREVENTIVE,
                "start_date": "2026-01-01T08:00:00Z",
                "description": "Mantenimiento preventivo",
            },
            format="multipart",
        ).json()

        response = auth_client.post(
            EVIDENCES_URL,
            {
                "work_order": work_order["id"],
                "evidence_type": EvidenceType.PHOTO,
                "description": "Antes del mantenimiento",
                "file": _fake_exe_file(),
            },
            format="multipart",
        )
        assert response.status_code == 400
        assert "file" in response.json()

    def test_evidence_accepts_valid_photo(self, auth_client, equipment):
        work_order = auth_client.post(
            WORK_ORDERS_URL,
            {
                "equipment": equipment.id,
                "number": "OT-3",
                "service_type": WorkOrderType.PREVENTIVE,
                "start_date": "2026-01-01T08:00:00Z",
                "description": "Mantenimiento preventivo",
            },
            format="multipart",
        ).json()

        response = auth_client.post(
            EVIDENCES_URL,
            {
                "work_order": work_order["id"],
                "evidence_type": EvidenceType.PHOTO,
                "description": "Antes del mantenimiento",
                "file": _png_file(),
            },
            format="multipart",
        )
        assert response.status_code == 201
