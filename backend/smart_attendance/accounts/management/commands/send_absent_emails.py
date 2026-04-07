from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

from accounts.models import Student
from attendance.models import Attendance

class Command(BaseCommand):
    help = 'Send emails to students absent on a given date (default today).'

    def add_arguments(self, parser):
        parser.add_argument('--date', type=str, help='Date in YYYY-MM-DD format', default=None)
        parser.add_argument('--dry-run', action='store_true', help='Do not actually send emails; just list recipients')

    def handle(self, *args, **options):
        date_str = options.get('date')
        if date_str:
            from datetime import datetime
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except Exception as e:
                self.stderr.write(f"Invalid date format: {e}")
                return
        else:
            target_date = timezone.localdate()

        students = Student.objects.all()
        absent_with_email = []
        for s in students:
            if Attendance.objects.filter(student=s, date=target_date).exists():
                continue
            if s.email:
                absent_with_email.append(s)

        if not absent_with_email:
            self.stdout.write("No absent students with email found for %s." % target_date.isoformat())
            return

        from_email = settings.EMAIL_HOST_USER
        for s in absent_with_email:
            subject = f"Marked absent on {target_date.isoformat()}"
            message = (
                f"Dear {s.name},\n\n"
                f"You were marked absent on {target_date.isoformat()}. If this is a mistake, please contact the administration.\n\n"
                "Regards,\nAttendance Team"
            )
            recipient = [s.email]
            if options.get('dry_run'):
                self.stdout.write(f"DRY RUN - would send to {s.email}: {subject}")
                continue
            try:
                send_mail(subject, message, from_email, recipient, fail_silently=False)
                self.stdout.write(f"Sent email to {s.email}")
            except Exception as e:
                self.stderr.write(f"Failed to send to {s.email}: {e}")
