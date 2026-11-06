from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    String,
    Float,
    ForeignKey,
    UniqueConstraint,
)

from app.core.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

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

    qr_session_id = Column(
        Integer,
        ForeignKey("qr_sessions.id"),
        nullable=False,
        index=True,
    )

    marked_at = Column(
        DateTime,
        nullable=False,
    )

    status = Column(
        String(20),
        default="present",
    )

    student_latitude = Column(
        Float,
        nullable=True,
    )

    student_longitude = Column(
        Float,
        nullable=True,
    )

    distance_from_classroom = Column(
        Float,
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "qr_session_id",
            name="uq_student_qr_session_attendance",
        ),
    )