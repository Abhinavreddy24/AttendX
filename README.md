\# AttendX — Secure Dynamic QR-Based College Attendance Management System



AttendX is an intelligent college attendance management system designed to make classroom attendance more secure, accurate, and efficient. It combines dynamic QR codes, facial verification, and GPS-based location validation to reduce proxy attendance and unauthorized attendance marking.



\## Key Features



\- \*\*Dynamic QR Attendance:\*\* QR codes refresh every 3 seconds to prevent screenshot sharing and reuse.

\- \*\*Face Enrollment:\*\* First-time student face enrollment using DeepFace and ArcFace.

\- \*\*Face Verification:\*\* Verifies the student's live face against the enrolled face data.

\- \*\*GPS-Based Validation:\*\* Checks the student's distance from the classroom using geolocation.

\- \*\*Secure Authentication:\*\* Separate login access for administrators, faculty, and students.

\- \*\*Faculty Dashboard:\*\* Monitor live attendance, reports, and suspicious attendance attempts.

\- \*\*Attendance Reports:\*\* View attendance percentages and identify students requiring attention.

\- \*\*Duplicate Prevention:\*\* Backend validation helps prevent duplicate attendance entries.



\## Technology Stack



| Component | Technologies |

|---|---|

| Frontend | React.js, Vite, CSS |

| Backend | Python, FastAPI |

| Database | PostgreSQL |

| ORM | SQLAlchemy |

| Face Recognition | DeepFace, ArcFace |

| QR Code | Dynamic QR generation and scanning |

| Location Validation | GPS, Haversine formula |



\## System Workflow



1\. Student logs into AttendX.

2\. First-time students complete face enrollment.

3\. Faculty starts an attendance session.

4\. A dynamic QR code is generated and refreshed every 3 seconds.

5\. Student scans the QR code.

6\. The system verifies the student's face.

7\. The backend validates the QR session and GPS location.

8\. Attendance is recorded after successful validation.

9\. Faculty and students can view attendance information on their dashboards.



\## Project Structure



```text

AttendX/

├── backend/

│   ├── app/

│   │   ├── api/

│   │   │   └── routes/

│   │   ├── core/

│   │   ├── models/

│   │   ├── repositories/

│   │   ├── schemas/

│   │   └── services/

│   ├── requirements.txt

│   └── main application files

│

├── frontend/

│   ├── public/

│   ├── src/

│   │   ├── assets/

│   │   ├── pages/

│   │   ├── App.jsx

│   │   └── App.css

│   ├── package.json

│   └── vite.config.js

│

└── .gitignore

```



\## Local Development Setup



\### Prerequisites



\- Python 3.10 or compatible version

\- Node.js and npm

\- PostgreSQL

\- Git



\### 1. Clone the repository



```bash

git clone https://github.com/Abhinavreddy24/AttendX.git

cd AttendX

```



\### 2. Backend setup



```bash

cd backend

python -m venv venv

```



Activate the virtual environment on Windows:



```cmd

venv\\Scripts\\activate

```



Install backend dependencies:



```bash

pip install -r requirements.txt

```



Configure the PostgreSQL connection using a local environment file. Never commit database credentials or secrets.



Start the FastAPI server:



```bash

uvicorn app.main:app --reload

```



Backend API documentation:



```text

http://127.0.0.1:8000/docs

```



\### 3. Frontend setup



Open another terminal:



```bash

cd AttendX/frontend

npm install

npm run dev

```



Open the local Vite URL displayed in the terminal.



\## Security Considerations



\- Backend validation is used for attendance verification.

\- QR sessions have limited validity.

\- Face verification is part of the attendance workflow.

\- GPS distance is validated on the server.

\- Database credentials and private configuration must remain outside public source control.

\- Biometric data and student records must not be published in the repository.



\## Project Objective



The objective of AttendX is to provide a reliable and intelligent attendance management solution that reduces manual work, prevents common attendance fraud techniques, and improves transparency for students, faculty, and administrators.



\## Project Status



The source code has been uploaded to GitHub. Deployment and production configuration are ongoing.



\## Repository



\[GitHub — Abhinavreddy24/AttendX](https://github.com/Abhinavreddy24/AttendX)



\---



\*\*AttendX — Smarter Attendance. Stronger Verification.\*\*

