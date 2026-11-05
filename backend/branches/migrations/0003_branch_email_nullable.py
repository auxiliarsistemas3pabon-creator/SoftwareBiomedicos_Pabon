from django.db import migrations, models


def blank_emails_to_null(apps, schema_editor):
    Branch = apps.get_model("branches", "Branch")
    Branch.objects.filter(email="").update(email=None)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("branches", "0002_alter_branch_address_alter_branch_email"),
    ]

    operations = [
        migrations.AlterField(
            model_name="branch",
            name="email",
            field=models.EmailField(
                blank=True,
                help_text="Opcional. Si se indica, no puede repetirse en otra sede.",
                max_length=254,
                null=True,
                unique=True,
                verbose_name="Correo electrónico",
            ),
        ),
        migrations.RunPython(blank_emails_to_null, noop),
    ]
