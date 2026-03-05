"""
URL configuration for smart_attendance project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1.  Import the include() function: from django.urls import include, path
    2.  Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from accounts.views import (
    StudentViewSet,
    StudentListView,
    departments_list,
    department_detail,
    department_batches,
    department_classgroups,
    all_batches,
    batch_detail,
    batch_classgroups,
    all_classgroups,
    classgroup_detail,
    RegisterStudent,  # <-- expose register/ endpoint
)
from attendance.views import (
    AttendanceStatus, AttendanceStatusList, MarkAttendance,
    MostAbsentAPIView, ExportAttendanceExcelAPIView,
    StudentAttendanceDetail, AttendanceUpdateAPIView,
    AdminAuthAPIView, AdminAuthValidateAPIView, AdminPinAPIView,
    AdminPinResetAPIView,
)
from attendance.views import RecentAttendanceAPIView

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')

urlpatterns = [
    path('admin/', admin.site.urls),
    # Registration endpoint used by frontend AddStudent to compute & save face encodings
    path('register/', RegisterStudent.as_view()),
    path('api/', include(router.urls)),
    path('api/attendanceStatus/', AttendanceStatus.as_view()),
    path('api/attendanceStatus/list/', AttendanceStatusList.as_view()),
    path('api/attendance/', MarkAttendance.as_view()),
    path('api/attendance/<int:pk>/', AttendanceUpdateAPIView.as_view()),
    path('api/student/<str:roll_no>/attendance/', StudentAttendanceDetail.as_view()),
    path('api/students/', StudentListView.as_view()),
    path('api/departments/', departments_list),
    path('api/departments/<int:dept_id>/', department_detail),
    path('api/departments/<int:dept_id>/batches/', department_batches),
    path('api/departments/<int:dept_id>/classgroups/', department_classgroups),
    path('api/batches/', all_batches),
    path('api/batches/<int:batch_id>/', batch_detail),
    path('api/batches/<int:batch_id>/classgroups/', batch_classgroups),
    path('api/classgroups/', all_classgroups),
    path('api/classgroups/<int:classgroup_id>/', classgroup_detail),

    # Admin PIN / auth endpoints
    path('api/admin/auth/', AdminAuthAPIView.as_view()),
    path('api/admin/auth/validate/', AdminAuthValidateAPIView.as_view()),
    path('api/admin/pin/', AdminPinAPIView.as_view()),
    # DEBUG-only: reset admin PIN to default (remove in production)
    path('api/admin/pin/reset-default/', AdminPinResetAPIView.as_view()),
    path('api/attendance/recent/', RecentAttendanceAPIView.as_view()),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
