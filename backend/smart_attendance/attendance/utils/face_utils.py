import face_recognition
import numpy as np
try:
    import cv2
except Exception:
    cv2 = None

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


def match_face(unknown_image_path, threshold=0.6):
    """
    Match an unknown image against all students' stored face encodings.
    Returns:
        - "no_face" if no face detected in the unknown image
        - [] (empty list) if there are no stored encodings to compare
        - A list of tuples [(student, distance), ...] sorted by distance ascending when faces are found

    The caller should inspect distances and decide which candidate to use.
    """
    from accounts.models import Student

    unknown_image = face_recognition.load_image_file(unknown_image_path)

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

    candidates = []

    # Iterate all students and compute distance to each stored encoding
    for student in Student.objects.all():
        if not student.face_encoding:
            continue
        try:
            known_enc = np.frombuffer(student.face_encoding, dtype=np.float64)
        except Exception:
            print(f"Failed to read encoding for {getattr(student, 'roll_no', 'unknown')}")
            continue
        if known_enc.shape[0] != 128:
            print(f"Skipping student {getattr(student, 'roll_no', 'unknown')}: invalid encoding shape {known_enc.shape}")
            continue

        # compute distance (lower is more similar)
        d = face_recognition.face_distance([known_enc], unknown_enc)[0]
        print(f"Distance for {getattr(student, 'roll_no', 'unknown')}: {d}")
        candidates.append((student, float(d)))

    if not candidates:
        print("No stored encodings available to compare.")
        return []

    # sort ascending by distance
    candidates.sort(key=lambda t: t[1])
    best_student, best_dist = candidates[0]
    print(f"Best match: {getattr(best_student, 'roll_no', 'unknown')} with distance {best_dist}")

    # return the full ranked list; caller will decide which candidate to accept
    return candidates