import face_recognition
import numpy as np
import time
try:
    import cv2
except Exception:
    cv2 = None

# Simple module-level cache for known encodings
_ENCODINGS_CACHE = None
_ENCODINGS_CACHE_TS = 0
_ENCODINGS_CACHE_TTL = 30.0  # seconds


def _load_encodings_from_db(exclude_student_ids=None):
    """Return list of (person_obj, encoding_np) for students (and teachers) excluding IDs."""
    from accounts.models import Student

    persons = []
    qs = Student.objects.all()
    if exclude_student_ids:
        qs = qs.exclude(id__in=exclude_student_ids)
    for student in qs:
        if not student.face_encoding:
            continue
        try:
            known_enc = np.frombuffer(student.face_encoding, dtype=np.float64)
        except Exception:
            continue
        if known_enc.shape[0] != 128:
            continue
        persons.append((student, known_enc))

    try:
        from accounts.models import Teacher
        for teacher in Teacher.objects.all():
            if not teacher.face_encoding:
                continue
            try:
                known_enc = np.frombuffer(teacher.face_encoding, dtype=np.float64)
            except Exception:
                continue
            if known_enc.shape[0] != 128:
                continue
            persons.append((teacher, known_enc))
    except Exception:
        pass

    return persons

def get_face_encoding(image_path):
    # Extracts a 128-dim float64 encoding from the image for storage
    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        print("No face found in registration image.")
        return None
    encoding = np.asarray(encodings[0], dtype=np.float64)
    print(f"Registration encoding (shape={encoding.shape}, dtype={encoding.dtype})")
    if encoding.shape[0] != 128:
        print("Warning: Registration encoding is not 128-dim!")
        return None
    return encoding.tobytes()


