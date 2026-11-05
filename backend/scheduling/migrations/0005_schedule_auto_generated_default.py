from django.db import migrations, models


def set_auto_generated_default(apps, schema_editor):
    """La 0004 original creó auto_generated NOT NULL sin DEFAULT en Postgres."""
    if schema_editor.connection.vendor != "postgresql":
        return
    table = "scheduling_maintenanceschedule"
    qn = schema_editor.quote_name
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            f"ALTER TABLE {qn(table)} "
            f"ALTER COLUMN {qn('auto_generated')} SET DEFAULT false"
        )
        cursor.execute(
            f"UPDATE {qn(table)} SET {qn('auto_generated')} = false "
            f"WHERE {qn('auto_generated')} IS NULL"
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0004_maintenanceschedule_auto_generated_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="maintenanceschedule",
            name="auto_generated",
            field=models.BooleanField(
                default=False, verbose_name="Generada automáticamente"
            ),
        ),
        migrations.RunPython(set_auto_generated_default, noop),
    ]
