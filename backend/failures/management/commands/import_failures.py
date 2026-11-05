"""Importa reportes de falla desde un CSV.

Uso (igual que import_equipment / import_users, incluido dentro de Docker):
    python manage.py import_failures ruta/al/archivo.csv
    docker compose exec web python manage.py import_failures ruta/al/archivo.csv

Cabeceras esperadas (el orden no importa, se leen por nombre):
    asset_tag, description, severity, reported_at   (obligatorias)
    reported_by, resolved, resolved_at, resolution_notes   (opcionales)

- asset_tag identifica el equipo (Equipment.asset_tag). Si no existe, la
  fila se omite — este comando no crea equipos (eso es import_equipment).
- severity acepta el código del modelo (LOW/MEDIUM/HIGH/CRITICAL) o su
  etiqueta en español (Baja/Media/Alta/Crítica).
- reported_by es el username de quien reportó (opcional; si no existe el
  usuario, se deja sin asignar, el campo lo permite).
- resolved acepta true/false/si/no/1/0 (por defecto false, igual que el
  modelo). Si resolved=true y no viene resolved_at, se usa reported_at
  (la constraint de la base exige resolved_at >= reported_at).
- El upsert es por (equipo, reported_at): re-ejecutar con un archivo más
  completo actualiza el reporte existente sin duplicar. A diferencia de
  asset_tag/username, esto no es un identificador real del negocio (un
  reporte de falla no trae uno) — es la mejor aproximación disponible, así
  que dos reportes del mismo equipo con la misma fecha/hora exacta se
  consideran el mismo registro.
- --dry-run: procesa el archivo sin escribir en la base de datos.
"""

from __future__ import annotations

import csv
from datetime import UTC, datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from equipment.models import Equipment
from users.models import User

from ...models import FailureRecord, FailureSeverity

_SEVERITY_MAP = {
    "LOW": FailureSeverity.LOW,
    "BAJA": FailureSeverity.LOW,
    "MEDIUM": FailureSeverity.MEDIUM,
    "MEDIA": FailureSeverity.MEDIUM,
    "HIGH": FailureSeverity.HIGH,
    "ALTA": FailureSeverity.HIGH,
    "CRITICAL": FailureSeverity.CRITICAL,
    "CRITICA": FailureSeverity.CRITICAL,
    "CRÍTICA": FailureSeverity.CRITICAL,
}

_TRUE_TOKENS = {"TRUE", "1", "SI", "SÍ", "YES", "RESUELTA", "RESUELTO"}

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


def _severity(value: str | None) -> str | None:
    return _SEVERITY_MAP.get(_clean(value).upper())


def _bool(value: str | None) -> bool:
    return _clean(value).upper() in _TRUE_TOKENS


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
    help = "Importa reportes de falla desde un CSV."

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

                    asset_tag = _clean(_col(row, "asset_tag", "ASSET_TAG"))
                    description = _clean(_col(row, "description", "DESCRIPTION"))
                    severity = _severity(_col(row, "severity", "SEVERITY"))
                    reported_at = _parse_datetime(
                        _col(row, "reported_at", "REPORTED_AT")
                    )

                    if not asset_tag or not description or severity is None or reported_at is None:
                        self.stderr.write(
                            f"  fila {i}: faltan datos obligatorios "
                            "(asset_tag/description/severity/reported_at), omitida"
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

                    resolved = _bool(_col(row, "resolved", "RESOLVED"))
                    resolved_at = _parse_datetime(_col(row, "resolved_at", "RESOLVED_AT"))
                    if resolved and resolved_at is None:
                        # La constraint de la base exige resolved_at >= reported_at;
                        # sin dato propio, se usa reported_at (igual de válido que
                        # el "ahora" que pone el serializer para una falla nueva).
                        resolved_at = reported_at
                    if not resolved:
                        resolved_at = None

                    reported_by = _resolve_user(
                        _clean(_col(row, "reported_by", "REPORTED_BY"))
                    )

                    fields = {
                        "description": description,
                        "severity": severity,
                        "resolved": resolved,
                        "resolved_at": resolved_at,
                        "resolution_notes": _clean(
                            _col(row, "resolution_notes", "RESOLUTION_NOTES")
                        ),
                        "reported_by": reported_by,
                    }

                    _, was_created = FailureRecord.objects.update_or_create(
                        equipment=equipment,
                        reported_at=reported_at,
                        defaults=fields,
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
