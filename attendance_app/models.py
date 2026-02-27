from django.db import models
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image
from django.utils import timezone

class Student(models.Model):
    name = models.CharField(max_length=100, default="")
    student_id = models.CharField(max_length=20, unique=True, default="")
    email = models.EmailField(blank=True, null=True)
    photo = models.ImageField(upload_to='students/', null=True, blank=True)
    face_encoding = models.TextField(null=True, blank=True)
    qr_code = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} ({self.student_id})"

class Attendance(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    time = models.TimeField(default=timezone.now)
    verification_method = models.CharField(
        max_length=10,
        choices=[('QR', 'QR Code'), ('FACE', 'Face Recognition')],
        default='QR'
    )

    def __str__(self):
        return f"{self.student.name} - {self.date}"
