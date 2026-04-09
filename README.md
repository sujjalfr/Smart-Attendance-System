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


improve the ui it looks very bad 
for each student take email also if absent then send email if absent student 
for teachers also attendance 

time can be edited from setting which time it is considered late which is hardcoded now to be dynamic and under settings of admin page time set for each department. for some students there might be different time like science/BIT student have to come at 10:00 evening class and bca should be at morning set time for each of the class dynamic from setting page


why is attendance doing very slow it does attendance but does not do properly i thought it had some number to set the intensity of face comparison #codebase find the value where is it place and how much is the limit value that can be set for face capture .

why is face capture savign new iamges again and again in 7saturday folder but it is sunday also it is saving images again and again why is it fix that do not save unwanted images #codebase /home/sujjalbtw/Projects/Smart-Attendance-System/backend/smart_attendance/media/temp/7saturday it is saving in sunday which is good but in saturday folder it is saving and saving after each face scan fix that 


Loading students from: http://127.0.0.1:8000/api/students/?page_size=1000
HomePage.jsx:121 Loading students from: http://127.0.0.1:8000/api/students/?page_size=1000
HomePage.jsx:121 Loading students from: http://127.0.0.1:8000/api/students/?page_size=1000
HomePage.jsx:121 Loading students from: http://127.0.0.1:8000/api/students/?page_size=1000
HomePage.jsx:175 Calculating metrics... {attendanceLength: 0, studentsLength: 0}
HomePage.jsx:181 No attendance data this in console but the data is not being after i enter pin and go to /home route the data seems to be not loaded maybe it is because of page_size=1000 or what after few seconds the data gets loaded in ui why is it happening fix the data loading slow in the /home route after i exit / route face scan route and go to admin route the page data not loaded the ui renders but it has no data - in all the data 

[08/Apr/2026 10:49:39] "GET /api/attendanceStatus/list/ HTTP/1.1" 200 5219
[08/Apr/2026 10:49:44] "GET /api/attendanceStatus/list/ HTTP/1.1" 200 5219
[08/Apr/2026 10:49:44] "GET /api/attendanceStatus/list/ HTTP/1.1" 200 5219
[08/Apr/2026 10:49:49] "GET /api/attendanceStatus/list/ HTTP/1.1" 200 5219
[08/Apr/2026 10:49:52] "GET /api/departments/ HTTP/1.1" 200 85
[08/Apr/2026 10:49:52] "GET /api/classgroups/ HTTP/1.1" 200 838
[08/Apr/2026 10:49:52] "GET /api/batches/ HTTP/1.1" 200 108
[08/Apr/2026 10:49:52] "GET /api/classgroups/ HTTP/1.1" 200 838
[08/Apr/2026 10:49:52] "GET /api/departments/ HTTP/1.1" 200 85
[08/Apr/2026 10:49:52] "GET /api/batches/ HTTP/1.1" 200 108
[08/Apr/2026 10:49:52] "GET /api/students/?page_size=1000 HTTP/1.1" 200 57935
[08/Apr/2026 10:49:52] "GET /api/students/?page_size=1000 HTTP/1.1" 200 57935
[08/Apr/2026 10:49:52] "GET /api/attendanceStatus/list/ HTTP/1.1" 200 5219
[08/Apr/2026 10:49:52] "GET /api/attendanceStatus/list/ HTTP/1.1" 200 5219
[08/Apr/2026 10:49:55] "GET /api/attendance/recent/ HTTP/1.1" 200 13
[08/Apr/2026 10:49:55] "GET /api/attendance/recent/ HTTP/1.1" 200 13
Received attendance request
Image: face.jpg
Default encodings empty, trying face_locations (hog) upsample=1
Trying face_locations (hog) upsample=2
hog failed, trying face_locations (cnn) upsample=1
Trying resizing + equalization fallbacks (cv2 available)
[08/Apr/2026 10:50:52] "GET /api/departments/ HTTP/1.1" 200 85
[08/Apr/2026 10:50:52] "GET /api/classgroups/ HTTP/1.1" 200 838
[08/Apr/2026 10:50:52] "GET /api/batches/ HTTP/1.1" 200 108
Received attendance request
Image: face.jpg
[08/Apr/2026 10:50:52] "GET /api/attendance/recent/ HTTP/1.1" 200 13
[08/Apr/2026 10:50:52] "GET /api/batches/ HTTP/1.1" 200 108
[08/Apr/2026 10:50:52] "GET /api/departments/ HTTP/1.1" 200 85
[08/Apr/2026 10:50:52] "GET /api/classgroups/ HTTP/1.1" 200 838
[08/Apr/2026 10:50:52] "GET /api/students/?page_size=1000 HTTP/1.1" 200 57935
[08/Apr/2026 10:50:53] "GET /api/attendance/recent/ HTTP/1.1" 200 13
[08/Apr/2026 10:50:53] "GET /api/attendance/recent/ HTTP/1.1" 200 13
[08/Apr/2026 10:50:53] "GET /api/batches/ HTTP/1.1" 200 108
[08/Apr/2026 10:50:53] "GET /api/students/?page_size=1000 HTTP/1.1" 200 57935
[08/Apr/2026 10:50:53] "GET /api/departments/ HTTP/1.1" 200 85
(venv310) 
 ✘  Wed  8 Apr - 10:51  ~/Projects/Smart-Attendance-System/backend/smart_attendance   origin ☊ main ↑3 2● 1‒ 
 @sujjalbtw   it automatically crashed after some time what is the issue fix that #codebase i think when i try to go to admin page using 5 digit pin and when i click on enter button of pin it crashes maybe because of 1000 page trying to load