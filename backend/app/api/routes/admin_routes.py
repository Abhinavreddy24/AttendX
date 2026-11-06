from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db

from app.models.user import User
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.course import Course
from app.models.faculty_subject import FacultySubject


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ============================================================
# STUDENT ACCOUNTS
# ============================================================

@router.get("/students")
def get_student_accounts(
    db: Session = Depends(get_db)
):
    students = (
        db.query(Student)
        .order_by(Student.id.asc())
        .all()
    )

    result = []

    for student in students:

        user = None

        if student.user_id is not None:
            user = (
                db.query(User)
                .filter(User.id == student.user_id)
                .first()
            )

        result.append({
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "email": student.email,
            "department": student.department,
            "year": student.year,

            "user_id": student.user_id,

            "username": (
                user.username
                if user
                else None
            ),

            "account_active": (
                user.is_active
                if user
                else False
            ),

            "student_active": student.is_active,

            "must_change_password": (
                user.must_change_password
                if user
                else None
            ),

            "last_login": (
                user.last_login.isoformat()
                if user and user.last_login
                else None
            ),

            "created_at": (
                student.created_at.isoformat()
                if student.created_at
                else None
            ),
        })

    return {
        "success": True,
        "count": len(result),
        "students": result,
    }


# ============================================================
# FACULTY ACCOUNTS
# ============================================================

@router.get("/faculty")
def get_faculty_accounts(
    db: Session = Depends(get_db)
):
    faculty_members = (
        db.query(Faculty)
        .order_by(Faculty.id.asc())
        .all()
    )

    result = []

    for faculty in faculty_members:

        user = None

        if faculty.user_id is not None:
            user = (
                db.query(User)
                .filter(User.id == faculty.user_id)
                .first()
            )

        # ----------------------------------------------------
        # GET FACULTY SUBJECT ASSIGNMENTS
        # ----------------------------------------------------

        assignments = (
            db.query(FacultySubject, Course)
            .join(
                Course,
                FacultySubject.subject_id == Course.id
            )
            .filter(
                FacultySubject.faculty_id == faculty.id,
                FacultySubject.is_active == True
            )
            .order_by(Course.id.asc())
            .all()
        )

        subjects = []

        for assignment, course in assignments:
            subjects.append({
                "id": course.id,
                "course_code": course.course_code,
                "course_name": course.course_name,
                "department": course.department,
                "semester": course.semester,
                "academic_year": assignment.academic_year,
            })

        result.append({
            "id": faculty.id,
            "faculty_id": faculty.faculty_id,
            "name": faculty.name,
            "email": faculty.email,
            "department": faculty.department,

            "user_id": faculty.user_id,

            "username": (
                user.username
                if user
                else None
            ),

            "account_active": (
                user.is_active
                if user
                else False
            ),

            "faculty_active": faculty.is_active,

            "must_change_password": (
                user.must_change_password
                if user
                else None
            ),

            "last_login": (
                user.last_login.isoformat()
                if user and user.last_login
                else None
            ),

            "subjects": subjects,

            "subject_count": len(subjects),

            "created_at": (
                faculty.created_at.isoformat()
                if faculty.created_at
                else None
            ),
        })

    return {
        "success": True,
        "count": len(result),
        "faculty": result,
    }