def match_face(unknown_image_path, threshold=0.6, exclude_student_ids=None):
    """
    Match an unknown image against stored face encodings.
    Improvements:
      - Accepts `exclude_student_ids` to skip students already marked today.
      - Uses a simple TTL cache for encodings when exclusions aren't provided.
      - Computes distances in batch (vectorized) for much better performance.

    Returns same types as before: "no_face", [], or list[(person, distance), ...]
    """
    from accounts.models import Student

    unknown_image = face_recognition.load_image_file(unknown_image_path)

    # Quick resize for performance: reduce very large images to a reasonable max dimension
    if cv2 is not None:
        try:
            h, w = unknown_image.shape[:2]
            max_dim = max(h, w)
            max_allowed = 800
            if max_dim > max_allowed:
                scale = max_allowed / float(max_dim)
                new_w, new_h = int(w * scale), int(h * scale)
                unknown_image = cv2.resize(unknown_image, (new_w, new_h), interpolation=cv2.INTER_AREA)
                print(f"Resized attendance image to {(new_w, new_h)} for speed (scale={scale:.2f})")
        except Exception as e:
            print("Resize fallback failed:", e)

    # Strategy attempts in order. Each step may populate `unknown_encs`.
    unknown_encs = []

    # 1) Default encodings
    try:
        unknown_encs = face_recognition.face_encodings(unknown_image)
        if unknown_encs:
            print("Found encodings with default detector")
    except Exception as e:
        print("Default face_encodings failed:", e)

    # 2) Try face_locations with small upsample (hog)
    if not unknown_encs:
        try:
            print("Default encodings empty, trying face_locations (hog) upsample=1")
            locations = face_recognition.face_locations(unknown_image, model='hog', number_of_times_to_upsample=1)
            if locations:
                unknown_encs = face_recognition.face_encodings(unknown_image, known_face_locations=locations)
                print(f"Found {len(unknown_encs)} encodings with hog upsample=1")
        except Exception as e:
            print("hog face_locations failed:", e)

    # 3) Try hog upsample=2
    if not unknown_encs:
        try:
            print("Trying face_locations (hog) upsample=2")
            locations = face_recognition.face_locations(unknown_image, model='hog', number_of_times_to_upsample=2)
            if locations:
                unknown_encs = face_recognition.face_encodings(unknown_image, known_face_locations=locations)
                print(f"Found {len(unknown_encs)} encodings with hog upsample=2")
        except Exception as e:
            print("hog upsample=2 failed:", e)

    # 4) Try cnn (if available)
    if not unknown_encs:
        try:
            print("hog failed, trying face_locations (cnn) upsample=1")
            locations = face_recognition.face_locations(unknown_image, model='cnn', number_of_times_to_upsample=1)
            if locations:
                unknown_encs = face_recognition.face_encodings(unknown_image, known_face_locations=locations)
                print(f"Found {len(unknown_encs)} encodings with cnn")
        except Exception as e:
            print("cnn face_locations failed or not available:", e)

    # 5) If still not found, try resizing the image (upsample) and retry encoding/detection
    if not unknown_encs and cv2 is not None:
        try:
            print("Trying resizing + equalization fallbacks (cv2 available)")
            # Work on a copy; face_recognition expects RGB
            img_rgb = unknown_image
            scales = [1.5, 2.0]
            for s in scales:
                try:
                    h, w = img_rgb.shape[:2]
                    new_w, new_h = int(w * s), int(h * s)
                    resized = cv2.resize(img_rgb, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
                    # Try equalizing Y channel in YCrCb
                    try:
                        ycrcb = cv2.cvtColor(resized, cv2.COLOR_RGB2YCrCb)
                        y, cr, cb = cv2.split(ycrcb)
                        y_eq = cv2.equalizeHist(y)
                        ycrcb_eq = cv2.merge((y_eq, cr, cb))
                        resized_eq = cv2.cvtColor(ycrcb_eq, cv2.COLOR_YCrCb2RGB)
                    except Exception:
                        resized_eq = resized

                    # Try encodings directly
                    encs = face_recognition.face_encodings(resized_eq)
                    if encs:
                        unknown_encs = encs
                        print(f"Found {len(unknown_encs)} encodings after resizing scale {s}")
                        break

                    # Try locations on resized image
                    locs = face_recognition.face_locations(resized_eq, model='hog')
                    if locs:
                        encs = face_recognition.face_encodings(resized_eq, known_face_locations=locs)
                        if encs:
                            unknown_encs = encs
                            print(f"Found {len(unknown_encs)} encodings after resized hog locations scale {s}")
                            break
                except Exception as e:
                    print(f"Resizing attempt scale {s} failed:", e)
        except Exception as e:
            print("Resizing fallbacks failed:", e)

    if not unknown_encs:
        print("No face detected in attendance image after fallbacks.")
        return "no_face"

    unknown_enc = np.asarray(unknown_encs[0], dtype=np.float64)
    print(f"Unknown encoding (shape={unknown_enc.shape}, dtype={unknown_enc.dtype})")

    # Load known encodings (with simple TTL cache). Cache used only when exclude_student_ids is None
    persons = None
    global _ENCODINGS_CACHE, _ENCODINGS_CACHE_TS
    now_ts = time.time()
    if exclude_student_ids:
        persons = _load_encodings_from_db(exclude_student_ids=exclude_student_ids)
    else:
        if _ENCODINGS_CACHE and (now_ts - _ENCODINGS_CACHE_TS) < _ENCODINGS_CACHE_TTL:
            persons = _ENCODINGS_CACHE
        else:
            persons = _load_encodings_from_db(exclude_student_ids=None)
            _ENCODINGS_CACHE = persons
            _ENCODINGS_CACHE_TS = now_ts

    if not persons:
        print("No stored encodings available to compare.")
        return []

    # Build arrays for vectorized distance computation
    known_encs = [p[1] for p in persons]
    people = [p[0] for p in persons]

    # Compute distances in batch (much faster than per-item loop)
    try:
        dists = face_recognition.face_distance(known_encs, unknown_enc)
    except Exception as e:
        print("Batch face_distance failed, falling back to per-item:", e)
        candidates = []
        for person, known_enc in zip(people, known_encs):
            try:
                d = face_recognition.face_distance([known_enc], unknown_enc)[0]
            except Exception:
                continue
            candidates.append((person, float(d)))
    else:
        candidates = [(person, float(d)) for person, d in zip(people, dists)]

    # sort ascending by distance
    if not candidates:
        print("No matching candidates found.")
        return []

    candidates.sort(key=lambda t: t[1])
    best_person, best_dist = candidates[0]
    display_id = getattr(best_person, 'roll_no', getattr(best_person, 'employee_id', 'unknown'))
    print(f"Best match: {display_id} with distance {best_dist}")

    return candidates