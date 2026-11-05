"""Comandos de gestión del inventario (`manage.py <comando>`).

- `import_equipment`: lee un CSV de equipos, hace upsert por placa
  (`asset_tag`) y crea sede, marca o modelo si aún no existen.
- `regenerate_qr`: vuelve a generar el PNG del QR hacia la hoja de
  vida del frontend (`FRONTEND_BASE_URL/admin/equipos/{id}`).
  `--missing` limita a equipos que todavía no tienen archivo QR.

No se invocan solos: hay que correrlos con el entorno Django
(Docker: `python manage.py …`).
"""
