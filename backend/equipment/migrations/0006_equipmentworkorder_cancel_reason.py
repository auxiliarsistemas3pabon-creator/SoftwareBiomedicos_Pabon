from django.db import migrations, models


def _column_names(schema_editor, table: str) -> set[str]:
    with schema_editor.connection.cursor() as cursor:
        return {
            col.name
            for col in schema_editor.connection.introspection.get_table_description(
                cursor, table
            )
        }


def ensure_cancel_reason(apps, schema_editor):
    """La columna puede existir ya en Postgres (sin default) o no existir.

    Un AddField normal fallaría en el primer caso y el INSERT de OT nuevas
    fallaba en el segundo/primero. Idempotente en ambos.
    """
    table = "equipment_equipmentworkorder"
    qn = schema_editor.quote_name
    existing = _column_names(schema_editor, table)
    vendor = schema_editor.connection.vendor
    with schema_editor.connection.cursor() as cursor:
        if "cancel_reason" not in existing:
            cursor.execute(
                f"ALTER TABLE {qn(table)} "
                f"ADD COLUMN {qn('cancel_reason')} text NOT NULL DEFAULT ''"
            )
            return
        if vendor == "postgresql":
            cursor.execute(
                f"ALTER TABLE {qn(table)} "
                f"ALTER COLUMN {qn('cancel_reason')} SET DEFAULT ''"
            )
            cursor.execute(
                f"UPDATE {qn(table)} SET {qn('cancel_reason')} = '' "
                f"WHERE {qn('cancel_reason')} IS NULL"
            )
            cursor.execute(
                f"ALTER TABLE {qn(table)} "
                f"ALTER COLUMN {qn('cancel_reason')} SET NOT NULL"
            )


def patch_stray_not_null_columns(apps, schema_editor):
    """Otras columnas extra NOT NULL sin default también romperían el INSERT."""
    if schema_editor.connection.vendor != "postgresql":
        return
    model = apps.get_model("equipment", "EquipmentWorkOrder")
    known = {field.column for field in model._meta.local_fields}
    table = model._meta.db_table
    qn = schema_editor.quote_name
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = %s
              AND is_nullable = 'NO'
              AND column_default IS NULL
              AND is_identity = 'NO'
            """,
            [table],
        )
        for name, data_type in cursor.fetchall():
            if name in known or name == "id":
                continue
            if data_type in {"character varying", "text", "character"}:
                cursor.execute(
                    f"ALTER TABLE {qn(table)} "
                    f"ALTER COLUMN {qn(name)} SET DEFAULT ''"
                )
                cursor.execute(
                    f"UPDATE {qn(table)} SET {qn(name)} = '' "
                    f"WHERE {qn(name)} IS NULL"
                )
            else:
                cursor.execute(
                    f"ALTER TABLE {qn(table)} "
                    f"ALTER COLUMN {qn(name)} DROP NOT NULL"
                )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("equipment", "0005_equipmentworkorder_maintenance_record"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="equipmentworkorder",
                    name="cancel_reason",
                    field=models.TextField(
                        blank=True,
                        default="",
                        verbose_name="Motivo de cancelación",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(ensure_cancel_reason, noop_reverse),
            ],
        ),
        migrations.RunPython(patch_stray_not_null_columns, noop_reverse),
    ]
