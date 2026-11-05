"""Importa solicitudes de mantenimiento desde un CSV.

Uso (igual que import_equipment / import_users, incluido dentro de Docker):
    python manage.py import_schedules ruta/al/archivo.csv
    docker compose exec web python manage.py import_schedules ruta/al/archivo.csv

Cabeceras en inglés:
    asset_tag, kind, requested_date   (obligatorias)
    requested_by, scheduled_date, notes, assigned_engineer,
    assigned_technician, is_completed   (opcionales)

La hoja de órdenes no trae esos nombres. También se aceptan:
    Equipo o Código equipo          -> asset_tag
    Tipo de solicitud               -> kind
    Fecha de solicitud              -> requested_date
    Fecha inicia orden              -> scheduled_date
        (y requested_date si Fecha de solicitud viene vacía)
    Solicitante / Usuario           -> requested_by
    Recibido a satisfacción,
    Fecha recibido,
    Fecha finaliza orden            -> is_completed

- El equipo se busca por placa. `N.T.` se ignora (no es un código).
  Si la celda dice `Nombre Serial: ... Placa: 004282`, se usa la placa
  y, si no está, la serie. Un código suelto también se prueba contra
  la placa, el código interno, la serie y el nombre exacto.
  Si no existe, o si el equipo está INACTIVE, la fila se omite.
  Este comando no crea equipos (eso es import_equipment).
- kind acepta PREVENTIVE/REPAIR y las etiquetas preventivo, correctivo
  o reparación.
- requested_by / assigned_engineer / assigned_technician son el username.
  Si el usuario no existe, o (para los asignados) no tiene el rol correcto
  o está inactivo, se deja sin asignar.
- No se importan `notified_at`, `auto_generated` ni `generated_from`.
- El upsert es por (equipo, fecha de solicitud, tipo).
- --dry-run: procesa el archivo sin escribir en la base de datos.
"""

from __future__ import annotations

import csv
import re
import unicodedata
from datetime import date, datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from equipment.models import Equipment, EquipmentStatus
from users.models import User

from ...models import MaintenanceSchedule, ScheduledMaintenanceKind

_PREVENTIVE_TOKENS = {
    "PREVENTIVE",
    "PREVENTIVO",
    "PREVENTIVA",
    "MANTENIMIENTO PREVENTIVO",
    "MTTO PREVENTIVO",
    "MP",
}
_REPAIR_TOKENS = {
    "REPAIR",
    "REPARACION",
    "REPARAR",
    "CORRECTIVO",
    "CORRECTIVA",
    "MANTENIMIENTO CORRECTIVO",
    "MTTO CORRECTIVO",
    "MC",
}

_TRUE_TOKENS = {
    "TRUE",
    "1",
    "SI",
    "YES",
    "CUMPLIDA",
    "CUMPLIDO",
    "COMPLETADA",
    "COMPLETADO",
    "RECIBIDO",
    "CERRADA",
    "CERRADO",
}
_FALSE_TOKENS = {"NO", "FALSE", "0", "PENDIENTE", "ABIERTO", "ABIERTA", "N"}
_BLANK_TOKENS = {
    "",
    "NO REGISTRA",
    "NO APLICA",
    "N/A",
    "NA",
    "S/N",
    "SIN CODIGO",
    "NONE",
    "NAN",
    "NAT",
    "-",
    "--",
    "N.T.",
    "N.T",
    "N. T.",
    "N. T",
    "NT",
    "N/T",
    "NO TIENE",
    "SIN PLACA",
    "SIN SERIE",
    "SIN SERIAL",
}

_PLACA_RE = re.compile(r"\bplaca\s*:\s*([A-Za-z0-9][A-Za-z0-9._/-]*)", re.IGNORECASE)
_SERIAL_RE = re.compile(r"\b(?:serial|serie)\s*:\s*([A-Za-z0-9][A-Za-z0-9._/-]*)", re.IGNORECASE)

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%S.%f",
    "%d/%m/%Y",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d-%m-%Y",
    "%d-%m-%Y %H:%M:%S",
    "%Y/%m/%d",
)

