"""Importa usuarios desde un CSV.

Uso (igual que import_equipment, incluido dentro de Docker):
    python manage.py import_users ruta/al/archivo.csv
    docker compose exec web python manage.py import_users ruta/al/archivo.csv

Cabeceras esperadas (el orden no importa, se leen por nombre):
    username, email, password, role
    first_name, last_name        (opcionales, "" si no vienen)
    phone, area                  (opcionales, campos del modelo User)
    estado                       (opcional: "Activo"/"Inactivo" -> is_active)

- El upsert es por username: re-ejecutar con un archivo más completo
  actualiza los usuarios existentes sin duplicar.
- email es obligatorio (el modelo lo exige y es único); sin email la fila
  se omite.
- password: en usuarios nuevos se exige (si falta, se omite la fila); en
  usuarios existentes es opcional — si no viene, no se toca la contraseña
  actual. Siempre se guarda con `set_password` (nunca en texto plano),
  igual que ya hace `UserManager.create_user`.
- role acepta sinónimos del inventario del cliente además del valor real
  del modelo (ver `_ROLE_MAP`): "operativo" -> tecnico, "ingeniero_biomedico"
  -> ingeniero, etc. Un rol no reconocido omite la fila.
- --dry-run: procesa el archivo sin escribir en la base de datos.
"""

from __future__ import annotations

import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from ...models import User

_ROLE_MAP = {
    "SUPERADMIN": User.Role.SUPERADMIN,
    "ADMIN": User.Role.ADMIN,
    "ADMINISTRADOR": User.Role.ADMIN,
    "COORDINADOR": User.Role.COORDINADOR,
    "INGENIERO": User.Role.INGENIERO,
    "INGENIERO_BIOMEDICO": User.Role.INGENIERO,
    "INGENIERO BIOMEDICO": User.Role.INGENIERO,
    "INGENIERO BIOMÉDICO": User.Role.INGENIERO,
    "TECNICO": User.Role.TECNICO,
    "OPERATIVO": User.Role.TECNICO,
    "USUARIO OPERATIVO": User.Role.TECNICO,
    "USUARIO": User.Role.USUARIO,
}

_ACTIVE_TOKENS = {"ACTIVO", "ACTIVE", "TRUE", "1", "SI", "SÍ"}
_INACTIVE_TOKENS = {"INACTIVO", "INACTIVE", "FALSE", "0", "NO"}


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _col(row: dict[str, str], *names: str) -> str:
    for name in names:
        if name in row and row[name] is not None:
            return row[name]
    return ""


def _role(value: str | None) -> str | None:
    return _ROLE_MAP.get(_clean(value).upper())


def _is_active(value: str | None) -> bool:
    text = _clean(value).upper()
    if text in _INACTIVE_TOKENS:
        return False
    return True  # por defecto activo, igual que el modelo (is_active=True)


class Command(BaseCommand):
    help = "Importa usuarios desde un CSV."

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

        try:
            with transaction.atomic():
                for i, row in enumerate(rows, start=2):
                    row = {(k or "").strip(): v for k, v in row.items()}

                    username = _clean(_col(row, "username", "USERNAME"))
                    email = _clean(_col(row, "email", "EMAIL")).lower()
                    role = _role(_col(row, "role", "ROLE", "ROL"))
                    password = _clean(_col(row, "password", "PASSWORD"))

                    if not username or not email:
                        self.stderr.write(
                            f"  fila {i}: sin username o email, omitida"
                        )
                        skipped += 1
                        continue
                    if role is None:
                        self.stderr.write(
                            f"  fila {i}: rol desconocido "
                            f"'{_col(row, 'role', 'ROLE', 'ROL')}', omitida"
                        )
                        skipped += 1
                        continue

                    fields = {
                        "email": email,
                        "first_name": _clean(_col(row, "first_name", "FIRST_NAME")),
                        "last_name": _clean(_col(row, "last_name", "LAST_NAME")),
                        "role": role,
                        "phone": _clean(_col(row, "phone", "PHONE", "TELEFONO")),
                        "area": _clean(_col(row, "area", "AREA")),
                        "is_active": _is_active(_col(row, "estado", "ESTADO")),
                    }

                    user = User.objects.filter(username=username).first()
                    if user is None:
                        if not password:
                            self.stderr.write(
                                f"  fila {i}: usuario nuevo sin password, omitida"
                            )
                            skipped += 1
                            continue
                        User.objects.create_user(
                            username=username, password=password, **fields
                        )
                        created += 1
                    else:
                        for field, value in fields.items():
                            setattr(user, field, value)
                        if password:
                            user.set_password(password)
                        user.save()
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
