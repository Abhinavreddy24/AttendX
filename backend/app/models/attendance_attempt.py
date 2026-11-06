from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    String,
    Float,
    Text,
    Boolean,
    ForeignKey,
)

from app.core.database import Base


class AttendanceAttempt(Base):
    __tablename__ = "attendance_attempts"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=True,
        index=True,
    )

    qr_session_id = Column(
        Integer,
        ForeignKey("qr_sessions.id"),
        nullable=True,
        index=True,
    )

    session_code = Column(
        String(100),
        nullable=True,
        index=True,
    )

    attempt_type = Column(
        String(50),
        nullable=False,
        index=True,
    )

    face_verified = Column(
        Boolean,
        nullable=True,
    )

    gps_verified = Column(
        Boolean,
        nullable=True,
    )

    qr_verified = Column(
        Boolean,
        nullable=True,
    )

    result = Column(
        String(30),
        nullable=True,
        index=True,
    )

    failure_reason = Column(
        Text,
        nullable=True,
    )

    message = Column(
        Text,
        nullable=True,
    )

    attempted_at = Column(
        DateTime,
        nullable=False,
        index=True,
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

    ip_address = Column(
        String(100),
        nullable=True,
    )

    device_info = Column(
        Text,
        nullable=True,
    )