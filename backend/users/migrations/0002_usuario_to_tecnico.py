from django.db import migrations, models


def forwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(role="usuario").update(role="tecnico")


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("superadmin", "Superadministrador"),
                    ("admin", "Administrador"),
                    ("coordinador", "Coordinador"),
                    ("ingeniero", "Ingeniero biomédico"),
                    ("tecnico", "Operativo"),
                ],
                default="tecnico",
                max_length=20,
                verbose_name="Rol",
            ),
        ),
    ]
