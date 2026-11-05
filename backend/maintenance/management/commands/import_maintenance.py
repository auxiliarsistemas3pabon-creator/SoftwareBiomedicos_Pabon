"""Importa registros de mantenimiento desde un CSV.

Uso (igual que import_equipment / import_users, incluido dentro de Docker):
    python manage.py import_maintenance ruta/al/archivo.csv
    docker compose exec web python manage.py import_maintenance ruta/al/archivo.csv

Cabeceras esperadas (el orden no importa, se leen por nombre):
    asset_tag, kind, date, description   (obligatorias)
    observations, technician, assigned_engineer, assigned_technician, cost
    (opcionales)

- asset_tag identifica el equipo (Equipment.asset_tag). Si no existe, la
  fila se omite — este comando no crea equipos (eso es import_equipment).
- kind acepta el código del modelo (PREVENTIVE/CORRECTIVE/REPAIR/
  CALIBRATION/INSPECTION) o su etiqueta en español.
- assigned_engineer / assigned_technician son el username del responsable.
  Si el usuario no existe, no tiene el rol correcto (ingeniero/tecnico) o
  está inactivo, se deja sin asignar — igual que ya exige
  MaintenanceRecordSerializer.validate_assigned_engineer/_technician — no
  se rompe la fila completa por eso.
- No se importa `pdf_file` (adjunto) ni `scheduled_maintenance` (vínculo con
  una solicitud): ambos quedan fuera del alcance de un CSV.
- El upsert es por (equipo, fecha, tipo): re-ejecutar con un archivo más
  completo actualiza el registro existente sin duplicar. A diferencia de
  asset_tag/username, esto no es un identificador real del negocio (un
  mantenimiento no trae uno) — es la mejor aproximación disponible.
- --dry-run: procesa el archivo sin escribir en la base de datos.
"""

from __future__ import annotations

import csv
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from equipment.models import Equipment
from users.models import User

from ...models import MaintenanceKind, MaintenanceRecord

_KIND_MAP = {
    "PREVENTIVE": MaintenanceKind.PREVENTIVE,
    "PREVENTIVO": MaintenanceKind.PREVENTIVE,
    "MANTENIMIENTO PREVENTIVO": MaintenanceKind.PREVENTIVE,
    "CORRECTIVE": MaintenanceKind.CORRECTIVE,
    "CORRECTIVO": MaintenanceKind.CORRECTIVE,
    "MANTENIMIENTO CORRECTIVO": MaintenanceKind.CORRECTIVE,
    "REPAIR": MaintenanceKind.REPAIR,
    "REPARACION": MaintenanceKind.REPAIR,
    "REPARACIÓN": MaintenanceKind.REPAIR,
    "REPARACION MAYOR": MaintenanceKind.REPAIR,
    "REPARACIÓN MAYOR": MaintenanceKind.REPAIR,
    "CALIBRATION": MaintenanceKind.CALIBRATION,
    "CALIBRACION": MaintenanceKind.CALIBRATION,
    "CALIBRACIÓN": MaintenanceKind.CALIBRATION,
    "INSPECTION": MaintenanceKind.INSPECTION,
    "INSPECCION": MaintenanceKind.INSPECTION,
    "INSPECCIÓN": MaintenanceKind.INSPECTION,
}

_DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d")


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _col(row: dict[str, str], *names: str) -> str:
    for name in names:
        if name in row and row[name] is not None:
            return row[name]
    return ""


def _kind(value: str | None) -> str | None:
    return _KIND_MAP.get(_clean(value).upper())


def _parse_date(value: str | None) -> date | None:
    text = _clean(value)
    if not text:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _cost(value: str | None) -> Decimal | None:
    text = _clean(value)
    if not text:
        return None
    try:
        amount = Decimal(text.replace(",", ""))
    except InvalidOperation:
        return None
    return amount if amount >= 0 else None


class Command(BaseCommand):
    help = "Importa registros de mantenimiento desde un CSV."

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

        def _resolve_assignee(username: str, role: str, label: str, row_num: int) -> User | None:
            user = _resolve_user(username)
            if username and user is None:
                self.stderr.write(f"  fila {row_num}: {label} '{username}' no existe, sin asignar")
                return None
            if user is not None and (not user.is_active or user.role != role):
                self.stderr.write(
                    f"  fila {row_num}: {label} '{username}' no tiene rol/estado válido, sin asignar"
                )
                return None
            return user

        try:
            with transaction.atomic():
                for i, row in enumerate(rows, start=2):
                    row = {(k or "").strip(): v for k, v in row.items()}

                    asset_tag = _clean(_col(row, "asset_tag", "ASSET_TAG"))
                    kind = _kind(_col(row, "kind", "KIND", "TIPO"))
                    record_date = _parse_date(_col(row, "date", "DATE", "FECHA"))
                    description = _clean(_col(row, "description", "DESCRIPTION"))

                    if not asset_tag or kind is None or record_date is None or not description:
                        self.stderr.write(
                            f"  fila {i}: faltan datos obligatorios "
                            "(asset_tag/kind/date/description), omitida"
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

                    engineer = _resolve_assignee(
                        _clean(_col(row, "assigned_engineer", "ASSIGNED_ENGINEER")),
                        User.Role.INGENIERO,
                        "ingeniero asignado",
                        i,
                    )
                    technician = _resolve_assignee(
                        _clean(_col(row, "assigned_technician", "ASSIGNED_TECHNICIAN")),
                        User.Role.TECNICO,
                        "técnico asignado",
                        i,
                    )

                    fields = {
                        "description": description,
                        "observations": _clean(_col(row, "observations", "OBSERVATIONS")),
                        "technician": _clean(_col(row, "technician", "TECHNICIAN")),
                        "assigned_engineer": engineer,
                        "assigned_technician": technician,
                        "cost": _cost(_col(row, "cost", "COST", "COSTO")),
                    }

                    # select_related(None): el manager por defecto trae
                    # assigned_engineer/assigned_technician (FKs nulables), y
                    # update_or_create() activa select_for_update() dentro de
                    # una transacción — Postgres no permite FOR UPDATE sobre
                    # el lado nulable de un LEFT JOIN. Mismo caso ya resuelto
                    # así en MaintenanceRecordSerializer.create()/update().
                    _, was_created = (
                        MaintenanceRecord.objects.select_related(None).update_or_create(
                            equipment=equipment,
                            date=record_date,
                            kind=kind,
                            defaults=fields,
                        )
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
