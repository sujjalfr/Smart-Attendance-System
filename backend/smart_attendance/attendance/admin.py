from django.contrib import admin
from .models import Attendance, TeacherAttendance

class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'date', 'time', 'status')
    list_filter = ('date', 'status')
    search_fields = ('student__name', 'student__roll_no')
    date_hierarchy = 'date'

admin.site.register(Attendance, AttendanceAdmin)


@admin.register(TeacherAttendance)
class TeacherAttendanceAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'date', 'time', 'status', 'already_marked')
    list_filter = ('date', 'status', 'already_marked')
    search_fields = ('teacher__name', 'teacher__employee_id')
    date_hierarchy = 'date'

