from django.core.management.base import BaseCommand
from attendance_app.models import Student

class Command(BaseCommand):
    help = 'Deletes all existing face encodings.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Deleting all face encodings...'))
        num_deleted = Student.objects.all().update(face_encoding=None)
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {num_deleted} face encodings.'))
