from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_usuario_to_tecnico"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="area",
            field=models.CharField(
                blank=True,
                help_text="Área de servicio del operativo (ej. Radiología). Vacío para el resto de roles.",
                max_length=120,
                verbose_name="Área",
            ),
        ),
    ]
