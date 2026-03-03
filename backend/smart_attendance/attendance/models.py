from django.db import models
from accounts.models import Student
from django.utils import timezone

# Create your models here.
class Attendance(models.Model):
    STATUS_CHOICES = [
        ('absent', 'Absent'),
        ('on_time', 'On Time'),
        ('late', 'Late'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.localdate)  # Allow updates
    time = models.TimeField(null=True, blank=True)  # Allow null for edits, don't auto_now_add
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='absent')
    already_marked = models.BooleanField(default=False)  # Track if marked
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time']
        unique_together = (('student', 'date'),)  # One attendance per student per day

    def __str__(self):
        return f"{self.student.name} - {self.date} ({self.status})"


class AdminSetting(models.Model):
    """Singleton-ish model to store admin PIN hash."""
    pin_hash = models.CharField(max_length=255, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AdminSetting(id={self.id})"


class AdminToken(models.Model):
    """Simple token issued on successful PIN auth. Used to validate admin sessions."""
    key = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(default=timezone.now)

    def is_expired(self, lifetime_hours=168):
        return (timezone.now() - self.created_at).total_seconds() > lifetime_hours * 3600

    def __str__(self):
        return f"AdminToken(key={self.key})"
