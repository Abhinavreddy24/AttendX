from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
)
from datetime import datetime

from app.core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    course_code = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    course_name = Column(
        String(150),
        nullable=False,
    )

    department = Column(
        String(100),
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

    created_at = Column(
        DateTime,
        default=datetime.now,
        nullable=False,
    )