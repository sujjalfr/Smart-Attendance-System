# Generated migration for Attendance model updates

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0001_initial'),
    ]

    operations = [
        # Add new fields
        migrations.AddField(
            model_name='attendance',
            name='already_marked',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='attendance',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='attendance',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        # Alter existing fields
        migrations.AlterField(
            model_name='attendance',
            name='date',
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='time',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='status',
            field=models.CharField(
                choices=[
                    ('absent', 'Absent'),
                    ('on_time', 'On Time'),
                    ('late', 'Late'),
                ],
                default='absent',
                max_length=20,
            ),
        ),
        # Add unique constraint
        migrations.AlterUniqueTogether(
            name='attendance',
            unique_together={('student', 'date')},
        ),
        # Add ordering
        migrations.AlterModelOptions(
            name='attendance',
            options={'ordering': ['-date', '-time']},
        ),
    ]
