from rest_framework import serializers

from .models import Batch, ClassGroup, Department, Student


class StudentSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True, required=False)
    image_url = serializers.SerializerMethodField(read_only=True)
    qr_code_url = serializers.SerializerMethodField(read_only=True)
    department = serializers.SerializerMethodField(read_only=True)
    batch = serializers.SerializerMethodField(read_only=True)
    class_group = serializers.SerializerMethodField(read_only=True)

    # Write fields for FK relationships
    department_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    batch_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    class_group_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Student
        fields = [
            "id",
            "roll_no",
            "name",
            "face_encoding",
            "qr_code",
            "qr_code_url",
            "created_at",
            "image",
            "image_url",
            "department",
            "batch",
            "class_group",
            "department_id",
            "batch_id",
            "class_group_id",
        ]
        read_only_fields = [
            "face_encoding",
            "qr_code",
            "created_at",
            "image_url",
            "qr_code_url",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request") if hasattr(self, "context") else None
        if obj.image and hasattr(obj.image, "url"):
            try:
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
            except Exception:
                return None
        return None

    def get_qr_code_url(self, obj):
        request = self.context.get("request") if hasattr(self, "context") else None
        if obj.qr_code and hasattr(obj.qr_code, "url"):
            try:
                if request:
                    return request.build_absolute_uri(obj.qr_code.url)
                return obj.qr_code.url
            except Exception:
                return None
        return None

    def get_department(self, obj):
        if obj.department:
            return {"id": obj.department.id, "name": obj.department.name}
        return None

    def get_batch(self, obj):
        if obj.batch:
            return {"id": obj.batch.id, "name": obj.batch.name}
        return None

    def get_class_group(self, obj):
        if obj.class_group:
            return {"id": obj.class_group.id, "name": obj.class_group.name}
        return None

    def update(self, instance, validated_data):
        """Handle update with proper FK field handling"""
        # Handle FK fields
        if "department_id" in validated_data:
            dept_id = validated_data.pop("department_id")
            if dept_id:
                instance.department_id = dept_id
            else:
                instance.department = None

        if "batch_id" in validated_data:
            batch_id = validated_data.pop("batch_id")
            if batch_id:
                instance.batch_id = batch_id
            else:
                instance.batch = None

        if "class_group_id" in validated_data:
            class_group_id = validated_data.pop("class_group_id")
            if class_group_id:
                instance.class_group_id = class_group_id
            else:
                instance.class_group = None

        # Use default update for other fields
        return super().update(instance, validated_data)
