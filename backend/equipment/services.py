from io import BytesIO
from typing import cast

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from qrcode.image.pil import PilImage

from .models import Equipment


def build_qr_payload(equipment: Equipment) -> str:
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    return f"{base}/admin/equipos/{equipment.id}"


def generate_qr_for_equipment(equipment: Equipment) -> None:
    """Genera el PNG del QR para `equipment` y lo guarda en `equipment.qr_code`.

    El payload codificado apunta al detalle del equipo en el frontend usando
    `id` (inmutable) en vez de `asset_tag`, así un re-etiquetado no invalida
    QRs ya impresos.
    """
    payload = build_qr_payload(equipment)
    img = cast(PilImage, qrcode.make(payload))

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    filename = f"equipment_{equipment.id}.png"
    equipment.qr_code.save(filename, ContentFile(buffer.read()), save=False)
    equipment.save(update_fields=["qr_code", "updated_at"])
