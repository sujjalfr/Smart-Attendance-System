import os
from datetime import datetime
from io import BytesIO

import numpy as np
import qrcode
from django.core.exceptions import ValidationError
from django.core.files import File
from django.db import models


def student_image_upload_path(instance, filename):
    ext = filename.split(".")[-1]
    date_str = datetime.now().strftime("%Y%m%d")
    # Safe roll number
    safe_roll = "".join([c for c in instance.roll_no if c.isalnum() or c in ("_", "-")])
    # Safe student name
    safe_name = (
        "".join([c for c in instance.name if c.isalnum() or c in (" ", "_")])
        .rstrip()
        .replace(" ", "_")
    )
    # Final filename: ROLLNO_NAME_DATE.ext
    filename = f"{safe_roll}_{safe_name}_{date_str}.{ext}"
    return os.path.join("students", filename)


def default_encoding():
    # Return a 128-dim zero vector as bytes (1024 bytes)
    return np.zeros(128, dtype=np.float64).tobytes()


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Batch(models.Model):
    name = models.CharField(max_length=50, help_text="e.g. batch2080")
    start_year = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name


class ClassGroup(models.Model):
    name = models.CharField(max_length=50, help_text="e.g. 10A or BCA-1")
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL
    )
    batch = models.ForeignKey(Batch, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.name


class Student(models.Model):
    roll_no = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.SET_NULL
    )
    batch = models.ForeignKey(Batch, null=True, blank=True, on_delete=models.SET_NULL)
    class_group = models.ForeignKey(
        ClassGroup, null=True, blank=True, on_delete=models.SET_NULL
    )
    # Default to 128-dim zero vector
    face_encoding = models.BinaryField(default=default_encoding, null=True, blank=True)
    image = models.ImageField(
        upload_to=student_image_upload_path, null=True, blank=True
    )
    qr_code = models.ImageField(upload_to="qr_codes/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def has_valid_encoding(self):
        # Returns True if face_encoding is a valid 128-dim float64 vector AND not just zeros
        if not self.face_encoding:
            return False
        try:
            arr = np.frombuffer(self.face_encoding, dtype=np.float64)
            return arr.shape == (128,) and not np.all(arr == 0)
        except:
            return False

    def clean(self):
        if Student.objects.exclude(pk=self.pk).filter(roll_no=self.roll_no).exists():
            raise ValidationError(
                {"roll_no": "A student with this roll number already exists."}
            )

    def save(self, *args, **kwargs):
        # 1. Generate QR Code if missing
        if self.roll_no and not self.qr_code:
            qr_img = qrcode.make(self.roll_no)
            buffer = BytesIO()
            qr_img.save(buffer, format="PNG")
            self.qr_code.save(f"{self.roll_no}_qr.png", File(buffer), save=False)

        # 2. Save first to ensure image is on disk
        super().save(*args, **kwargs)

        # 3. Auto-generate Face Encoding if image exists but encoding is missing or default (zeros)
        is_default_or_empty = False
        if not self.face_encoding or self.face_encoding == b"":
            is_default_or_empty = True
        else:
            try:
                arr = np.frombuffer(self.face_encoding, dtype=np.float64)
                if np.all(arr == 0):
                    is_default_or_empty = True
            except:
                is_default_or_empty = True

        if self.image and is_default_or_empty:
            try:
                from attendance.utils.face_utils import get_face_encoding

                print(f"Auto-generating face encoding for {self.roll_no} from image...")

                # self.image.path is available because we called super().save() above
                encoding = get_face_encoding(self.image.path)

                if encoding:
                    self.face_encoding = encoding
                    # Save only the face_encoding field to update the DB record
                    super().save(update_fields=["face_encoding"])
                    print(f"Successfully saved encoding for {self.roll_no}")
                else:
                    print(f"Warning: No face found in image for {self.roll_no}")
            except Exception as e:
                print(f"Error generating face encoding in save(): {e}")

    def __str__(self):
        return f"{self.roll_no} - {self.name}"
