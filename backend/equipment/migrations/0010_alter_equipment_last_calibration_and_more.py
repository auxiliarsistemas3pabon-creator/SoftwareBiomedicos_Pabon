# Reemplaza a la 0010 generada automaticamente: esa intentaba convertir texto a
# fecha/hora de golpe y Postgres rechazaba las cadenas vacias ("").

from datetime import datetime

from django.db import migrations, models

FIELDS = {
    "last_calibration": "Última calibración",
    "last_preventive": "Último preventivo",
    "next_calibration": "Próxima calibración",
    "next_preventive": "Próximo preventivo",
}
DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d")


def _to_timestamp_text(raw):
    """Fecha en texto -> medianoche de Bogotá (UTC-5); vacío o no-fecha -> None."""
    text = (raw or "").strip()
    # Ya trae fecha y hora (p. ej. al reaplicar tras revertir): se conserva tal cual.
    if len(text) >= 19 and text[10] in " T":
        try:
            datetime.strptime(text[:19].replace("T", " "), "%Y-%m-%d %H:%M:%S")
            return text
        except ValueError:
            pass
    for fmt in DATE_FORMATS:
        try:
            day = datetime.strptime(text, fmt).date()
        except ValueError:
            continue
        return f"{day.isoformat()} 00:00:00-05:00"
    return None


def _is_text_column(schema_editor, table, column):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_schema = current_schema() AND table_name = %s AND column_name = %s",
            [table, column],
        )
        row = cursor.fetchone()
    return bool(row) and row[0] == "character varying"


def text_to_dates(apps, schema_editor):
    Equipment = apps.get_model("equipment", "Equipment")
    table = Equipment._meta.db_table
    for name in FIELDS:
        if not _is_text_column(schema_editor, table, name):
            continue  # ya convertida (p. ej. otro contenedor aplicó esta migración a la vez)
        Equipment.objects.filter(**{name: ""}).update(**{name: None})
        rows = Equipment.objects.exclude(**{f"{name}__isnull": True}).values_list("pk", name)
        for pk, raw in list(rows):
            Equipment.objects.filter(pk=pk).update(**{name: _to_timestamp_text(raw)})
    # Postgres no deja hacer ALTER TABLE con comprobaciones diferidas pendientes
    # tras los UPDATE de arriba: se ejecutan ahora.
    schema_editor.execute("SET CONSTRAINTS ALL IMMEDIATE")


def nulls_to_empty_text(apps, schema_editor):
    """Reversa: la columna vuelve a ser texto NOT NULL, así que NULL -> ''."""
    Equipment = apps.get_model("equipment", "Equipment")
    table = Equipment._meta.db_table
    for name in FIELDS:
        if _is_text_column(schema_editor, table, name):
            Equipment.objects.filter(**{f"{name}__isnull": True}).update(**{name: ""})
    schema_editor.execute("SET CONSTRAINTS ALL IMMEDIATE")


class Migration(migrations.Migration):

    dependencies = [
        ("equipment", "0009_alter_equipment_supplier_acquisition"),
    ]

    operations = [
        # 1) Las columnas (aún texto) pasan a admitir NULL.
        *[
            migrations.AlterField(
                model_name="equipment",
                name=name,
                field=models.CharField(blank=True, max_length=120, null=True, verbose_name=label),
            )
            for name, label in FIELDS.items()
        ],
        # 2) '' -> NULL; fechas AAAA-MM-DD o DD-MM-AAAA -> medianoche de Bogotá; lo demás -> NULL.
        migrations.RunPython(text_to_dates, nulls_to_empty_text),
        # 3) Recién ahora se cambia el tipo a fecha/hora.
        *[
            migrations.AlterField(
                model_name="equipment",
                name=name,
                field=models.DateTimeField(blank=True, max_length=120, null=True, verbose_name=label),
            )
            for name, label in FIELDS.items()
        ],
    ]
