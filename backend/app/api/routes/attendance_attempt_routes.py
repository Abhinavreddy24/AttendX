from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db

from app.models.attendance_attempt import AttendanceAttempt
from app.models.student import Student
from app.models.qr_session import QRSession


router = APIRouter(
    prefix="/attendance-attempts",
    tags=["Attendance Attempts"]
)


# =========================================================
# GET FACULTY SUSPICIOUS ATTEMPTS
# =========================================================

@router.get("/faculty/{faculty_id}")
def get_faculty_suspicious_attempts(
    faculty_id: int,
    limit: int = 100,
    db: Session = Depends(get_db)
):

    if limit < 1:
        limit = 1

    if limit > 500:
        limit = 500

    rows = (
        db.query(
            AttendanceAttempt,
            Student,
            QRSession
        )
        .outerjoin(
            Student,
            Student.id ==
            AttendanceAttempt.student_id
        )
        .outerjoin(
            QRSession,
            QRSession.id ==
            AttendanceAttempt.qr_session_id
        )
        .filter(
            QRSession.faculty_id ==
            faculty_id
        )
        .order_by(
            AttendanceAttempt.attempted_at.desc()
        )
        .limit(limit)
        .all()
    )

    attempts = []

    for attempt, student, qr_session in rows:

        attempts.append({
            "id": attempt.id,

            "student_id":
                student.id
                if student
                else attempt.student_id,

            "student_code":
                student.student_id
                if student
                else None,

            "student_name":
                student.name
                if student
                else "Unknown Student",

            "qr_session_id":
                attempt.qr_session_id,

            "session_code":
                attempt.session_code
                or (
                    qr_session.session_code
                    if qr_session
                    else None
                ),

            "course_id":
                qr_session.course_id
                if qr_session
                else None,

            "attempt_type":
                attempt.attempt_type,

            "message":
                attempt.message,

            "attempted_at":
                attempt.attempted_at,

            "student_latitude":
                attempt.student_latitude,

            "student_longitude":
                attempt.student_longitude,

            "distance_from_classroom":
                attempt.distance_from_classroom,

        })

    return {
        "faculty_id": faculty_id,
        "total": len(attempts),
        "attempts": attempts
    }


# =========================================================
# GET SUSPICIOUS ATTEMPT COUNT
# =========================================================

@router.get("/faculty/{faculty_id}/count")
def get_faculty_suspicious_count(
    faculty_id: int,
    db: Session = Depends(get_db)
):

    count = (
        db.query(AttendanceAttempt)
        .join(
            QRSession,
            QRSession.id ==
            AttendanceAttempt.qr_session_id
        )
        .filter(
            QRSession.faculty_id ==
            faculty_id
        )
        .count()
    )

    return {
        "faculty_id": faculty_id,
        "count": count
    }