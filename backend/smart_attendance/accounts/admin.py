from django.contrib import admin
from .models import Student, Department, Batch, ClassGroup
from django.contrib import messages
import numpy as np

class StudentAdmin(admin.ModelAdmin):
    list_display = ('roll_no', 'name', 'created_at', 'face_encoding_display')
    search_fields = ('roll_no', 'name')
    list_filter = ('created_at',)
    exclude = ('qr_code',)
    readonly_fields = ('face_encoding_display',)

    def face_encoding_display(self, obj):
        if not obj.face_encoding or obj.face_encoding == b'':
            return " No encoding (attendance will not work)"
        
        try:
            arr = np.frombuffer(obj.face_encoding, dtype=np.float64)
            if np.all(arr == 0):
                return " Default empty encoding (zeros). Upload image to fix."
        except:
            pass

        if hasattr(obj, 'has_valid_encoding') and not obj.has_valid_encoding:
            return " Invalid encoding (not 128-dim float64)"
        return f" Encoding present ({len(obj.face_encoding)} bytes)"

    face_encoding_display.short_description = "Face encoding status"

    def save_model(self, request, obj, form, change): 
        is_default = False
        if obj.face_encoding:
             try:
                 arr = np.frombuffer(obj.face_encoding, dtype=np.float64)
                 if np.all(arr == 0):
                     is_default = True
             except:
                 pass

        if not obj.image and (not obj.face_encoding or obj.face_encoding == b'' or is_default):
            messages.warning(request, " No image provided. Face encoding cannot be generated automatically.")
        
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['image'].help_text = (
            " <b>Upload a clear face image here.</b> "
            "The system will automatically extract and save the face encoding when you click Save."
        )
        return form

admin.site.register(Student, StudentAdmin)
admin.site.register(Department)
admin.site.register(Batch)
admin.site.register(ClassGroup)