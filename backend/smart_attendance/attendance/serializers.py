from rest_framework import serializers
from .models import Attendance
from datetime import time as datetime_time
from django.utils import timezone

class AttendanceSerializer(serializers.ModelSerializer):
    time = serializers.TimeField(format='%H:%M:%S', allow_null=True, required=False)
    alreadyMarked = serializers.BooleanField(source='already_marked', required=False)
    
    class Meta:
        model = Attendance
        fields = ['id', 'student', 'date', 'time', 'status', 'alreadyMarked']
        read_only_fields = ['student', 'date']
    
    def validate_time(self, value):
        """Validate time is in valid range"""
        if value is None:
            return value
        if not isinstance(value, datetime_time):
            raise serializers.ValidationError("Time must be a valid time value (HH:MM:SS)")
        return value
    
    def update(self, instance, validated_data):
        """Update time, status, and already_marked if provided"""
        if 'time' in validated_data:
            instance.time = validated_data['time']
        
        if 'already_marked' in validated_data:
            instance.already_marked = validated_data['already_marked']
        
        # Auto-compute status from time if not explicitly provided
        if instance.time:
            CUTOFF_TIME = datetime_time(9, 0)
            LATE_TIME = datetime_time(9, 30)
            if instance.time <= CUTOFF_TIME:
                instance.status = 'on_time'
            elif instance.time <= LATE_TIME:
                instance.status = 'late'
            else:
                instance.status = 'late'
        else:
            instance.status = 'absent'
        
        instance.save()
        return instance
