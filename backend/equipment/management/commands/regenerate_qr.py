"""(Re)genera el PNG del código QR de los equipos.

Uso:
    python manage.py regenerate_qr              # todos los equipos
    python manage.py regenerate_qr --missing    # solo los que no tienen QR
    docker compose exec web python manage.py regenerate_qr
    docker compose exec web python manage.py regenerate_qr --missing


El payload del QR apunta a la hoja de vida del equipo en el frontend
(FRONTEND_BASE_URL/admin/equipos/<id>), así que hay que re-ejecutarlo si
cambia FRONTEND_BASE_URL o la ruta del frontend.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from ...models import Equipment


class Command(BaseCommand):
    help = "Regenera el código QR de los equipos biomédicos."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--missing",
            action="store_true",
            help="Solo genera el QR de los equipos que aún no tienen uno.",
        )

    def handle(self, *args, **options) -> None:
        from ...services import generate_qr_for_equipment
        queryset = Equipment.objects.all().order_by("asset_tag")
        if options["missing"]:
            queryset = queryset.filter(qr_code="")

        total = queryset.count()
        if not total:
            self.stdout.write(self.style.WARNING("No hay equipos que procesar."))
            return

        done = 0
        for equipment in queryset.iterator():
            if equipment.qr_code:
                equipment.qr_code.delete(save=False)
            generate_qr_for_equipment(equipment)
            done += 1
            if done % 25 == 0:
                self.stdout.write(f"  {done}/{total}...")

        self.stdout.write(self.style.SUCCESS(f"QR regenerados: {done}/{total}"))
