from django.core.management.base import BaseCommand
from accounts.models import Teacher

class Command(BaseCommand):
    help = 'Generate face encodings for teachers from their uploaded images if missing.'

    def handle(self, *args, **options):
        from attendance.utils.face_utils import get_face_encoding
        total = 0
        updated = 0
        for t in Teacher.objects.all():
            total += 1
            needs = False
            if not t.face_encoding or t.face_encoding == b"":
                needs = True
            else:
                try:
                    import numpy as np
                    arr = np.frombuffer(t.face_encoding, dtype=np.float64)
                    if np.all(arr == 0):
                        needs = True
                except Exception:
                    needs = True
            if needs and t.image:
                self.stdout.write(f"Processing teacher {t.employee_id} ({t.name})...")
                enc = get_face_encoding(t.image.path)
                if enc:
                    t.face_encoding = enc
                    t.save(update_fields=['face_encoding'])
                    updated += 1
                    self.stdout.write(self.style.SUCCESS(f"Saved encoding for {t.employee_id}"))
                else:
                    self.stdout.write(self.style.WARNING(f"No face found in image for {t.employee_id}"))
        self.stdout.write(f"Processed {total} teachers, updated {updated} encodings.")
