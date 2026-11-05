from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("failures", "0002_failurerecord_failure_resolved_at_after_reported_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="failurerecord",
            name="reported_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="failure_reports",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Reportado por",
            ),
        ),
    ]
