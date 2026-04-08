#!/usr/bin/env python3
import os
import sys
import json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "missing image path"}))
        sys.exit(2)
    image_path = sys.argv[1]
    exclude_arg = sys.argv[2] if len(sys.argv) > 2 else ""
    exclude_ids = []
    if exclude_arg:
        try:
            exclude_ids = [int(x) for x in exclude_arg.split(",") if x]
        except Exception:
            exclude_ids = []

    # ensure Django is configured
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smart_attendance.settings")
    try:
        import django
        django.setup()
    except Exception as e:
        print(json.dumps({"status": "error", "error": f"django setup failed: {e}"}))
        sys.exit(3)

    try:
        from attendance.utils.face_utils import match_face
    except Exception as e:
        print(json.dumps({"status": "error", "error": f"failed to import match_face: {e}"}))
        sys.exit(4)

    try:
        candidates = match_face(image_path, exclude_student_ids=exclude_ids)
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
        sys.exit(5)

    # Serialize result
    if candidates == "no_face":
        print(json.dumps({"status": "no_face"}))
        sys.exit(0)
    if not candidates:
        print(json.dumps({"status": "ok", "candidates": []}))
        sys.exit(0)

    out = []
    for person, dist in candidates:
        identifier = getattr(person, "roll_no", getattr(person, "employee_id", None))
        out.append({"id": identifier, "distance": float(dist) if dist is not None else None})

    print(json.dumps({"status": "ok", "candidates": out}))


if __name__ == "__main__":
    main()
