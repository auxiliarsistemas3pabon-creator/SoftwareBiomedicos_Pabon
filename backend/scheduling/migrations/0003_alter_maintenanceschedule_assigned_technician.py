# Reconstruida: aplicada en la BD como 0003_alter_maintenanceschedule_assigned_technician.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="maintenanceschedule",
            name="assigned_technician",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"is_active": True, "role": "tecnico"},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="technician_schedules",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Técnico asignado",
            ),
        ),
    ]
