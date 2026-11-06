
from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.models.faculty import Faculty
from app.models.faculty_subject import FacultySubject

from app.schemas.faculty_schema import (
    FacultyCreate,
    FacultyResponse,
)


router = APIRouter(
    prefix="/faculty",
    tags=["Faculty"]
)


# ============================================================
# CREATE FACULTY
# ============================================================

@router.post(
    "/",
    response_model=FacultyResponse
)
def create_faculty(
    faculty: FacultyCreate,
    db: Session = Depends(get_db)
):
    existing_faculty = db.query(Faculty).filter(
        Faculty.faculty_id == faculty.faculty_id
    ).first()

    if existing_faculty:
        raise HTTPException(
            status_code=400,
            detail="Faculty ID already exists"
        )

    existing_email = db.query(Faculty).filter(
        Faculty.email == faculty.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    new_faculty = Faculty(
        faculty_id=faculty.faculty_id,
        name=faculty.name,
        email=faculty.email,
        department=faculty.department
    )

    db.add(new_faculty)
    db.commit()
    db.refresh(new_faculty)

    return new_faculty


# ============================================================
# GET ALL FACULTY
# ============================================================

@router.get(
    "/",
    response_model=list[FacultyResponse]
)
def get_faculty(
    db: Session = Depends(get_db)
):
    return db.query(Faculty).all()


# ============================================================
# GET SINGLE FACULTY BY DATABASE ID
# ============================================================

@router.get(
    "/{faculty_id}",
    response_model=FacultyResponse
)
def get_single_faculty(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(
        Faculty.id == faculty_id
    ).first()

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )

    return faculty


# ============================================================
# GET SUBJECT COUNT BY COLLEGE FACULTY ID
#
# Example:
# /faculty/FAC003/subjects/count
#
# FAC003 -> faculty.faculty_id
#
# Then we internally use faculty.id to query
# faculty_subjects.faculty_id
# ============================================================

@router.get(
    "/{faculty_id}/subjects/count"
)
def get_faculty_subject_count(
    faculty_id: str,
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # Find faculty using the actual college Faculty ID
    # Example: FAC003
    # --------------------------------------------------------

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == faculty_id
    ).first()

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail=f"Faculty with ID '{faculty_id}' not found"
        )

    # --------------------------------------------------------
    # Find unique active subjects assigned to this faculty
    #
    # faculty_subjects.faculty_id points to faculty.id
    # faculty_subjects.subject_id points to courses.id
    # --------------------------------------------------------

    subject_ids = (
        db.query(FacultySubject.subject_id)
        .filter(
            FacultySubject.faculty_id == faculty.id,
            FacultySubject.is_active == True
        )
        .distinct()
        .all()
    )

    total_subjects = len(subject_ids)

    return {
        "faculty_id": faculty.faculty_id,
        "faculty_db_id": faculty.id,
        "faculty_name": faculty.name,
        "total_subjects": total_subjects
    }


# ============================================================
# UPDATE FACULTY
# ============================================================

@router.put(
    "/{faculty_id}",
    response_model=FacultyResponse
)
def update_faculty(
    faculty_id: int,
    faculty_data: FacultyCreate,
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(
        Faculty.id == faculty_id
    ).first()

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )

    faculty.faculty_id = faculty_data.faculty_id
    faculty.name = faculty_data.name
    faculty.email = faculty_data.email
    faculty.department = faculty_data.department

    db.commit()
    db.refresh(faculty)

    return faculty


# ============================================================
# DELETE FACULTY
# ============================================================

@router.delete(
    "/{faculty_id}"
)
def delete_faculty(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    faculty = db.query(Faculty).filter(
        Faculty.id == faculty_id
    ).first()

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )

    db.delete(faculty)
    db.commit()

    return {
        "message": "Faculty deleted successfully"
    }
