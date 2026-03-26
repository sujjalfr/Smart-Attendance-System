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
then check mariadb satus ```sudo systemctl status mariadb```


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


improve the ui it looks very bad 
for each student take email also if absent then send email if absent student 
for teachers also attendance 

time can be edited from setting which time it is considered late which is hardcoded now to be dynamic and under settings of admin page time set for each department. for some students there might be different time like science/BIT student have to come at 10:00 evening class and bca should be at morning set time for each of the class dynamic from setting page


why is attendance doing very slow it does attendance but does not do properly i thought it had some number to set the intensity of face comparison #codebase find the value where is it place and how much is the limit value that can be set for face capture .

why is face capture savign new iamges again and again in 7saturday folder but it is sunday also it is saving images again and again why is it fix that do not save unwanted images #codebase /home/sujjalbtw/Projects/Smart-Attendance-System/backend/smart_attendance/media/temp/7saturday it is saving in sunday which is good but in saturday folder it is saving and saving after each face scan fix that 