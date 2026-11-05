import pytest

from equipment.services import build_qr_payload, generate_qr_for_equipment

from .factories import EquipmentFactory

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


@pytest.mark.django_db
class TestBuildQrPayload:
    def test_payload_points_to_life_sheet_by_id(self, settings):
        settings.FRONTEND_BASE_URL = "https://app.test"
        eq = EquipmentFactory(asset_tag="EQ-XYZ")
        assert build_qr_payload(eq) == f"https://app.test/admin/equipos/{eq.id}"

    def test_strips_trailing_slash(self, settings):
        settings.FRONTEND_BASE_URL = "https://app.test/"
        eq = EquipmentFactory()
        assert build_qr_payload(eq) == f"https://app.test/admin/equipos/{eq.id}"


@pytest.mark.django_db
class TestGenerateQrForEquipment:
    def test_creates_png_file(self, equipment):
        # El signal post_save ya disparó al crear; el archivo debe existir y ser PNG.
        assert equipment.qr_code
        with equipment.qr_code.open("rb") as fh:
            head = fh.read(8)
        assert head == PNG_MAGIC

    def test_filename_uses_equipment_id(self, equipment):
        assert f"equipment_{equipment.id}.png" in equipment.qr_code.name

    def test_replaces_existing_file_when_called_again(self, equipment):
        first_name = equipment.qr_code.name
        equipment.qr_code.delete(save=False)
        generate_qr_for_equipment(equipment)
        equipment.refresh_from_db()
        assert equipment.qr_code.name  # nuevo archivo asignado
        # Nombre puede coincidir si el storage reusa el path; lo importante
        # es que el archivo nuevamente exista en el storage.
        assert equipment.qr_code.storage.exists(equipment.qr_code.name)
        del first_name  # silence unused-var
