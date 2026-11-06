from app.core.database import engine

try:
    with engine.connect() as connection:
        print("✅ PostgreSQL connected successfully!")
        print("✅ Database: AttendX")
except Exception as e:
    print("❌ Database connection failed!")
    print(e)