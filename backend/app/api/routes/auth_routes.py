from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.faculty import Faculty


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    # --------------------------------------------------
    # FIND USER
    # --------------------------------------------------

    user = (
        db.query(User)
        .filter(User.username == login_data.username)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # --------------------------------------------------
    # CHECK ACCOUNT STATUS
    # --------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    # --------------------------------------------------
    # VERIFY PASSWORD
    # PostgreSQL pgcrypto
    # --------------------------------------------------

    password_check = db.execute(
        text("""
            SELECT crypt(:password, :password_hash) = :password_hash
        """),
        {
            "password": login_data.password,
            "password_hash": user.password_hash
        }
    ).scalar()

    if not password_check:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # --------------------------------------------------
    # UPDATE LAST LOGIN
    # --------------------------------------------------

    user.last_login = datetime.now()

    # --------------------------------------------------
    # STUDENT LOGIN
    # --------------------------------------------------

    if user.role == "student":

        student = (
            db.query(Student)
            .filter(Student.user_id == user.id)
            .first()
        )

        if not student:
            raise HTTPException(
                status_code=500,
                detail="Student account is not linked correctly"
            )

        # Face enrollment is required ONLY when
        # there is no stored face embedding.
        face_enrollment_required = (
            student.face_embedding is None
            or student.face_embedding.strip() == ""
        )

        db.commit()

        return {
            "success": True,
            "user_id": user.id,
            "role": "student",

            # Login username
            "username": user.username,

            # College/student ID
            "student_id": student.student_id,

            # Actual PostgreSQL students.id
            # Required by face enrollment/verification
            "student_db_id": student.id,

            # Actual student name
            "name": student.name,

            # First login only
            "face_enrollment_required": face_enrollment_required
        }

    # --------------------------------------------------
    # FACULTY LOGIN
    # --------------------------------------------------

    if user.role == "faculty":

        faculty = (
            db.query(Faculty)
            .filter(Faculty.user_id == user.id)
            .first()
        )

        if not faculty:
            raise HTTPException(
                status_code=500,
                detail="Faculty account is not linked correctly"
            )

        db.commit()

        return {
            "success": True,
            "user_id": user.id,
            "role": "faculty",
            "username": user.username,
            "faculty_id": faculty.faculty_id,
            "name": faculty.name,
            "face_enrollment_required": False
        }

    # --------------------------------------------------
    # ADMIN LOGIN
    # --------------------------------------------------

    if user.role == "admin":

        db.commit()

        return {
            "success": True,
            "user_id": user.id,
            "role": "admin",
            "username": user.username,
            "name": "Administrator",
            "face_enrollment_required": False
        }

    # --------------------------------------------------
    # INVALID ROLE
    # --------------------------------------------------

    raise HTTPException(
        status_code=403,
        detail="Invalid account role"
    )