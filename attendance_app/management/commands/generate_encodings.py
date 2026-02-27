from django.core.management.base import BaseCommand
from attendance_app.models import Student
import json

class Command(BaseCommand):
    help = 'Generate face encodings for students who have a photo but no encoding.'

    def handle(self, *args, **options):
        import cv2
        from attendance_app.face_utils import encode_face

        students_to_process = Student.objects.filter(photo__isnull=False, face_encoding__isnull=True)
        self.stdout.write(self.style.SUCCESS(f'Found {len(students_to_process)} students to process.'))

        for student in students_to_process:
            self.stdout.write(f'Processing {student.roll_number}...')
            try:
                image = cv2.imread(student.photo.path)
                if image is None:
                    self.stdout.write(self.style.WARNING(f'  Could not read image file for {student.roll_number}'))
                    continue

                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                encoding, _, _ = encode_face(rgb_image)

                if encoding is not None:
                    student.face_encoding = json.dumps(encoding.tolist())
                    student.save()
                    self.stdout.write(self.style.SUCCESS(f'  Successfully generated encoding for {student.roll_number}'))
                else:
                    self.stdout.write(self.style.WARNING(f'  Could not find a face in the photo for {student.roll_number}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  An error occurred for {student.roll_number}: {e}'))
