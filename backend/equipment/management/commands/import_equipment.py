"""Importa equipos biomédicos desde un CSV.

Uso:
    python manage.py import_equipment ruta/al/archivo.csv
    docker compose exec web python manage.py import_equipment ruta/al/archivo.csv

Cabeceras esperadas (español, tal como vienen del inventario del cliente):
    NOMBRE DEL EQUIPO, MARCA, MODELO, SERIE, ACTIVO (PLACA),
    CLASIFICACION DE RIESGO, VIDA UTIL, REGISTRO INVIMA, AREA, SEDE,
    INSTITUCION (CLIENTE), FRECUENCIA CALIBRACION, FRECUENCIA DE MANTENIMIENTO,
    COSTO DEL EQUIPO, CLASIFICACION BIOMEDICA

- La columna INSTITUCION (CLIENTE) se usa como Sede (Branch) y como Cliente.
- La columna SEDE se guarda como Ubicación del equipo.
- Marca/Modelo se crean en catálogo si no existen.
- El upsert es por ACTIVO (PLACA): re-ejecutar con un archivo más completo
  actualiza los equipos existentes sin duplicar.
"""

from __future__ import annotations

import csv
import re
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from branches.models import Branch
from catalog.models import Brand, EquipmentModel

from ...models import Equipment

_NULL_TOKENS = {
    "",
    "NO REGISTRA",
    "NO APLICA",
    "N/A",
    "NA",
    "NO DETERMINADO",
    "NO APLICA.",
    "-",
}

_RISK_MAP = {
    "CLASE I": "I",
    "CLASE IIA": "IIA",
    "CLASE IIB": "IIB",
    "CLASE III": "III",
    "I": "I",
    "IIA": "IIA",
    "IIB": "IIB",
    "III": "III",
}


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _nullable_text(value: str | None) -> str:
    text = _clean(value)
    return "" if text.upper() in _NULL_TOKENS else text


def _risk_class(value: str | None) -> str | None:
    return _RISK_MAP.get(_clean(value).upper())


def _int_years(value: str | None) -> int | None:
    text = _clean(value).upper()
    if text in _NULL_TOKENS:
        return None
    match = re.search(r"\d+", text)
    return int(match.group()) if match else None


def _freq_months(value: str | None) -> int | None:
    text = _clean(value)
    if not text.isdigit():
        return None
    months = int(text)
    return months or None  # 0 -> None ("no aplica")


def _cost(value: str | None) -> Decimal | None:
    text = re.sub(r"[^\d.,]", "", _clean(value)).replace(",", "")
    if not text:
        return None
    try:
        amount = Decimal(text)
    except InvalidOperation:
        return None
    return amount or None


def _col(row: dict[str, str], *names: str) -> str:
    for name in names:
        if name in row and row[name] is not None:
            return row[name]
    return ""

def _parse_datetime(value:str | None) -> datetime:
    value = (value or "").strip()

    if not value:
        return datetime(2026,9,22,0,0,0,tzinfo=UTC)

    for fmt in (
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            parsed = datetime.strptime(value,fmt)

            return parsed.replace(tzinfo=UTC)
        except ValueError:
            continue
    raise ValueError(f"Fecha inválida: {value}")


class Command(BaseCommand):
    help = "Importa equipos biomédicos desde un CSV de inventario."

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
        brand_cache: dict[str, Brand] = {}
        model_cache: dict[tuple[str, str], EquipmentModel] = {}
        branch_cache: dict[str, Branch] = {}

        try:
            with transaction.atomic():
                for i, row in enumerate(rows, start=2):
                    row = {(k or "").strip(): v for k, v in row.items()}
                    name = _clean(_col(row, "NOMBRE DEL EQUIPO"))
                    asset_tag = _clean(_col(row, "ACTIVO (PLACA)", "ACTIVO", "PLACA"))
                    if not name or not asset_tag:
                        self.stderr.write(f"  fila {i}: sin nombre o placa, omitida")
                        skipped += 1
                        continue

                    brand_name = _clean(_col(row, "MARCA")) or "SIN MARCA"
                    model_name = _nullable_text(_col(row, "MODELO")) or "SIN MODELO"
                    institution = _clean(
                        _col(row, "INSTITUCION (CLIENTE)", "INSTITUCION", "CLIENTE")
                    ) or "SIN INSTITUCION"

                    brand = brand_cache.get(brand_name.upper())
                    if brand is None:
                        brand, _ = Brand.objects.get_or_create(name=brand_name)
                        brand_cache[brand_name.upper()] = brand

                    model_key = (brand_name.upper(), model_name.upper())
                    model = model_cache.get(model_key)
                    if model is None:
                        model, _ = EquipmentModel.objects.get_or_create(
                            brand=brand, name=model_name
                        )
                        model_cache[model_key] = model

                    branch = branch_cache.get(institution.upper())
                    if branch is None:
                        branch, _ = Branch.objects.get_or_create(
                            name=institution,
                            defaults={
                                "address": "No registra",
                                "city": "No registra",
                                "phone": "0000000",
                            },
                        )
                        branch_cache[institution.upper()] = branch

                    fields = {
                        "name": name,
                        "serial": _nullable_text(_col(row, "SERIE")),
                        "equipment_model": model,
                        "branch": branch,
                        "branch_text": brand_name,
                        "biomedical_classification": _clean(
                            _col(row, "CLASIFICACION BIOMEDICA")
                        ),
                        "risk_class": _risk_class(_col(row, "CLASIFICACION DE RIESGO")),
                        "life_use_years": _int_years(_col(row, "VIDA UTIL")),
                        "invima_registration": _nullable_text(
                            _col(row, "REGISTRO INVIMA")
                        ),
                        "area": _clean(_col(row, "AREA")),
                        "location": _clean(_col(row, "SEDE")),
                        "client_name": institution,
                        "calibration_frequency_months": _freq_months(
                            _col(row, "FRECUENCIA CALIBRACION")
                        ),
                        "warranty_start_date":_parse_datetime(
                            _col(row,"FECHA INICIA GARANTÍA")
                        ),
                        "warranty_end_date":_parse_datetime(
                            _col(row,"FECHA FINALIZA GARANTÍA")
                        ),
                        "last_calibration":_parse_datetime(
                            _col(row,"ULTIMA CALIBRACIÓN")
                        ),
                        "last_preventive":_parse_datetime(
                            _col(row,"ÚLTIMO PREVENTIVO")
                        ),
                        "next_preventive":_parse_datetime(
                            _col(row,"PRÓXIMA PREVENTIVO")
                        ),
                        "next_calibration":_parse_datetime(
                            _col(row,"PRÓXIMO PREVENTIVO")
                        ),
                        "maintenance_frequency_months": _freq_months(
                            _col(row, "FRECUENCIA DE MANTENIMIENTO")
                        ),
                        "equipment_cost": _cost(_col(row, "COSTO DEL EQUIPO")),
                    }

                    _, was_created = Equipment.objects.update_or_create(
                        asset_tag=asset_tag, defaults=fields
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