_ASSET_ALIASES = (
    "asset_tag",
    "codigo equipo",
    "codigo del equipo",
    "activo (placa)",
    "activo",
    "placa",
    "equipo",
)
_KIND_ALIASES = ("kind", "tipo de solicitud", "tipo")
_REQUESTED_DATE_ALIASES = ("requested_date", "fecha de solicitud")
_REQUESTED_DATE_FALLBACK = ("fecha inicia orden", "scheduled_date")
_SCHEDULED_DATE_ALIASES = ("scheduled_date", "fecha inicia orden")
_REQUESTED_BY_ALIASES = ("requested_by", "solicitante / usuario", "solicitante")
_ENGINEER_ALIASES = ("assigned_engineer",)
_TECHNICIAN_ALIASES = ("assigned_technician",)
_COMPLETED_ALIASES = ("is_completed", "estado", "recibido a satisfaccion")
_CLOSE_DATE_ALIASES = ("fecha recibido", "fecha finaliza orden")
_NOTE_ALIASES = (
    "notes",
    "observaciones",
    "descripcion",
    "descripcion del trabajo",
    "causa de falla",
    "observaciones recepcion",
    "equipos relacionados",
    "marca y modelo",
    "ubicacion",
    "origen",
    "recibio",
    "responsables",
    "solicitante / usuario",
    "equipo",
)


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _fold(value: str | None) -> str:
    text = _clean(value).upper()
    text = "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )
    return " ".join(text.split())


def _header(name: str | None) -> str:
    return _fold(name).lower()


def _is_blank(value: str | None) -> bool:
    return _fold(value) in _BLANK_TOKENS


def _pick(row: dict[str, str], aliases: tuple[str, ...]) -> tuple[str, str]:
    for alias in aliases:
        value = _clean(row.get(alias))
        if value and not _is_blank(value):
            return alias, value
    for alias in aliases:
        if len(alias) < 12:
            continue
        for key, raw in row.items():
            if len(key) < 12:
                continue
            if key.startswith(alias) or alias.startswith(key):
                value = _clean(raw)
                if value and not _is_blank(value):
                    return key, value
    return "", ""


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        key = value.upper()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(value)
    return ordered


def _equipment_clues(row: dict[str, str]) -> tuple[list[str], list[str], str, str]:
    """Placas, series y un código suelto. `N.T.` no cuenta como código."""

    placas: list[str] = []
    serials: list[str] = []
    preferred = list(_ASSET_ALIASES) + ["descripcion", "equipos relacionados"]
    seen: set[str] = set()
    for key in preferred:
        if key in seen:
            continue
        seen.add(key)
        text = row.get(key, "")
        placas.extend(_PLACA_RE.findall(text))
        serials.extend(_SERIAL_RE.findall(text))
    if not placas and not serials:
        for key, text in row.items():
            if key in seen:
                continue
            placas.extend(_PLACA_RE.findall(text or ""))
            serials.extend(_SERIAL_RE.findall(text or ""))

    code = ""
    code_key = ""
    for alias in _ASSET_ALIASES:
        raw = _asset(row.get(alias, ""))
        if not raw or _PLACA_RE.search(raw) or _SERIAL_RE.search(raw):
            continue
        code = raw
        code_key = alias
        break
    return _unique(placas), _unique(serials), code, code_key


def _asset(value: str) -> str:
    text = _clean(value)
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    if _fold(text) in _BLANK_TOKENS:
        return ""
    return text


def _kind(value: str | None) -> str | None:
    text = _fold(value)
    if not text:
        return None
    if text in _PREVENTIVE_TOKENS or "PREVENT" in text:
        return ScheduledMaintenanceKind.PREVENTIVE
    if text in _REPAIR_TOKENS or "REPAR" in text or "CORRECT" in text:
        return ScheduledMaintenanceKind.REPAIR
    return None


