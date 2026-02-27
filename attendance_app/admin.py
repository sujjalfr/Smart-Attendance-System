from django.contrib import admin
from django.utils.html import format_html
from .models import Student, Attendance

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['name', 'student_id', 'email', 'created_at', 'photo_tag', 'qr_code_tag']
    search_fields = ['name', 'student_id', 'email']
    readonly_fields = ['photo_tag', 'qr_code_tag']

    def photo_tag(self, obj):
        if obj.photo:
            return format_html('<img src="{}" style="height:80px;"/>', obj.photo.url)
        return "-"
    photo_tag.short_description = 'Photo'

    def qr_code_tag(self, obj):
        if obj.qr_code:
            return format_html('<img src="{}" style="height:80px;"/>', obj.qr_code.url)
        return "-"
    qr_code_tag.short_description = 'QR Code'

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['student', 'date', 'time', 'verification_method']
    list_filter = ['date', 'verification_method']
    search_fields = ['student__name', 'student__student_id']
