from rest_framework.views import APIView
from rest_framework.response import Response
from .utils.face_utils import match_face
from accounts.models import Student
from .models import Attendance, AdminSetting, AdminToken
from django.utils import timezone
import os
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta, date
from accounts.models import Student
import openpyxl
from django.http import HttpResponse
from datetime import time as datetime_time
import shutil
from pathlib import Path

from .utils.image_store import save_attendance_image_from_path
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
import secrets
import logging
logger = logging.getLogger(__name__)

from datetime import timedelta, date, datetime, time as datetime_time, timezone as dt_timezone
from django.utils import timezone
NEPAL_TZ = timezone.get_fixed_timezone(5 * 60 + 45)  # UTC+5:45
from collections import deque

# In-memory recent attendance events (most recent first)
RECENT_ATTENDANCE = deque(maxlen=8)
# Matching configuration: stricter threshold to avoid false positives
STRICT_MATCH_THRESHOLD = 0.5  # maximum allowed distance for an automatic match
MIN_TOP_SEPARATION = 0.06     # minimum distance gap between top-2 candidates to be unambiguous

def _print_recent_attendance():
    try:
        print("\n=== Recent Attendance (most recent on top) ===")
        for item in list(RECENT_ATTENDANCE):
            print(item)
        print("===========================================\n")
    except Exception:
        pass

def _local_time_iso(d, t):
    """Convert stored date+time to Nepal time ISO (+05:45).

    We now store attendance.times in Nepal local time to avoid offset confusion.
    This function attaches Asia/Kathmandu tz to the stored time and returns ISO.
    Example: "2026-01-26T20:10:39.466932+05:45".
    """
    if not d or not t:
        return None
    # Stored time is local NPT (naive). Attach NEPAL_TZ explicitly.
    local_dt = datetime.combine(d, t, tzinfo=NEPAL_TZ)
    return local_dt.isoformat()

def _now_local_iso():
    return timezone.localtime(timezone.now(), NEPAL_TZ).isoformat()

class AttendanceStatus(APIView):
    def get(self, request):
        roll_no = request.query_params.get("roll_no")
        if not roll_no:
            return Response({"error": "roll_no required"}, status=400)
        try:
            student = Student.objects.get(roll_no=roll_no)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)
        today = timezone.now().date()
        att = Attendance.objects.filter(student=student, date=today).first()
        exists = att is not None
        
        # Build response
        response_data = {
            "id": att.id if att else None,
            "alreadyMarked": exists,
            "roll_no": roll_no,
            "name": student.name,
            "class": student.class_group.name if student.class_group else None,
            "batch": student.batch.name if student.batch else None,
            "department": student.department.name if student.department else None,
            "time": att.time.isoformat() if att and att.time else None,
            "status": att.status if att else "absent",
        }
        
        return Response(response_data)

class AttendanceStatusList(APIView):
    """List attendance status for all students for a given date (defaults to today)"""
    def get(self, request):
        # Accept optional `date` query param (YYYY-MM-DD). If provided and valid, use it.
        date_str = request.query_params.get("date")
        try:
            if date_str:
                today = datetime.strptime(date_str, "%Y-%m-%d").date()
            else:
                today = timezone.now().date()
        except Exception:
            # invalid format -> respond with 400
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        
        students = Student.objects.select_related('class_group', 'batch', 'department').all()
        
        result = []
        for student in students:
            att = Attendance.objects.filter(student=student, date=today).first()
            exists = att is not None
            
            result.append({
                "id": att.id if att else student.id,
                "roll_no": student.roll_no,
                "name": student.name,
                "class": student.class_group.name if student.class_group else None,
                "batch": student.batch.name if student.batch else None,
                "department": student.department.name if student.department else None,
                "alreadyMarked": exists,
                "time": att.time.isoformat() if att and att.time else None,
                "status": att.status if att else "absent",
            })
        
        return Response({"results": result})

