from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_user_area"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("superadmin", "Superadministrador"),
                    ("admin", "Administrador"),
                    ("coordinador", "Coordinador"),
                    ("ingeniero", "Ingeniero biomédico"),
                    ("tecnico", "Usuario operativo"),
                ],
                default="tecnico",
                max_length=20,
                verbose_name="Rol",
            ),
        ),
        migrations.AlterField(
            model_name="user",
            name="area",
            field=models.CharField(
                blank=True,
                help_text="Área de servicio del usuario operativo (ej. Radiología). Vacío para el resto de roles.",
                max_length=120,
                verbose_name="Área",
            ),
        ),
    ]
