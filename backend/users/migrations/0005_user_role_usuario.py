from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_usuario_operativo_label"),
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
                    ("usuario", "Usuario"),
                ],
                default="tecnico",
                max_length=20,
                verbose_name="Rol",
            ),
        ),
    ]
