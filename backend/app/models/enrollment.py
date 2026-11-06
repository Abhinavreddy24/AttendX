from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)
from datetime import datetime
from app.core.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
        index=True,
    )

    subject_id = Column(
        Integer,
        ForeignKey("courses.id"),
        nullable=False,
        index=True,
    )

    academic_year = Column(
        String(20),
        nullable=True,
    )

    semester = Column(
        Integer,
        nullable=True,
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    enrolled_at = Column(
        DateTime,
        default=datetime.now,
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "subject_id",
            "academic_year",
            "semester",
            name="uq_student_subject_enrollment",
        ),
    )