def _parse_date(value: str | None) -> date | None:
    text = _clean(value)
    if not text or _fold(text) in _BLANK_TOKENS:
        return None
    if text.endswith("Z"):
        text = text[:-1]
    candidates = [text]
    if " " in text:
        candidates.append(text.split(" ", 1)[0])
    if "T" in text:
        candidates.append(text.split("T", 1)[0])
    for candidate in candidates:
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(candidate, fmt).date()
            except ValueError:
                continue
    return None


def _completed(row: dict[str, str]) -> bool:
    explicit = _fold(_pick(row, _COMPLETED_ALIASES)[1])
    if explicit in _TRUE_TOKENS:
        return True
    if explicit in _FALSE_TOKENS:
        return False
    return any(_parse_date(row.get(alias)) for alias in _CLOSE_DATE_ALIASES)


def _notes(row: dict[str, str], asset_key: str) -> str:
    parts: list[str] = []
    used: set[str] = set()
    for alias in _NOTE_ALIASES:
        if alias == asset_key or alias in used:
            continue
        value = _clean(row.get(alias))
        if not value or _is_blank(value):
            continue
        used.add(alias)
        parts.append(value if alias == "notes" else f"{alias}: {value}")
    return " | ".join(parts)


def _load_rows(path: Path) -> list[dict[str, str]]:
    data = path.read_bytes()
    text: str | None = None
    for encoding in ("utf-8-sig", "utf-8"):
        try:
            text = data.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = data.decode("latin-1")

    first = text.splitlines()[0] if text else ""
    counts = {",": first.count(","), ";": first.count(";"), "\t": first.count("\t")}
    delimiter = max(counts, key=counts.get) if any(counts.values()) else ","

    rows: list[dict[str, str]] = []
    for raw in csv.DictReader(text.splitlines(), delimiter=delimiter):
        normalized: dict[str, str] = {}
        for key, value in raw.items():
            header = _header(key)
            if not header or header in normalized:
                continue
            normalized[header] = "" if value is None else value
        rows.append(normalized)
    return rows


