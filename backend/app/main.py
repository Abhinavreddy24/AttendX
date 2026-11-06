from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import student_routes
from app.api.routes import faculty_routes
from app.api.routes import qr_session_routes
from app.api.routes import attendance_routes
from app.api.routes import auth_routes
from app.api.routes import password_routes
from app.api.routes import course_routes

from app.api.routes.face_routes import router as face_routes

from app.api.routes.attendance_attempt_routes import (
    router as attendance_attempt_router
)

from app.api.routes import admin_routes

from app.models.attendance_attempt import AttendanceAttempt


app = FastAPI(
    title="AttendX API",
    description="Intelligent QR-Based College Attendance Management System",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# EXISTING ROUTES
# ============================================================

app.include_router(student_routes.router)
app.include_router(faculty_routes.router)
app.include_router(qr_session_routes.router)

app.include_router(face_routes)

app.include_router(attendance_attempt_router)

app.include_router(attendance_routes.router)

app.include_router(auth_routes.router)

app.include_router(password_routes.router)

app.include_router(course_routes.router)


# ============================================================
# ADMIN ROUTES
# ============================================================

app.include_router(admin_routes.router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "AttendX API is running",
        "status": "success"
    }