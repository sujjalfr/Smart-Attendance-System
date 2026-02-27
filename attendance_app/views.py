from django.shortcuts import render, redirect
from django.views import View
from .models import Student, Attendance
import cv2
from pyzbar.pyzbar import decode
import numpy as np
import json
import os
from django.http import JsonResponse, HttpResponse
from django.core.files.base import ContentFile
import base64
import time
import pandas as pd
import dlib

class HomeView(View):
    def get(self, request):
        return render(request, 'attendance_app/home.html')

class QRScanView(View):
    def get(self, request):
        return render(request, 'attendance_app/qr_scan.html')
    
    def post(self, request):
        image_file = request.FILES.get('image')
        if image_file:
            try:
                image_data = np.frombuffer(image_file.read(), np.uint8)
                image = cv2.imdecode(image_data, cv2.IMREAD_COLOR)

                if image is None:
                    return JsonResponse({'status': 'error', 'message': 'Could not decode image.'})

                decoded_objects = decode(image)

                if decoded_objects:
                    student_id = decoded_objects[0].data.decode('utf-8')
                    return JsonResponse({'status': 'ok', 'student_id': student_id})
                else:
                    return JsonResponse({'status': 'no_qr', 'message': 'No QR Code found.'})
            except Exception as e:
                return JsonResponse({'status': 'error', 'message': str(e)})

        return JsonResponse({'status': 'error', 'message': 'No image file found.'})



from . import face_utils

def verify_face(request):
    if request.method == 'POST':
        student_id = request.POST.get('student_id')
        image_data_url = request.POST.get('image')

        try:
            student = Student.objects.get(student_id=student_id)
            stored_encoding = np.array(json.loads(student.face_encoding))
        except (Student.DoesNotExist, json.JSONDecodeError):
            return JsonResponse({'match': False, 'error': 'Invalid student data.'})

        format, imgstr = image_data_url.split(';base64,') 
        ext = format.split('/')[-1] 
        image_data = ContentFile(base64.b64decode(imgstr), name=f'{student_id}_{int(time.time())}.{ext}')

        # Convert to numpy array for face processing
        image_array = cv2.imdecode(np.frombuffer(image_data.read(), np.uint8), cv2.IMREAD_COLOR)
        
        # The face_utils functions expect RGB images
        rgb_image = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)

        # Get face encoding from the live image
        live_encoding, face_location, landmarks = face_utils.encode_face(rgb_image)

        if live_encoding is None:
            return JsonResponse({'match': False, 'error': 'No face detected in the image.'})

        # Compare faces
        is_match, distance = face_utils.compare_faces(stored_encoding, live_encoding)

        # Mark attendance
        status = 'PRESENT' if is_match else 'FAILED_MATCH'
        Attendance.objects.create(
            student=student,
            status=status,
            snapshot=image_data,
            confidence=distance
        )

        # Prepare response
        response_data = {
            'match': is_match,
            'confidence': distance,
            'face_location': {
                'top': face_location[0],
                'right': face_location[1],
                'bottom': face_location[2],
                'left': face_location[3]
            } if face_location else None,
            'landmarks': landmarks
        }
        
        return JsonResponse(response_data)

    return JsonResponse({'error': 'Invalid request method.'}, status=405)

def export_attendance(request):
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    student_id = request.GET.get('student_id')

    attendance_records = Attendance.objects.all()

    if student_id:
        attendance_records = attendance_records.filter(student__student_id=student_id)
    if date_from:
        attendance_records = attendance_records.filter(timestamp__date__gte=date_from)
    if date_to:
        attendance_records = attendance_records.filter(timestamp__date__lte=date_to)

    df = pd.DataFrame(list(attendance_records.values(
        'student__student_id', 'student__name', 'timestamp', 'status', 'confidence'
    )))

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename=attendance.xlsx'

    df.to_excel(response, index=False)

    return response
