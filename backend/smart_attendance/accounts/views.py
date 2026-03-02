import logging
from django.conf import settings
import json
from django.views.decorators.csrf import csrf_exempt
from django.db import models
from django.http import JsonResponse
from django.shortcuts import render
from rest_framework import filters, generics, pagination, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from attendance.models import AdminToken

from .models import Batch, ClassGroup, Department, Student
from .serializers import StudentSerializer

logger = logging.getLogger(__name__)


def _admin_token_valid(request):
    token = request.headers.get("X-Admin-Token") or request.META.get("HTTP_X_ADMIN_TOKEN")
    # If token provided, validate normally
    if token:
        try:
            t = AdminToken.objects.get(key=token)
            return not t.is_expired()
        except AdminToken.DoesNotExist:
            return False

    # Development convenience: allow actions without token when DEBUG=True
    if getattr(settings, "DEBUG", False):
        logger.warning("Admin token not provided — allowing action because DEBUG=True")
        return True

    return False


@csrf_exempt
def departments_list(request):
    # GET: existing behavior
    if request.method == "GET":
        qs = Department.objects.order_by("name").values("id", "name")
        return JsonResponse(list(qs), safe=False)

    # POST: create new department (requires X-Admin-Token)
    if request.method == "POST":
        if not _admin_token_valid(request):
            return JsonResponse({"error": "Unauthorized"}, status=403)
        try:
            payload = json.loads(request.body.decode() or "{}")
            name = payload.get("name") or request.POST.get("name")
            if not name:
                return JsonResponse({"error": "Missing name"}, status=400)
            d = Department.objects.create(name=name)
            return JsonResponse({"id": d.id, "name": d.name}, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def department_detail(request, dept_id):
    if request.method == "DELETE":
        if not _admin_token_valid(request):
            return JsonResponse({"error": "Unauthorized"}, status=403)
        deleted, _ = Department.objects.filter(id=dept_id).delete()
        if deleted:
            return JsonResponse({"ok": True})
        return JsonResponse({"error": "Not found"}, status=404)
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def all_batches(request):
    # GET: existing behavior
    if request.method == "GET":
        qs = Batch.objects.order_by("name").values("id", "name")
        return JsonResponse(list(qs), safe=False)

    # POST: create batch
    if request.method == "POST":
        if not _admin_token_valid(request):
            return JsonResponse({"error": "Unauthorized"}, status=403)
        try:
            payload = json.loads(request.body.decode() or "{}")
            name = payload.get("name") or request.POST.get("name")
            if not name:
                return JsonResponse({"error": "Missing name"}, status=400)
            b = Batch.objects.create(name=name, start_year=payload.get("start_year"))
            return JsonResponse({"id": b.id, "name": b.name}, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def batch_detail(request, batch_id):
    if request.method == "DELETE":
        if not _admin_token_valid(request):
            return JsonResponse({"error": "Unauthorized"}, status=403)
        deleted, _ = Batch.objects.filter(id=batch_id).delete()
        if deleted:
            return JsonResponse({"ok": True})
        return JsonResponse({"error": "Not found"}, status=404)
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def all_classgroups(request):
    # GET: existing behavior
    if request.method == "GET":
        qs = (
            ClassGroup.objects.select_related("department", "batch")
            .order_by("name")
            .values(
                "id",
                "name",
                "department_id",
                "department__name",
                "batch_id",
                "batch__name",
            )
        )
        return JsonResponse(list(qs), safe=False)

    # POST: create class group
    if request.method == "POST":
        if not _admin_token_valid(request):
            return JsonResponse({"error": "Unauthorized"}, status=403)
        try:
            payload = json.loads(request.body.decode() or "{}")
            name = payload.get("name")
            dept_id = payload.get("department_id")
            batch_id = payload.get("batch_id")
            if not name:
                return JsonResponse({"error": "Missing name"}, status=400)
            dept = Department.objects.filter(id=dept_id).first() if dept_id else None
            batch = Batch.objects.filter(id=batch_id).first() if batch_id else None
            c = ClassGroup.objects.create(name=name, department=dept, batch=batch)
            return JsonResponse(
                {
                    "id": c.id,
                    "name": c.name,
                    "department_id": c.department.id if c.department else None,
                    "batch_id": c.batch.id if c.batch else None,
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def classgroup_detail(request, classgroup_id):
    if request.method == "DELETE":
        if not _admin_token_valid(request):
            return JsonResponse({"error": "Unauthorized"}, status=403)
        deleted, _ = ClassGroup.objects.filter(id=classgroup_id).delete()
        if deleted:
            return JsonResponse({"ok": True})
        return JsonResponse({"error": "Not found"}, status=404)
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def department_batches(request, dept_id):
    """
    GET: return batches that are linked via ClassGroup to the given department.
    This mirrors the previous behavior expected by the frontend.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    qs = (
        Batch.objects.filter(classgroup__department_id=dept_id)
        .distinct()
        .values("id", "name")
        .order_by("name")
    )
    return JsonResponse(list(qs), safe=False)


@csrf_exempt
def department_classgroups(request, dept_id):
    """
    GET: return class groups for a specific department.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    qs = ClassGroup.objects.filter(department_id=dept_id).values("id", "name", "batch_id")
    return JsonResponse(list(qs), safe=False)


@csrf_exempt
def batch_classgroups(request, batch_id):
    """
    GET: return class groups for a specific batch.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    qs = ClassGroup.objects.filter(batch_id=batch_id).values("id", "name", "department_id")
    return JsonResponse(list(qs), safe=False)


class RegisterStudent(APIView):
    def post(self, request):
        # handle file upload via DRF
        image = request.FILES.get("image")

        # Create student record first (Student.save() will generate QR if missing)
        student = Student.objects.create(
            roll_no=request.data.get("roll_no"),
            name=request.data.get("name"),
        )

        if image:
            # Save uploaded file to the Student.image field so Django stores it using upload_to
            student.image.save(image.name, image, save=True)

            # After the file is saved, compute face encoding from the saved file path
            try:
                encoding = get_face_encoding(student.image.path)
                if encoding:
                    student.face_encoding = encoding
                    # Update only face_encoding field
                    student.save(update_fields=["face_encoding"])
                else:
                    # No face found — keep default encoding (zeros) and log
                    print(
                        f"Warning: No face detected in uploaded image for {student.roll_no}"
                    )
            except Exception as e:
                print(f"Error extracting face encoding for {student.roll_no}: {e}")
        else:
            print("No image uploaded for student")

        # At this point:
        # - student.image points to the stored file path (media/students/...)
        # - student.qr_code has been generated/saved by the model's save() during create
        # - face_encoding is stored if extraction succeeded (otherwise default remains)
        print(f"Registered student {student.roll_no} (id={student.id})")
        return Response(
            {"message": "Student registered successfully", "id": student.id}
        )


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 200


class StudentListView(generics.ListAPIView):
    """API endpoint that returns students with filtering and pagination.

    Query params:
      - page (DRF page number)
      - page_size (optional)
      - date_from (YYYY-MM-DD)
      - date_to (YYYY-MM-DD)
      - batch (batch id)
      - department (department id)
      - search (search string for name or roll)
    """

    queryset = Student.objects.select_related(
        "department", "batch", "class_group"
    ).order_by("-created_at")
    serializer_class = StudentSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "roll_no"]

    def get_queryset(self):
        qs = Student.objects.select_related(
            "department", "batch", "class_group"
        ).order_by("-created_at")
        req = self.request
        date_from = req.GET.get("date_from")
        date_to = req.GET.get("date_to")
        batch = req.GET.get("batch")
        dept = req.GET.get("department")
        search = req.GET.get("search")

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if batch:
            qs = qs.filter(batch_id=batch)
        if dept:
            qs = qs.filter(department_id=dept)
        if search:
            qs = qs.filter(
                models.Q(name__icontains=search) | models.Q(roll_no__icontains=search)
            )

        return qs

    def list(self, request, *args, **kwargs):
        """Override to add debugging and ensure proper response format"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            print(f"DEBUG: Found {queryset.count()} students")

            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.exception("Error in StudentListView.list: %s", e)
            return Response(
                {"error": f"Failed to fetch students: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentDetailView(generics.RetrieveUpdateAPIView):
    queryset = Student.objects.select_related(
        "department", "batch", "class_group"
    ).all()
    serializer_class = StudentSerializer
    lookup_field = "pk"

    def patch(self, request, *args, **kwargs):
        """Handle PATCH for partial updates"""
        return self.partial_update(request, *args, **kwargs)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related(
        "department", "batch", "class_group"
    ).all()
    serializer_class = StudentSerializer

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for student updates"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            return Response(serializer.data)
        except Exception as e:
            logger.exception("Error updating student: %s", e)
            return Response(
                {"detail": f"Failed to update student: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
