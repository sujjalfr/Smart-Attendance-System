from django.contrib import admin
from .models import Attendance, TeacherAttendance, AdminSetting, AdminToken

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


@admin.register(AdminSetting)
class AdminSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'pin_hash_preview', 'updated_at')
    readonly_fields = ('updated_at',)

    def pin_hash_preview(self, obj):
        if not obj.pin_hash:
            return '(not set)'
        return f"{obj.pin_hash[:18]}..."

    pin_hash_preview.short_description = 'pin_hash'


@admin.register(AdminToken)
class AdminTokenAdmin(admin.ModelAdmin):
    list_display = ('key_preview', 'created_at', 'is_expired_now')
    readonly_fields = ('created_at',)
    search_fields = ('key',)
    ordering = ('-created_at',)

    def key_preview(self, obj):
        return f"{obj.key[:12]}..."

    key_preview.short_description = 'key'

    def is_expired_now(self, obj):
        return obj.is_expired()

    is_expired_now.boolean = True
    is_expired_now.short_description = 'expired'

