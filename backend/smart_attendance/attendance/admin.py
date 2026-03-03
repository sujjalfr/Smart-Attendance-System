from django.contrib import admin
from .models import Attendance

class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'date', 'time', 'status')
    list_filter = ('date', 'status')
    search_fields = ('student__name', 'student__roll_no')
    date_hierarchy = 'date'

admin.site.register(Attendance, AttendanceAdmin)

