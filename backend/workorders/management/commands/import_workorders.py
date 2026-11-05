"""Importa órdenes de trabajo desde un CSV.

Uso (igual que import_equipment / import_users, incluido dentro de Docker):
    python manage.py import_workorders ruta/al/archivo.csv
    docker compose exec web python manage.py import_workorders ruta/al/archivo.csv

Cabeceras esperadas (el orden no importa, se leen por nombre):
    number, asset_tag, service_type, start_date, description   (obligatorias)
    end_date, technician, status, cancel_reason   (opcionales)

- number es el número real de la orden (EquipmentWorkOrder.number, único en
  el modelo) — a diferencia de import_failures/import_maintenance/
  import_schedules, aquí sí hay un identificador de negocio real, así que
  el upsert es simplemente por number (case-insensitive, igual que
  EquipmentWorkOrderSerializer.validate_number).
- asset_tag identifica el equipo (Equipment.asset_tag). Si no existe, la
  fila se omite — este comando no crea equipos (eso es import_equipment).
- service_type acepta el código del modelo (PREVENTIVE/CORRECTIVE/
  CALIBRATION/INSTALLATION/INSPECTION) o su etiqueta en español.
- status acepta el código del modelo (PENDING/IN_PROGRESS/FINISHED/
  CANCELLED) o su etiqueta en español. Por defecto PENDING, igual que el
  modelo.
- technician es el username del responsable (opcional). Si no existe, se
  deja sin asignar — el modelo no exige un rol en particular para este
  campo (a diferencia de assigned_engineer/assigned_technician en
  mantenimiento/solicitudes).
- No se importan `report` (adjunto), `schedule` ni `maintenance_record`
  (vínculos con una solicitud/mantenimiento de origen): quedan fuera del
  alcance de un CSV, igual que pdf_file en import_maintenance. Tampoco se
  importan las líneas de detalle de la orden (repuestos, mediciones,
  evidencias, firmas, costos) — son tablas propias con su propia forma,
  no encajan en una fila por orden.
- --dry-run: procesa el archivo sin escribir en la base de datos.
"""

from __future__ import annotations

import csv
from datetime import UTC, datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from equipment.models import Equipment, EquipmentWorkOrder, WorkOrderStatus, WorkOrderType
from users.models import User

_SERVICE_TYPE_MAP = {
    "PREVENTIVE": WorkOrderType.PREVENTIVE,
    "PREVENTIVO": WorkOrderType.PREVENTIVE,
    "CORRECTIVE": WorkOrderType.CORRECTIVE,
    "CORRECTIVO": WorkOrderType.CORRECTIVE,
    "CALIBRATION": WorkOrderType.CALIBRATION,
    "CALIBRACION": WorkOrderType.CALIBRATION,
    "CALIBRACIÓN": WorkOrderType.CALIBRATION,
    "INSTALLATION": WorkOrderType.INSTALLATION,
    "INSTALACION": WorkOrderType.INSTALLATION,
    "INSTALACIÓN": WorkOrderType.INSTALLATION,
    "INSPECTION": WorkOrderType.INSPECTION,
    "INSPECCION": WorkOrderType.INSPECTION,
    "INSPECCIÓN": WorkOrderType.INSPECTION,
}

_STATUS_MAP = {
    "PENDING": WorkOrderStatus.PENDING,
    "PENDIENTE": WorkOrderStatus.PENDING,
    "IN_PROGRESS": WorkOrderStatus.IN_PROGRESS,
    "EN PROCESO": WorkOrderStatus.IN_PROGRESS,
    "FINISHED": WorkOrderStatus.FINISHED,
    "TERMINADA": WorkOrderStatus.FINISHED,
    "CANCELLED": WorkOrderStatus.CANCELLED,
    "CANCELADA": WorkOrderStatus.CANCELLED,
}

_DATETIME_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%Y-%m-%d",
    "%d/%m/%Y",
)


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _col(row: dict[str, str], *names: str) -> str:
    for name in names:
        if name in row and row[name] is not None:
            return row[name]
    return ""


def _service_type(value: str | None) -> str | None:
    return _SERVICE_TYPE_MAP.get(_clean(value).upper())


def _status(value: str | None) -> str | None:
    text = _clean(value)
    if not text:
        return WorkOrderStatus.PENDING
    return _STATUS_MAP.get(text.upper())


