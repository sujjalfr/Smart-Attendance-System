from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
import logging

from .models import Attendance

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Attendance)
def send_absent_notification(sender, instance: Attendance, created, **kwargs):
    """Send an email notification when an attendance record is absent and not yet notified.

    Marks `absent_email_sent=True` after successful send to avoid duplicates.
    """
    try:
        # Only act when the status is 'absent' and we haven't already sent notification
        if instance.status != 'absent':
            return
        if instance.absent_email_sent:
            return

        student = getattr(instance, 'student', None)
        if not student:
            return

        recipient = (student.email or '').strip()
        if not recipient:
            # No email for this student; nothing to send
            return

        subject = f"Absence notification: {student.name} on {instance.date}"
        context = {
            'student': student,
            'attendance': instance,
        }

        # Render templates; fall back to simple text if template missing
        try:
            message = render_to_string('emails/absent.txt', context)
        except Exception:
            message = f"Dear guardian,\n\n{student.name} ({student.roll_no}) was absent on {instance.date}.\n\nRegards,\nAdministration"

        try:
            html_message = render_to_string('emails/absent.html', context)
        except Exception:
            html_message = None

        def _send():
            try:
                send_mail(
                    subject,
                    message,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', settings.EMAIL_HOST_USER),
                    [recipient],
                    html_message=html_message,
                    fail_silently=False,
                )

                # Mark as sent to avoid duplicate notifications
                Attendance.objects.filter(pk=instance.pk).update(absent_email_sent=True)
                logger.info('Sent absent notification for %s to %s', student.roll_no, recipient)
            except Exception as e:
                logger.exception('Failed to send absent email for %s: %s', student.roll_no, e)

        # Ensure email send occurs after DB transaction commit
        try:
            transaction.on_commit(_send)
        except Exception:
            # As fallback, try sending immediately
            _send()

    except Exception as e:
        logger.exception('Error in send_absent_notification: %s', e)
