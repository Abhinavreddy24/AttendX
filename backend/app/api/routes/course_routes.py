from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.course import Course


router = APIRouter(
    prefix="/courses",
    tags=["Courses"]
)


@router.get("/")
def get_courses(db: Session = Depends(get_db)):
    courses = (
        db.query(Course)
        .filter(Course.is_active == True)
        .order_by(Course.id)
        .all()
    )

    return [
        {
            "id": course.id,
            "course_code": course.course_code,
            "course_name": course.course_name,
            "department": course.department,
            "semester": course.semester,
            "is_active": course.is_active,
        }
        for course in courses
    ]