"""
Tests específicos para el manejo del archivo PDF en MaintenanceRecord:
- Subida válida (multipart con .pdf)
- Rechazo de extensiones no permitidas (.txt)
- Rechazo de tamaño > 10 MB (mockeando .size en la instancia)
- Replace en PATCH borra el archivo anterior del storage
- Delete del registro borra el archivo del storage (signal pre_delete)
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from maintenance.models import MaintenanceKind, MaintenanceRecord

from .factories import MaintenanceRecordFactory

pytestmark = pytest.mark.django_db


LIST_URL = reverse("maintenance:record-list")


def detail_url(pk: int) -> str:
    return reverse("maintenance:record-detail", args=[pk])


def _pdf_file(
    name: str = "report.pdf", content: bytes = b"%PDF-1.4 fake content"
) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, content, content_type="application/pdf")


def _txt_file(name: str = "report.txt", content: bytes = b"plain text") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, content, content_type="text/plain")


class TestPdfUploadCreate:
    def _payload(self, equipment, **overrides):
        data = {
            "equipment": equipment.id,
            "kind": MaintenanceKind.CORRECTIVE,
            "date": "2026-01-20",
            "description": "Cambio de batería",
            "technician": "Maria Lopez",
            "cost": "420000.00",
        }
        data.update(overrides)
        return data

    def test_upload_valid_pdf_returns_201(self, auth_client, equipment):
        payload = self._payload(equipment)
        payload["pdf_file"] = _pdf_file()

        response = auth_client.post(LIST_URL, payload, format="multipart")

        assert response.status_code == 201
        body = response.json()
        assert body["pdf_file"]
        assert body["pdf_file_url"]
        record = MaintenanceRecord.objects.get(pk=body["id"])
        assert record.pdf_file
        assert record.pdf_file.storage.exists(record.pdf_file.name)

    def test_upload_non_pdf_extension_returns_400(self, auth_client, equipment):
        payload = self._payload(equipment)
        payload["pdf_file"] = _txt_file()

        response = auth_client.post(LIST_URL, payload, format="multipart")

        assert response.status_code == 400
        body = response.json()
        assert "pdf_file" in body
        # FileExtensionValidator menciona la extensión inválida; verificamos que el campo falla.
        assert any("pdf" in str(msg).lower() for msg in body["pdf_file"])

    def test_upload_oversize_pdf_returns_400(self, auth_client, equipment):
        # Generamos un payload PDF >10 MB para gatillar la validación.
        # 11 MB cabe sin problema en memoria de test y evita mockear internals
        # (DRF re-lee .size en varios puntos cuando el archivo se procesa como
        # InMemoryUploadedFile / TemporaryUploadedFile).
        oversize_bytes = b"%PDF-1.4 " + (b"x" * (11 * 1024 * 1024))
        payload = self._payload(equipment)
        payload["pdf_file"] = SimpleUploadedFile(
            "huge.pdf", oversize_bytes, content_type="application/pdf"
        )

        response = auth_client.post(LIST_URL, payload, format="multipart")

        assert response.status_code == 400
        body = response.json()
        assert "pdf_file" in body
        assert "El archivo no puede superar los 10 MB." in body["pdf_file"][0]


class TestPdfReplaceOnPatch:
    # El borrado del PDF anterior se agenda con transaction.on_commit (ver
    # update() en el serializer) para no borrar el archivo físico si la
    # transacción de la request termina revirtiendo. Con el django_db normal
    # (module-level, arriba) cada test corre dentro de un rollback y ese
    # commit real nunca ocurre, así que el callback jamás se dispara y el
    # archivo "viejo" sigue apareciendo en el storage. transaction=True hace
    # que el test cometa de verdad, como pasaría en producción.
    pytestmark = pytest.mark.django_db(transaction=True)

    def test_patch_with_new_pdf_replaces_previous_file(self, auth_client, equipment):
        record = MaintenanceRecordFactory(
            equipment=equipment, pdf_file=_pdf_file("old.pdf", b"%PDF-1.4 old")
        )
        storage = record.pdf_file.storage
        old_path = record.pdf_file.name
        assert storage.exists(old_path)

        response = auth_client.patch(
            detail_url(record.id),
            {"pdf_file": _pdf_file("new.pdf", b"%PDF-1.4 new")},
            format="multipart",
        )

        assert response.status_code == 200
        record.refresh_from_db()
        assert record.pdf_file.name != old_path
        assert storage.exists(record.pdf_file.name)
        assert not storage.exists(old_path)


class TestPdfDeleteOnRecordDelete:
    # Ver comentario en TestPdfReplaceOnPatch: remove_pdf_file (signals.py)
    # también borra vía transaction.on_commit.
    pytestmark = pytest.mark.django_db(transaction=True)

    def test_delete_record_removes_pdf_from_storage(self, auth_client, equipment):
        record = MaintenanceRecordFactory(equipment=equipment, pdf_file=_pdf_file("to_delete.pdf"))
        storage = record.pdf_file.storage
        path = record.pdf_file.name
        assert storage.exists(path)

        response = auth_client.delete(detail_url(record.id))

        assert response.status_code == 204
        assert not MaintenanceRecord.objects.filter(pk=record.id).exists()
        assert not storage.exists(path)

    def test_delete_record_without_pdf_does_not_error(self, auth_client, equipment):
        record = MaintenanceRecordFactory(equipment=equipment)
        assert not record.pdf_file

        response = auth_client.delete(detail_url(record.id))

        assert response.status_code == 204
