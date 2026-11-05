"""Normaliza archivos CSV/XLSX de usuarios para ``import_users``."""

from __future__ import annotations

import csv
import re
from email.utils import parseaddr
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

_OUTPUT_FIELDS = (
    "username",
    "email",
    "password",
    "role",
    "first_name",
    "last_name",
    "phone",
    "area",
    "estado",
)
_NULL_VALUES = {"", "-", "NO REGISTRA", "NO APLICA", "N/A", "NA"}
_ROLE_MAP = {
    "SUPERADMIN": "superadmin",
    "SUPERADMINISTRADOR": "superadmin",
    "ADMIN": "admin",
    "ADMINISTRADOR": "admin",
    "COORDINADOR": "coordinador",
    "INGENIERO": "ingeniero",
    "INGENIERO BIOMEDICO": "ingeniero",
    "INGENIERO_BIOMEDICO": "ingeniero",
    "TECNICO": "tecnico",
    "OPERATIVO": "tecnico",
    "USUARIO OPERATIVO": "tecnico",
    "USUARIO": "usuario",
}
_ACTIVE_VALUES = {"ACTIVO", "ACTIVE", "1", "TRUE", "SI", "SÍ"}
_INACTIVE_VALUES = {"INACTIVO", "INACTIVE", "0", "FALSE", "NO"}
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _clean(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return " ".join(str(value).split())


def _header(value: object) -> str:
    return _clean(value).lstrip("\ufeff").lower()


def _nullable(value: object) -> str:
    text = _clean(value)
    return "" if text.upper() in _NULL_VALUES else text


def _read_xlsx(path: Path) -> tuple[list[str], list[dict[str, object]]]:
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise CommandError("Para leer archivos XLSX se requiere openpyxl.") from exc

    workbook = load_workbook(path, read_only=False, data_only=True)
    try:
        sheet = workbook.active
        rows = sheet.iter_rows()
        try:
            header_cells = next(rows)
        except StopIteration:
            return [], []
        headers = [_header(cell.value) for cell in header_cells]
        email_index = next(
            (i for i, name in enumerate(headers) if name in {"email", "correo", "e-mail"}),
            None,
        )
        result = []
        for cells in rows:
            row = {
                name: (cell.value if cell.value is not None else "")
                for name, cell in zip(headers, cells, strict=False)
                if name
            }
            if email_index is not None and email_index < len(cells):
                cell = cells[email_index]
                if cell.hyperlink and cell.hyperlink.target:
                    target = cell.hyperlink.target.strip()
                    if target.lower().startswith("mailto:"):
                        row[headers[email_index]] = target[7:].split("?", 1)[0]
            result.append(row)
        return headers, result
    finally:
        workbook.close()


def _read_csv(path: Path) -> tuple[list[str], list[dict[str, object]]]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        sample = file.read(4096)
        file.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(file, dialect=dialect)
        headers = [_header(value) for value in (reader.fieldnames or [])]
        rows = [
            {_header(key): value for key, value in row.items() if key is not None}
            for row in reader
        ]
    return headers, rows


def _email(value: object) -> str:
    text = _clean(value)
    parsed = parseaddr(text)[1] or text
    return parsed.strip().lower()


def _username(value: object, email: str) -> str:
    text = _nullable(value)
    if text:
        return text
    return email.partition("@")[0]


def _phone(value: object) -> str:
    text = re.sub(r"[^0-9+()\- ]", "", _clean(value))
    digits = sum(char.isdigit() for char in text)
    return text if 7 <= digits <= 20 else ""


def _status(value: object) -> str:
    text = _nullable(value).upper()
    return "Inactivo" if text in _INACTIVE_VALUES else "Activo"


class Command(BaseCommand):
    help = "Limpia archivos CSV/XLSX de usuarios para importarlos."

    def add_arguments(self, parser) -> None:
        parser.add_argument("input_path", type=str)
        parser.add_argument("-o", "--output", type=str)
        parser.add_argument(
            "--role",
            default="tecnico",
            help="Rol por defecto cuando la fila no tiene rol.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Valida y reporta sin escribir el CSV de salida.",
        )

    def handle(self, *args, **options) -> None:
        source = Path(options["input_path"])
        if not source.is_file():
            raise CommandError(f"No existe el archivo de entrada: {source}")

        default_role = _ROLE_MAP.get(_clean(options["role"]).upper())
        if default_role is None:
            raise CommandError("El valor de --role no es un rol válido.")

        output = Path(options["output"]) if options["output"] else None
        if output is not None and source.resolve() == output.resolve():
            raise CommandError("El archivo de salida no puede ser el mismo que el de origen.")

        suffix = source.suffix.lower()
        if suffix == ".xlsx":
            headers, rows = _read_xlsx(source)
        elif suffix == ".csv":
            headers, rows = _read_csv(source)
        else:
            raise CommandError("Formato no soportado. Usa un archivo CSV o XLSX.")

        if not rows:
            raise CommandError("El archivo no tiene filas.")

        if not {"username", "email", "password"}.issubset(headers):
            missing = sorted({"username", "email", "password"} - set(headers))
            raise CommandError(f"Faltan columnas requeridas: {', '.join(missing)}.")

        cleaned = []
        seen_usernames: dict[str, str] = {}
        seen_emails: set[str] = set()
        skipped = 0
        suffixed_usernames = 0
        usernames_from_email = 0

        for row in rows:
            row = {_header(key): value for key, value in row.items()}
            email = _email(row.get("email", row.get("correo", "")))
            if not _EMAIL_RE.fullmatch(email) or email in seen_emails:
                skipped += 1
                continue

            raw_username = _nullable(row.get("username", ""))
            username = _username(raw_username, email)
            if not username:
                skipped += 1
                continue
            if not raw_username:
                usernames_from_email += 1

            original_username = username
            if username in seen_usernames:
                if seen_usernames[username] == email:
                    skipped += 1
                    continue
                suffix_number = 2
                while f"{original_username}_{suffix_number}" in seen_usernames:
                    suffix_number += 1
                username = f"{original_username}_{suffix_number}"
                suffixed_usernames += 1

            raw_role = _nullable(row.get("role", row.get("rol", "")))
            role = _ROLE_MAP.get(raw_role.upper()) if raw_role else default_role
            if role is None:
                skipped += 1
                continue

            cleaned.append(
                {
                    "username": username,
                    "email": email,
                    "password": _clean(row.get("password", "")),
                    "role": role,
                    "first_name": _nullable(row.get("first_name", row.get("nombres", ""))),
                    "last_name": _nullable(row.get("last_name", row.get("apellidos", ""))),
                    "phone": _phone(row.get("phone", row.get("telefono", ""))),
                    "area": _nullable(row.get("area", "")),
                    "estado": _status(row.get("estado", row.get("is_active", ""))),
                }
            )
            seen_usernames[username] = email
            seen_emails.add(email)

        if not options["dry_run"]:
            if output is None:
                raise CommandError("Debes indicar el archivo de salida con -o.")
            output.parent.mkdir(parents=True, exist_ok=True)
            with output.open("w", encoding="utf-8-sig", newline="") as file:
                writer = csv.DictWriter(file, fieldnames=_OUTPUT_FIELDS)
                writer.writeheader()
                writer.writerows(cleaned)
        else:
            self.stdout.write(self.style.WARNING("DRY-RUN: no se escribió ningún archivo."))

        self.stdout.write(f"Rol por defecto: {default_role}")
        self.stdout.write(f"Listas para importar: {len(cleaned)}")
        self.stdout.write(
            "Usernames con sufijo (el mismo username tenía otro correo): "
            f"{suffixed_usernames}"
        )
        self.stdout.write(
            "Usernames tomados del correo (venían vacíos): "
            f"{usernames_from_email}"
        )
        self.stdout.write(f"Filas omitidas: {skipped}")
