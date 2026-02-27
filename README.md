# Smart Attendance System (Project-III-BCA)

Automated attendance system combining QR code identification and face recognition. Built with Django (REST backend) and optional React frontend. Designed to prevent proxy attendance and provide digital records.

Quick links
- Proposal: Proposal.md
- Setup: SETUP.md
- Backend quickstart: backend/readme.md

Highlights
- Student registration: photo upload → face encoding + QR generation
- QR-based check-in with live face verification
- Attendance stored with timestamp; admin export to CSV/Excel
- Supports server-side (dlib) or client-side (face-api.js) recognition

<!-- sudo systemctl stop mariadb
      sudo systemctl disable mariadb -->
first enable mariadb ```sudo systemctl start mariadb```

Getting started (dev)
1. Follow SETUP.md to install system packages and create venv.
2. Install backend dependencies:
   pip install -r backend/requirements.txt
3. Configure DB and environment variables.
4. Run migrations and start the server:
   cd backend
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver

Need more?
- To add a React demo (QR scanner + FaceScan), a Dockerfile, or an OpenAPI spec, request the artifact and it will be added.


