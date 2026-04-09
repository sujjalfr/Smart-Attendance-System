from django.apps import AppConfig


class AttendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'attendance'
    def ready(self):
        # import signals to ensure they are registered
        try:
            from . import signals  # noqa: F401
        except Exception:
            pass
        # Warm face encodings cache in background to avoid slow first-match delays
        try:
            from .utils import face_utils
            import threading
            import logging
            logger = logging.getLogger(__name__)

            def _warm():
                try:
                    count, took = face_utils.warm_encodings()
                    logger.info("Preloaded %d face encodings in %.2fs", count, took)
                except Exception:
                    logger.exception("Failed to warm encodings")

            # Start a non-daemon thread so Python waits for it to finish during shutdown,
            # avoiding daemon-thread stdout lock issues.
            t = threading.Thread(target=_warm)
            t.start()
        except Exception:
            pass