class Command(BaseCommand):
    help = "Importa solicitudes de mantenimiento desde un CSV."

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

        rows = _load_rows(path)
        if not rows:
            raise CommandError("El CSV no tiene filas.")

        headers = list(rows[0].keys())
        self.stdout.write("Columnas: " + ", ".join(headers))

        created = updated = skipped = 0
        equipment_cache: dict[str, tuple[Equipment | None, str]] = {}
        user_cache: dict[str, User | None] = {}

        def _by_asset_tag(token: str) -> Equipment | None:
            key = f"tag:{token.upper()}"
            if key in equipment_cache:
                return equipment_cache[key][0]
            equipment = Equipment.objects.filter(asset_tag__iexact=token).first()
            if equipment is None and token.isdigit():
                stripped = token.lstrip("0")
                if stripped and stripped != token:
                    numeric = [
                        item
                        for item in Equipment.objects.filter(asset_tag__iendswith=stripped)[:20]
                        if item.asset_tag.isdigit() and item.asset_tag.lstrip("0") == stripped
                    ]
                    if len(numeric) == 1:
                        equipment = numeric[0]
            equipment_cache[key] = (equipment, "" if equipment is not None else "missing")
            return equipment

        def _by_serial(token: str) -> Equipment | None:
            key = f"serial:{token.upper()}"
            if key in equipment_cache:
                return equipment_cache[key][0]
            equipment = Equipment.objects.filter(serial__iexact=token).first()
            equipment_cache[key] = (equipment, "" if equipment is not None else "missing")
            return equipment

        def _resolve_code(token: str) -> tuple[Equipment | None, str]:
            key = f"code:{token.upper()}"
            if key in equipment_cache:
                return equipment_cache[key]
            equipment = (
                _by_asset_tag(token)
                or Equipment.objects.filter(internal_code__iexact=token).first()
                or _by_serial(token)
            )
            if equipment is None:
                matches = list(Equipment.objects.filter(name__iexact=token)[:2])
                if len(matches) > 1:
                    equipment_cache[key] = (None, "ambiguous")
                    return equipment_cache[key]
                equipment = matches[0] if matches else None
            found = (equipment, "" if equipment is not None else "missing")
            equipment_cache[key] = found
            return found

        def _resolve_row_equipment(
            placas: list[str], serials: list[str], code: str
        ) -> tuple[Equipment | None, str, str]:
            for placa in placas:
                equipment = _by_asset_tag(placa)
                if equipment is not None:
                    return equipment, "", f"placa {placa}"
            for serial in serials:
                equipment = _by_serial(serial)
                if equipment is not None:
                    return equipment, "", f"serie {serial}"
            if code:
                equipment, failure = _resolve_code(code)
                return equipment, failure, code
            if placas:
                return None, "missing", f"placa {placas[0]}"
            if serials:
                return None, "missing", f"serie {serials[0]}"
            return None, "missing", ""

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
                    placas, serials, code, asset_key = _equipment_clues(row)
                    kind_raw = _pick(row, _KIND_ALIASES)[1]
                    kind = _kind(kind_raw)
                    requested_date = _parse_date(_pick(row, _REQUESTED_DATE_ALIASES)[1])
                    if requested_date is None:
                        requested_date = _parse_date(_pick(row, _REQUESTED_DATE_FALLBACK)[1])

                    if (not placas and not serials and not code) or kind is None or requested_date is None:
                        missing = []
                        if not placas and not serials and not code:
                            missing.append("equipo")
                        if kind is None:
                            if kind_raw:
                                missing.append(f"tipo no reconocido ({kind_raw})")
                            else:
                                missing.append("tipo de solicitud")
                        if requested_date is None:
                            missing.append("fecha de solicitud")
                        self.stderr.write(
                            f"  fila {i}: faltan {', '.join(missing)}, omitida"
                        )
                        skipped += 1
                        continue

                    equipment, failure, label = _resolve_row_equipment(placas, serials, code)
                    if failure == "ambiguous":
                        self.stderr.write(
                            f"  fila {i}: hay más de un equipo llamado '{label}', omitida"
                        )
                        skipped += 1
                        continue
                    if equipment is None:
                        self.stderr.write(
                            f"  fila {i}: equipo '{label}' no encontrado, omitida"
                        )
                        skipped += 1
                        continue
                    if equipment.status == EquipmentStatus.INACTIVE:
                        self.stderr.write(
                            f"  fila {i}: equipo '{label}' está inactivo, omitida"
                        )
                        skipped += 1
                        continue

                    requested_by = _resolve_user(_clean(_pick(row, _REQUESTED_BY_ALIASES)[1]))
                    engineer = _resolve_assignee(
                        _clean(_pick(row, _ENGINEER_ALIASES)[1]),
                        User.Role.INGENIERO,
                        "ingeniero asignado",
                        i,
                    )
                    technician = _resolve_assignee(
                        _clean(_pick(row, _TECHNICIAN_ALIASES)[1]),
                        User.Role.TECNICO,
                        "técnico asignado",
                        i,
                    )

                    fields = {
                        "requested_by": requested_by,
                        "scheduled_date": _parse_date(_pick(row, _SCHEDULED_DATE_ALIASES)[1]),
                        "notes": _notes(row, asset_key if code else ""),
                        "assigned_engineer": engineer,
                        "assigned_technician": technician,
                        "is_completed": _completed(row),
                    }

                    # select_related(None): el manager por defecto trae
                    # assigned_engineer/assigned_technician/requested_by (FKs
                    # nulables), y update_or_create() activa
                    # select_for_update() dentro de una transacción —
                    # Postgres no permite FOR UPDATE sobre el lado nulable de
                    # un LEFT JOIN. Mismo caso ya resuelto así en
                    # MaintenanceRecordSerializer.create()/update() (que hace
                    # lo mismo sobre este mismo modelo).
                    _, was_created = (
                        MaintenanceSchedule.objects.select_related(None).update_or_create(
                            equipment=equipment,
                            requested_date=requested_date,
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
