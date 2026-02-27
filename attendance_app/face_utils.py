import dlib
import numpy as np
from django.conf import settings
import os
from imutils import face_utils

# Construct absolute paths to the model files
POSE_PREDICTOR_68_POINT_PATH = os.path.join(settings.BASE_DIR, 'pretrained_models', 'shape_predictor_68_face_landmarks.dat')
POSE_PREDICTOR_5_POINT_PATH = os.path.join(settings.BASE_DIR, 'pretrained_models', 'shape_predictor_5_face_landmarks.dat')
FACE_ENCODER_PATH = os.path.join(settings.BASE_DIR, 'pretrained_models', 'dlib_face_recognition_resnet_model_v1.dat')

# Load the models
pose_predictor_68_point = dlib.shape_predictor(POSE_PREDICTOR_68_POINT_PATH)
pose_predictor_5_point = dlib.shape_predictor(POSE_PREDICTOR_5_POINT_PATH)
face_encoder = dlib.face_recognition_model_v1(FACE_ENCODER_PATH)
face_detector = dlib.get_frontal_face_detector()

def transform(image, face_locations):
    coord_faces = []
    for face in face_locations:
        rect = face.top(), face.right(), face.bottom(), face.left()
        coord_face = max(rect[0], 0), min(rect[1], image.shape[1]), min(rect[2], image.shape[0]), max(rect[3], 0)
        coord_faces.append(coord_face)
    return coord_faces

def encode_face(image):
    """
    Given an image, return the 128-dimension face encoding for the first face found.
    """
    face_locations = face_detector(image, 1)
    if not face_locations:
        return None, None, None

    # Find face landmarks for the first face
    face_location = face_locations[0]
    shape = pose_predictor_68_point(image, face_location)
    
    # Get the face encoding
    face_encoding = np.array(face_encoder.compute_face_descriptor(image, shape, num_jitters=5))
    
    # Get face location for drawing a box
    rect = face_location.top(), face_location.right(), face_location.bottom(), face_location.left()
    coord_face = max(rect[0], 0), min(rect[1], image.shape[1]), min(rect[2], image.shape[0]), max(rect[3], 0)

    landmarks = [(p.x, p.y) for p in shape.parts()]

    return face_encoding, coord_face, landmarks


def compare_faces(known_face_encoding, unknown_face_encoding, tolerance=settings.FACE_RECOGNITION_TOLERANCE):
    """
    Compare a known face encoding with an unknown face encoding and return True if they match.
    """
    if known_face_encoding is None or unknown_face_encoding is None:
        return False, 1.0

    distance = np.linalg.norm(known_face_encoding - unknown_face_encoding)
    is_match = distance <= tolerance
    return is_match, distance