class MarkAttendance(APIView):
    def post(self, request):
        print("Received attendance request")
        image = request.FILES.get('image')
        print(f"Image: {image}")

        if not image:
            print("Error: Missing image")
            return Response({"error": "Image is required"}, status=400)

        # Ensure temp directory exists and save upload
        os.makedirs("media/temp", exist_ok=True)
        import uuid
        tmp_name = f"{uuid.uuid4().hex}.jpg"
        path = os.path.join("media/temp", tmp_name)
        with open(path, 'wb+') as f:
            for chunk in image.chunks():
                f.write(chunk)

        # Match face against all students (ranked candidates)
        try:
            candidates = match_face(path)
            print(f"Match result: {candidates}")
            if candidates == "no_face":
                print("Error: No face detected in image")
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass
                return Response({"error": "No face detected in image"}, status=400)
            # ensure we have a list
            if not isinstance(candidates, list):
                candidates = list(candidates)
        except Exception as e:
            print(f"Exception during face matching: {e}")
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
            return Response({"error": f"Error processing image: {str(e)}"}, status=500)
        if not candidates:
            print("Error: Face did not match any student")
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
            return Response({"error": "Face did not match"}, status=400)

        # Apply stricter matching rules first: require top candidate below STRICT_MATCH_THRESHOLD
        # and ensure top-two separation is sufficient to avoid ambiguous matches.
        top_dist = candidates[0][1]
        if top_dist is None or top_dist > STRICT_MATCH_THRESHOLD:
            print(f"Top candidate distance {top_dist} exceeds strict threshold {STRICT_MATCH_THRESHOLD}; rejecting match")
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
            return Response({"error": "Face did not match"}, status=400)

        if len(candidates) > 1:
            second_dist = candidates[1][1]
            if (second_dist - top_dist) < MIN_TOP_SEPARATION:
                print(f"Top two candidates too close (d1={top_dist}, d2={second_dist}); ambiguous match")
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass
                return Response({"error": "Ambiguous face match"}, status=400)

        # Iterate ranked candidates and pick the first one within threshold which isn't already marked today
        chosen_student = None
        chosen_distance = None
        found_candidate_within_threshold = False
        for (cand_student, cand_dist) in candidates:
            if cand_dist is None:
                continue
            if cand_dist > 0 and cand_dist > STRICT_MATCH_THRESHOLD:
                # distance above strict threshold; skip
                continue
            found_candidate_within_threshold = True
            today = timezone.now().date()
            existing_att = Attendance.objects.filter(student=cand_student, date=today).first()
            if existing_att:
                # already marked, try next-best candidate
                continue
            # select this candidate for marking
            chosen_student = cand_student
            chosen_distance = cand_dist
            break

        if not chosen_student:
            if found_candidate_within_threshold:
                # All candidates within threshold were already marked
                print("All matched candidates already marked; not marking new attendance")
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass
                return Response({"error": "All matched candidates already marked"}, status=200)
            else:
                print("Error: Face did not match any student within threshold")
                RECENT_ATTENDANCE.appendleft(f"No match — {tmp_name}")
                _print_recent_attendance()
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass
                return Response({"error": "Face did not match"}, status=400)

        student = chosen_student

        # Check if attendance is already marked for today
        today = timezone.now().date()
        existing_att = Attendance.objects.filter(student=student, date=today).first()
        if existing_att:
            print(f"Attendance already marked for {student.roll_no}")
            return Response({
                "message": "Attendance already marked today",
                "name": student.name,
                "roll_no": student.roll_no,
                "class": student.class_group.name if student.class_group else None,
                "batch": student.batch.name if student.batch else None,
                "department": student.department.name if student.department else None,
                "time": existing_att.time.isoformat() if existing_att.time else None,
                "status": existing_att.status,
            })

        # Compute status and create record
        now_time = timezone.localtime(timezone.now()).time()
        CUTOFF_TIME = datetime_time(9, 0)
        LATE_TIME = datetime_time(9, 30)
        if now_time <= CUTOFF_TIME:
            status = "on_time"
        elif now_time <= LATE_TIME:
            status = "late"
        else:
            status = "late"

        attendance = Attendance.objects.create(
            student=student,
            date=timezone.localdate(),
            time=now_time,
            status=status,
            already_marked=True,
        )

        try:
            saved_path = save_attendance_image_from_path(path, student.roll_no)
            logger.info(f"Saved attendance image to {saved_path}")
        except Exception as e:
            logger.exception("Failed to save attendance image: %s", e)
            saved_path = None
        finally:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass

        # copy to weekday folder and prune older files
        try:
            if saved_path and os.path.exists(saved_path):
                weekday = attendance.date.strftime("%A")
                dest_dir = os.path.join(settings.MEDIA_ROOT, "attendance_weekday", weekday)
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, f"{student.roll_no}.jpg")
                shutil.copy2(saved_path, dest_path)

                now_ts = datetime.now().timestamp()
                seven_days = 7 * 24 * 3600
                for fname in os.listdir(dest_dir):
                    fpath = os.path.join(dest_dir, fname)
                    try:
                        if os.path.isfile(fpath):
                            mtime = os.path.getmtime(fpath)
                            if (now_ts - mtime) > seven_days:
                                os.remove(fpath)
                    except Exception:
                        logger.exception("Failed to prune file %s", fpath)
        except Exception:
            logger.exception("Failed to copy/prune weekday attendance images")

        print(f"Attendance marked for {student.name}")
        RECENT_ATTENDANCE.appendleft(f"Attendance marked for id {student.roll_no}")
        _print_recent_attendance()
        return Response({
            "message": f"Attendance marked for {student.name}",
            "name": student.name,
            "roll_no": student.roll_no,
            "class": student.class_group.name if student.class_group else None,
            "batch": student.batch.name if student.batch else None,
            "department": student.department.name if student.department else None,
            "time": attendance.time.isoformat() if attendance.time else None,
            "status": attendance.status,
        })


