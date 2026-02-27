from django.test import TestCase, Client
from django.urls import reverse
from .models import Student, Attendance
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch, MagicMock
import json
import numpy as np
import cv2

class StudentModelTest(TestCase):
    def test_student_creation(self):
        student = Student.objects.create(roll_number='STU123', full_name='Test Student')
        self.assertEqual(student.roll_number, 'STU123')

class GenerateQRCommandTest(TestCase):
    def test_generate_qr_command(self):
        Student.objects.create(roll_number='STU123', full_name='Test Student')
        call_command('generate_qr', roll_number='STU123', stdout=StringIO())
        student = Student.objects.get(roll_number='STU123')
        self.assertTrue(student.qr_data)

class ViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.student = Student.objects.create(
            student_id='STU123',
            full_name='Test Student',
            face_encoding=json.dumps(list(np.random.rand(128)))
        )

    def create_test_image(self):
        # Create a dummy image for testing
        image = np.zeros((100, 100, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.png', image)
        return SimpleUploadedFile('test.png', buffer.tobytes(), content_type='image/png')

    @patch('attendance_app.views.decode')
    def test_scan_qr_view(self, mock_decode):
        mock_decode.return_value = [MagicMock(data=b'STU123')]
        image = self.create_test_image()
        response = self.client.post(reverse('attendance_app:qr_scan'), {'image': image})
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {'status': 'ok', 'student_id': 'STU123'})

    @patch('face_recognition.face_locations')
    @patch('face_recognition.face_encodings')
    @patch('face_recognition.compare_faces')
    @patch('face_recognition.face_distance')
    def test_verify_face_view(self, mock_face_distance, mock_compare_faces, mock_face_encodings, mock_face_locations):
        mock_face_locations.return_value = [(0, 100, 100, 0)]
        mock_face_encodings.return_value = [np.random.rand(128)]
        mock_compare_faces.return_value = [True]
        mock_face_distance.return_value = [0.4]

        image = self.create_test_image()
        # Convert image to base64 to simulate JS fetch
        import base64
        image_b64 = 'data:image/jpeg;base64,' + base64.b64encode(image.read()).decode()

        response = self.client.post(reverse('attendance_app:verify_face'), {
            'student_id': 'STU123',
            'image': image_b64
        })
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {'match': True, 'confidence': 0.4})

    def test_export_attendance_view(self):
        Attendance.objects.create(student=self.student, status='PRESENT')
        response = self.client.get(reverse('attendance_app:export_attendance'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
