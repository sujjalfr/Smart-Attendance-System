# Generated manually to add 'leave' choice to TeacherAttendance.status
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0006_teacherattendance_already_marked_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='teacherattendance',
            name='status',
            field=models.CharField(choices=[('absent', 'Absent'), ('on_time', 'On Time'), ('late', 'Late'), ('leave', 'On Leave')], default='absent', max_length=20),
        ),
    ]