class MostAbsentAPIView(APIView):
    def get(self, request):
        days = int(request.query_params.get("days", 7))
        class_id = request.query_params.get("class_id")  # optional filter
        end = timezone.localdate()
        start = end - timedelta(days=days-1)
        # count present per student in range:
        present_qs = Attendance.objects.filter(date__range=(start, end))
        if class_id:
            present_qs = present_qs.filter(student__class_group_id=class_id)
        present_counts = present_qs.values('student_id', 'student__roll_no', 'student__name', 'student__class_group__name')\
                                   .annotate(presents=Count('id'))
        # build dict by student
        presents_map = {p['student_id']: p for p in present_counts}
        # students to evaluate
        students = Student.objects.all()
        if class_id:
            students = students.filter(class_group_id=class_id)
        total_days = days
        result = []
        for s in students:
            p = presents_map.get(s.id)
            presents = p['presents'] if p else 0
            absences = total_days - presents
            result.append({"roll_no": s.roll_no, "name": s.name, "class": s.class_group and s.class_group.name, "presents": presents, "absences": absences})
        # sort by absences desc
        result.sort(key=lambda x: x['absences'], reverse=True)
        return Response({"period_days": total_days, "start": start, "end": end, "data": result})

class ExportAttendanceExcelAPIView(APIView):
    def get(self, request):
        days = int(request.query_params.get("days", 7))
        end = timezone.localdate()
        start = end - timedelta(days=days-1)
        qs = Attendance.objects.filter(date__range=(start, end)).select_related('student','student__class_group')
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Date","Roll No","Name","Class","Present"])
        for a in qs.order_by('date'):
            ws.append([a.date.isoformat(), a.student.roll_no, a.student.name, a.student.class_group and a.student.class_group.name or "", bool(a.status)])
        resp = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        resp['Content-Disposition'] = f'attachment; filename=attendance_{start}_{end}.xlsx'
        wb.save(resp)
        return resp

from rest_framework import status
from django.db.models import Q
from rest_framework import generics
from .serializers import AttendanceSerializer

class StudentAttendanceDetail(APIView):
    """
    Returns attendance stats and records for a student.
    Query params:
      - date_from (YYYY-MM-DD, optional)
      - date_to (YYYY-MM-DD, optional)
    """
    def get(self, request, roll_no):
        date_from = request.GET.get("date_from")
        date_to = request.GET.get("date_to")
        try:
            student = Student.objects.select_related("class_group", "batch", "department").get(roll_no=roll_no)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

        qs = Attendance.objects.filter(student=student)

        # Parse date filters safely
        start = end = None
        try:
            if date_from:
                start = datetime.strptime(date_from, "%Y-%m-%d").date()
                qs = qs.filter(date__gte=start)
            if date_to:
                end = datetime.strptime(date_to, "%Y-%m-%d").date()
                qs = qs.filter(date__lte=end)
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        if start is None or end is None:
            if qs.exists():
                start = qs.order_by("date").first().date
                end = qs.order_by("-date").first().date

        # Build date range and counts
        all_dates = []
        if start and end and end >= start:
            delta = (end - start).days
            all_dates = [start + timedelta(days=i) for i in range(delta + 1)]

        present_days = qs.count()
        present_dates = set(qs.values_list("date", flat=True))
        absent_days = len([d for d in all_dates if d not in present_dates]) if all_dates else 0
        total_days = len(all_dates) if all_dates else present_days

        # Status breakdown - now use the status field directly from model
        status_counts = {"on_time": 0, "late": 0}

        for att in qs:
            if att.status == "on_time":
                status_counts["on_time"] += 1
            elif att.status == "late":
                status_counts["late"] += 1

        # Build records with id field for editing
        records = [
            {
                "id": a.id,
                "attendanceId": a.id,  # alias for compatibility
                "date": a.date.isoformat(),
                "time": (a.time.isoformat() if a.time else None),
                "status": a.status,
            }
            for a in qs.order_by("-date")
        ]

        return Response({
            "roll_no": student.roll_no,
            "name": student.name,
            "class": student.class_group.name if student.class_group else None,
            "batch": student.batch.name if student.batch else None,
            "department": student.department.name if student.department else None,
            "present_days": present_days,
            "absent_days": absent_days,
            "on_time_days": status_counts["on_time"],
            "late_days": status_counts["late"],
            "total_days": total_days,
            "records": records,
        })

class AttendanceUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    lookup_field = "pk"
    
    def patch(self, request, *args, **kwargs):
        """Handle PATCH request for partial updates"""
        try:
            return super().patch(request, *args, **kwargs)
        except Exception as e:
            logger.exception("Error updating attendance: %s", e)
            return Response(
                {"detail": f"Failed to update attendance: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class RecentAttendanceAPIView(APIView):
    """Return the in-memory recent attendance events (most recent first)."""
    def get(self, request):
        try:
            return Response({"recent": list(RECENT_ATTENDANCE)})
        except Exception as e:
            logger.exception("Failed to return recent attendance: %s", e)
            return Response({"recent": []})

class AdminAuthAPIView(APIView):
    """
    POST /api/admin/auth/
    Body: { "pin": "12345" }
    Returns: { "token": "<key>" } on success or 400 on failure.
    """
    def post(self, request):
        pin = request.data.get("pin", "")
        if not pin or not isinstance(pin, str):
            return Response({"error": "pin required"}, status=400)

        setting = AdminSetting.objects.first()
        if not setting or not setting.pin_hash:
            return Response({"error": "Admin PIN not set"}, status=400)

        if not check_password(pin, setting.pin_hash):
            return Response({"error": "Invalid PIN"}, status=400)

        key = secrets.token_hex(32)
        token = AdminToken.objects.create(key=key)
        return Response({"token": token.key})

class AdminAuthValidateAPIView(APIView):
    """
    GET /api/admin/auth/validate/
    Header: X-Admin-Token: <token>
    Returns: { "valid": true } or { "valid": false }
    """
    def get(self, request):
        token_key = request.headers.get("X-Admin-Token") or request.query_params.get("token")
        if not token_key:
            return Response({"valid": False}, status=401)
        try:
            token = AdminToken.objects.get(key=token_key)
        except AdminToken.DoesNotExist:
            return Response({"valid": False}, status=401)
        if token.is_expired():
            token.delete()
            return Response({"valid": False}, status=401)
        return Response({"valid": True})

class AdminPinAPIView(APIView):
    """
    POST /api/admin/pin/
    Body: { "current_pin": "...", "pin": "new5digits" }
    If a PIN already exists, current_pin must match.
    """
    def post(self, request):
        new_pin = request.data.get("pin", "")
        current_pin = request.data.get("current_pin", "")
        if not new_pin or not isinstance(new_pin, str) or not new_pin.isdigit() or len(new_pin) != 5:
            return Response({"error": "New PIN must be 5 digits"}, status=400)

        setting = AdminSetting.objects.first()
        if setting and setting.pin_hash:
            # require current_pin
            if not current_pin or not check_password(current_pin, setting.pin_hash):
                return Response({"error": "Current PIN incorrect"}, status=403)

        # Save/replace PIN hash
        hashed = make_password(new_pin)
        if not setting:
            setting = AdminSetting.objects.create(pin_hash=hashed)
        else:
            setting.pin_hash = hashed
            setting.save()
        return Response({"message": "PIN updated"}, status=200)

# --- DEBUG-only reset endpoint ---
class AdminPinResetAPIView(APIView):
    """
    POST /api/admin/pin/reset-default/
    DEBUG-only endpoint: resets admin PIN in database to DEFAULT_RESET_PIN and
    revokes existing admin tokens. Only works when settings.DEBUG is True.
    Remove this endpoint in production.
    """
    DEFAULT_RESET_PIN = "12345"

    def post(self, request):
        if not settings.DEBUG:
            return Response({"error": "Not allowed in production"}, status=403)

        hashed = make_password(self.DEFAULT_RESET_PIN)
        setting = AdminSetting.objects.first()
        if not setting:
            setting = AdminSetting.objects.create(pin_hash=hashed)
        else:
            setting.pin_hash = hashed
            setting.save()

        # Revoke any existing admin tokens so clients must re-authenticate
        AdminToken.objects.all().delete()

        return Response({
            "message": "Admin PIN reset to default (DEBUG only).",
            "default_pin": self.DEFAULT_RESET_PIN,
        })