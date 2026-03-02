from django.core.management.base import BaseCommand
from accounts.models import Student
from attendance.utils.face_utils import get_face_encoding

class Command(BaseCommand):
    help = "Generate missing face encodings for students with images"

    def handle(self, *args, **kwargs):
        fixed = 0
        for student in Student.objects.filter(face_encoding__isnull=True).exclude(image=''):
            print(f"Processing {student.roll_no} ({student.name})...")
            encoding = get_face_encoding(student.image.path)
            if encoding:
                student.face_encoding = encoding
                student.save()
                print(f"  -> Face encoding set.")
                fixed += 1
            else:
                print(f"  -> No face found in image.")
        print(f"Done. Fixed {fixed} students.")

# Usage: python manage.py fix_face_encodings
# This will generate encodings for students who have an image but no encoding.
# Make sure the image is a clear, frontal face.
