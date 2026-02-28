# Backend — Smart Attendance System

This file contains backend-specific quickstart, endpoints and developer tips.

Quickstart
1. Create & activate venv:
   python3 -m venv venv
   source venv/bin/activate
2. Install dependencies:
   pip install -r requirements.txt
3. Configure environment variables (SECRET_KEY, DEBUG, DATABASE credentials, MEDIA_ROOT).
4. Run migrations and create admin:
   python manage.py migrate
   python manage.py createsuperuser
5. Start server:
   python manage.py runserver

Primary endpoints
- POST /register/ — register student (roll_no, name, image)
- POST /attendance/ — verify and mark attendance (roll_no, image)

Developer notes
- face_encoding stored as BinaryField; reconstruct with numpy.frombuffer(..., dtype=np.float64).
- For environments where dlib can't be installed, consider a client-side approach using face-api.js and sending descriptors or verification results to backend.
- Always downscale client images before upload to reduce latency.

If you want an OpenAPI/Swagger spec or Postman collection for these endpoints, I can generate a minimal one.