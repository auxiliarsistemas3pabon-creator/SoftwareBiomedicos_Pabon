# Reconstruida: aplicada en la BD como 0004_maintenanceschedule_auto_generated_and_more
# (columnas auto_generated / generated_from_id sin el archivo en el repo).

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0003_alter_maintenanceschedule_assigned_technician"),
        ("scheduling", "0003_alter_maintenanceschedule_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="maintenanceschedule",
            name="auto_generated",
            field=models.BooleanField(
                default=False, verbose_name="Generada automáticamente"
            ),
        ),
        migrations.AddField(
            model_name="maintenanceschedule",
            name="generated_from",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="generated_schedules",
                to="scheduling.maintenanceschedule",
                verbose_name="Solicitud origen",
            ),
        ),
    ]
