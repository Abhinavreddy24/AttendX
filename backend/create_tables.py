from app.core.database import Base, engine
from app.models import (
    Student,
    Faculty,
    Department,
    Course,
    QRSession,
    Attendance
)

print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print("✅ Tables created successfully!")