def _parse_datetime(value: str | None) -> datetime | None:
    text = _clean(value)
    if not text:
        return None
    for fmt in _DATETIME_FORMATS:
        try:
            # tzinfo explícito: igual que import_equipment._parse_datetime,
            # para que Postgres no reciba un datetime naive (USE_TZ=True).
            return datetime.strptime(text, fmt).replace(tzinfo=UTC)
        except ValueError:
            continue
    return None


class Command(BaseCommand):
    help = "Importa órdenes de trabajo desde un CSV."

    def add_arguments(self, parser) -> None:
        parser.add_argument("csv_path", type=str)
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Procesa el archivo sin escribir en la base de datos.",
        )

    def handle(self, *args, **options) -> None:
        path = Path(options["csv_path"])
        if not path.exists():
            raise CommandError(f"No existe el archivo: {path}")

        with path.open(encoding="utf-8-sig", newline="") as fh:
            rows = list(csv.DictReader(fh))

        if not rows:
            raise CommandError("El CSV no tiene filas.")

        created = updated = skipped = 0
        equipment_cache: dict[str, Equipment] = {}
        user_cache: dict[str, User | None] = {}

        def _resolve_equipment(asset_tag: str) -> Equipment | None:
            key = asset_tag.upper()
            if key not in equipment_cache:
                eq = Equipment.objects.filter(asset_tag__iexact=asset_tag).first()
                if eq is not None:
                    equipment_cache[key] = eq
                return eq
            return equipment_cache[key]

        def _resolve_user(username: str) -> User | None:
            if not username:
                return None
            if username not in user_cache:
                user_cache[username] = User.objects.filter(username=username).first()
            return user_cache[username]

        try:
            with transaction.atomic():
                for i, row in enumerate(rows, start=2):
                    row = {(k or "").strip(): v for k, v in row.items()}

                    number = _clean(_col(row, "number", "NUMBER", "NUMERO", "NÚMERO"))
                    asset_tag = _clean(_col(row, "asset_tag", "ASSET_TAG"))
                    service_type = _service_type(
                        _col(row, "service_type", "SERVICE_TYPE", "TIPO")
                    )
                    start_date = _parse_datetime(
                        _col(row, "start_date", "START_DATE")
                    )
                    description = _clean(_col(row, "description", "DESCRIPTION"))

                    if (
                        not number
                        or not asset_tag
                        or service_type is None
                        or start_date is None
                        or not description
                    ):
                        self.stderr.write(
                            f"  fila {i}: faltan datos obligatorios (number/asset_tag/"
                            "service_type/start_date/description), omitida"
                        )
                        skipped += 1
                        continue

                    status = _status(_col(row, "status", "STATUS", "ESTADO"))
                    if status is None:
                        self.stderr.write(
                            f"  fila {i}: estado desconocido "
                            f"'{_col(row, 'status', 'STATUS', 'ESTADO')}', omitida"
                        )
                        skipped += 1
                        continue

                    equipment = _resolve_equipment(asset_tag)
                    if equipment is None:
                        self.stderr.write(
                            f"  fila {i}: equipo '{asset_tag}' no encontrado, omitida"
                        )
                        skipped += 1
                        continue

                    technician_username = _clean(
                        _col(row, "technician", "TECHNICIAN")
                    )
                    technician = _resolve_user(technician_username)
                    if technician_username and technician is None:
                        self.stderr.write(
                            f"  fila {i}: técnico '{technician_username}' no existe, "
                            "sin asignar"
                        )

                    fields = {
                        "equipment": equipment,
                        "service_type": service_type,
                        "start_date": start_date,
                        "end_date": _parse_datetime(_col(row, "end_date", "END_DATE")),
                        "description": description,
                        "technician": technician,
                        "status": status,
                        "cancel_reason": _clean(
                            _col(row, "cancel_reason", "CANCEL_REASON")
                        ),
                    }

                    _, was_created = EquipmentWorkOrder.objects.update_or_create(
                        number__iexact=number,
                        defaults={**fields, "number": number},
                    )
                    if was_created:
                        created += 1
                    else:
                        updated += 1

                if options["dry_run"]:
                    self.stdout.write(self.style.WARNING("DRY-RUN: revirtiendo."))
                    transaction.set_rollback(True)
        except Exception as exc:  # noqa: BLE001
            raise CommandError(f"Import abortado: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Creados: {created}  ·  Actualizados: {updated}  ·  Omitidos: {skipped}"
            )
        )
