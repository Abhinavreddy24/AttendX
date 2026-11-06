from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float

from app.core.database import Base


class QRSession(Base):
    __tablename__ = "qr_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # Permanent 5-minute session identifier
    session_code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    # Secret used to generate the rotating QR token
    qr_secret = Column(
        String(64),
        nullable=False
    )

    # Faculty/course information
    course_id = Column(
        Integer,
        nullable=False
    )

    faculty_id = Column(
        Integer,
        nullable=False
    )

    # Session timing
    created_at = Column(
        DateTime,
        nullable=False
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True
    )

    # Classroom location
    classroom_latitude = Column(
        Float,
        nullable=True
    )

    classroom_longitude = Column(
        Float,
        nullable=True
    )

    # Allowed distance from classroom in meters
    allowed_radius = Column(
        Float,
        default=20.0
    )