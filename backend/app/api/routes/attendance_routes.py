
from datetime import datetime, timezone

import math

from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.models.attendance import Attendance
from app.models.attendance_attempt import AttendanceAttempt
from app.models.student import Student
from app.models.qr_session import QRSession
from app.models.course import Course
from app.models.faculty import Faculty


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


# =========================================================
# HAVERSINE DISTANCE
# =========================================================

def calculate_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
):
    """
    Calculate distance between two GPS coordinates
    using the Haversine formula.

    Returns distance in meters.
    """

    earth_radius = 6371000

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return earth_radius * c


# =========================================================
# HELPER - RECORD SUSPICIOUS ATTEMPT
# =========================================================

def record_suspicious_attempt(
    db: Session,
    student_id: int = None,
    qr_session_id: int = None,
    attempt_type: str = "UNKNOWN",
    reason: str = "Suspicious attendance attempt",
    student_latitude: float = None,
    student_longitude: float = None,
    distance_from_classroom: float = None
):

    attempt = AttendanceAttempt(
        student_id=student_id,
        qr_session_id=qr_session_id,
        attempted_at=datetime.now(timezone.utc),
        attempt_type=attempt_type,
        reason=reason,
        student_latitude=student_latitude,
        student_longitude=student_longitude,
        distance_from_classroom=distance_from_classroom
    )

    db.add(attempt)

    db.commit()

    db.refresh(attempt)

    return attempt


# =========================================================
# MARK ATTENDANCE
# =========================================================

@router.post("/mark")
def mark_attendance(
    student_id: int,
    session_code: str,
    student_latitude: float,
    student_longitude: float,
    db: Session = Depends(get_db)
):

    print("")
    print("============================================")
    print("ATTENDX - MARK ATTENDANCE")
    print("============================================")
    print("Student DB ID:", student_id)
    print("Session Code:", session_code)
    print("Student Latitude:", student_latitude)
    print("Student Longitude:", student_longitude)
    print("============================================")

    # -----------------------------------------------------
    # 1. CHECK STUDENT
    # -----------------------------------------------------

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )

    print("Student found:")
    print("  DB ID:", student.id)
    print("  College ID:", student.student_id)
    print("  Name:", student.name)

    # -----------------------------------------------------
    # 2. FIND QR SESSION
    # -----------------------------------------------------

    clean_session_code = session_code.strip().upper()

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code == clean_session_code
        )
        .first()
    )

    if not qr_session:
        raise HTTPException(
            status_code=404,
            detail="QR session not found."
        )

    print("QR session found:")
    print("  Session DB ID:", qr_session.id)
    print("  Session Code:", qr_session.session_code)
    print("  Course ID:", qr_session.course_id)
    print("  Faculty ID:", qr_session.faculty_id)

    # -----------------------------------------------------
    # 3. CHECK ACTIVE STATUS
    # -----------------------------------------------------

    if not qr_session.is_active:

        record_suspicious_attempt(
            db=db,
            student_id=student_id,
            qr_session_id=qr_session.id,
            attempt_type="INACTIVE_SESSION",
            reason=(
                "Student attempted attendance using "
                "an inactive QR session."
            ),
            student_latitude=student_latitude,
            student_longitude=student_longitude
        )

        raise HTTPException(
            status_code=400,
            detail="This QR session is no longer active."
        )

    # -----------------------------------------------------
    # 4. CHECK EXPIRY
    # -----------------------------------------------------

    current_time = datetime.now(timezone.utc)

    expires_at = qr_session.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    print("============================================")
    print("ATTENDANCE TIME CHECK")
    print("Session:", qr_session.session_code)
    print("Current UTC:", current_time)
    print("Expiry UTC:", expires_at)
    print("============================================")

    if current_time >= expires_at:

        qr_session.is_active = False

        db.commit()

        record_suspicious_attempt(
            db=db,
            student_id=student_id,
            qr_session_id=qr_session.id,
            attempt_type="EXPIRED_SESSION",
            reason=(
                "Student attempted attendance after "
                "the QR session expired."
            ),
            student_latitude=student_latitude,
            student_longitude=student_longitude
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "This QR session has expired. "
                "Please scan a newly generated QR."
            )
        )

    # -----------------------------------------------------
    # 5. CHECK CLASSROOM LOCATION
    # -----------------------------------------------------

    if (
        qr_session.classroom_latitude is None
        or qr_session.classroom_longitude is None
    ):

        raise HTTPException(
            status_code=400,
            detail="Classroom location is not configured."
        )

    # -----------------------------------------------------
    # 6. VALIDATE STUDENT GPS
    # -----------------------------------------------------

    distance = calculate_distance(
        student_latitude,
        student_longitude,
        qr_session.classroom_latitude,
        qr_session.classroom_longitude
    )

    allowed_radius = (
        qr_session.allowed_radius
        if qr_session.allowed_radius is not None
        else 20.0
    )

    print("============================================")
    print("GPS ATTENDANCE CHECK")
    print("Student latitude:", student_latitude)
    print("Student longitude:", student_longitude)
    print(
        "Classroom latitude:",
        qr_session.classroom_latitude
    )
    print(
        "Classroom longitude:",
        qr_session.classroom_longitude
    )
    print("Distance:", distance, "meters")
    print("Allowed radius:", allowed_radius, "meters")
    print("============================================")

    # -----------------------------------------------------
    # 7. CHECK GPS RADIUS
    # -----------------------------------------------------

    if distance > allowed_radius:

        reason = (
            f"You are outside the classroom area. "
            f"Distance: {distance:.2f} m, "
            f"Allowed: {allowed_radius:.2f} m."
        )

        record_suspicious_attempt(
            db=db,
            student_id=student_id,
            qr_session_id=qr_session.id,
            attempt_type="OUTSIDE_RADIUS",
            reason=reason,
            student_latitude=student_latitude,
            student_longitude=student_longitude,
            distance_from_classroom=distance
        )

        raise HTTPException(
            status_code=400,
            detail=reason
        )

    # -----------------------------------------------------
    # 8. PREVENT DUPLICATE ATTENDANCE
    # -----------------------------------------------------

    existing_attendance = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == student_id,
            Attendance.qr_session_id == qr_session.id
        )
        .first()
    )

    if existing_attendance:

        record_suspicious_attempt(
            db=db,
            student_id=student_id,
            qr_session_id=qr_session.id,
            attempt_type="DUPLICATE_ATTENDANCE",
            reason=(
                "Student attempted to mark attendance "
                "more than once for the same session."
            ),
            student_latitude=student_latitude,
            student_longitude=student_longitude,
            distance_from_classroom=distance
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Attendance has already been marked "
                "for this session."
            )
        )

    # -----------------------------------------------------
    # 9. CREATE ATTENDANCE
    # -----------------------------------------------------

    attendance = Attendance(
        student_id=student_id,
        qr_session_id=qr_session.id,
        marked_at=datetime.now(timezone.utc),
        status="present",
        student_latitude=student_latitude,
        student_longitude=student_longitude,
        distance_from_classroom=distance
    )

    db.add(attendance)

    db.commit()

    db.refresh(attendance)

    # -----------------------------------------------------
    # 10. VERIFY INSERT
    # -----------------------------------------------------

    print("")
    print("============================================")
    print("ATTENDANCE INSERTED SUCCESSFULLY")
    print("============================================")
    print("Attendance DB ID:", attendance.id)
    print("Student DB ID:", attendance.student_id)
    print("QR Session DB ID:", attendance.qr_session_id)
    print("Session Code:", qr_session.session_code)
    print("Status:", attendance.status)
    print("Marked At:", attendance.marked_at)
    print("Distance:", distance)
    print("============================================")
    print("")

    # -----------------------------------------------------
    # GET COURSE INFORMATION
    # -----------------------------------------------------

    course = (
        db.query(Course)
        .filter(
            Course.id == qr_session.course_id
        )
        .first()
    )

    # -----------------------------------------------------
    # 11. SUCCESS RESPONSE
    # -----------------------------------------------------

    return {
        "message": "Attendance marked successfully!",
        "attendance_id": attendance.id,
        "student_id": attendance.student_id,
        "session_code": qr_session.session_code,
        "course_id": qr_session.course_id,
        "course_code": (
            course.course_code
            if course
            else None
        ),
        "course_name": (
            course.course_name
            if course
            else None
        ),
        "status": attendance.status,
        "marked_at": attendance.marked_at,
        "distance_from_classroom": round(
            distance,
            2
        ),
        "allowed_radius": allowed_radius
    }


# =========================================================
# GET STUDENT ATTENDANCE
# =========================================================

@router.get("/student/{student_id}")
def get_student_attendance(
    student_id: int,
    db: Session = Depends(get_db)
):

    print("")
    print("============================================")
    print("ATTENDX - STUDENT DASHBOARD REQUEST")
    print("============================================")
    print("Requested Student DB ID:", student_id)

    # -----------------------------------------------------
    # 1. FIND STUDENT
    # -----------------------------------------------------

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:

        print("Student NOT FOUND!")

        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )

    print("Student found:")
    print("  DB ID:", student.id)
    print("  College ID:", student.student_id)
    print("  Name:", student.name)

    # -----------------------------------------------------
    # 2. GET ALL QR SESSIONS
    # -----------------------------------------------------

    sessions = (
        db.query(QRSession)
        .order_by(
            QRSession.created_at.desc()
        )
        .all()
    )

    print("")
    print(
        "Total QR sessions in database:",
        len(sessions)
    )

    for session in sessions:

        print(
            "  Session:",
            session.id,
            "| Code:",
            session.session_code,
            "| Course:",
            session.course_id,
            "| Faculty:",
            session.faculty_id
        )

    # -----------------------------------------------------
    # 3. GET STUDENT ATTENDANCE RECORDS
    # -----------------------------------------------------

    attendance_records = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == student_id
        )
        .order_by(
            Attendance.marked_at.desc()
        )
        .all()
    )

    print("")
    print(
        "Attendance records for this student:",
        len(attendance_records)
    )

    for record in attendance_records:

        print(
            "  Attendance:",
            record.id,
            "| Session:",
            record.qr_session_id,
            "| Status:",
            record.status,
            "| Marked:",
            record.marked_at
        )

    # -----------------------------------------------------
    # 4. CREATE ATTENDANCE LOOKUP
    # -----------------------------------------------------

    attendance_by_session = {}

    for record in attendance_records:

        if (
            record.status is not None
            and record.status.lower() == "present"
        ):

            attendance_by_session[
                record.qr_session_id
            ] = record

    print("")

    print(
        "Present attendance session IDs:",
        list(attendance_by_session.keys())
    )

    # -----------------------------------------------------
    # 5. OVERALL SUMMARY
    # -----------------------------------------------------

    total_classes = len(sessions)

    present_count = 0

    for session in sessions:

        if session.id in attendance_by_session:
            present_count += 1

    absent_count = max(
        total_classes - present_count,
        0
    )

    overall_percentage = (
        round(
            (present_count / total_classes) * 100
        )
        if total_classes > 0
        else 0
    )

    print("")
    print("============================================")
    print("STUDENT ATTENDANCE SUMMARY")
    print("============================================")
    print("Total classes:", total_classes)
    print("Present:", present_count)
    print("Absent:", absent_count)
    print("Percentage:", overall_percentage)
    print("============================================")

    # -----------------------------------------------------
    # 6. SUBJECT / COURSE ATTENDANCE
    # -----------------------------------------------------

    course_data = {}

    for session in sessions:

        course_id = session.course_id

        if course_id not in course_data:

            course_data[course_id] = {
                "course_id": course_id,
                "total": 0,
                "attended": 0
            }

        course_data[course_id]["total"] += 1

        if session.id in attendance_by_session:

            course_data[course_id]["attended"] += 1

    subjects = []

    for course in course_data.values():

        total = course["total"]

        attended = course["attended"]

        percentage = (
            round(
                (attended / total) * 100
            )
            if total > 0
            else 0
        )

        # ---------------------------------------------
        # GET REAL COURSE FROM POSTGRESQL
        # ---------------------------------------------

        course_record = (
            db.query(Course)
            .filter(
                Course.id == course["course_id"]
            )
            .first()
        )

        subjects.append({
            "course_id":
                course["course_id"],

            "course_code":
                (
                    course_record.course_code
                    if course_record
                    else None
                ),

            "course_name":
                (
                    course_record.course_name
                    if course_record
                    else None
                ),

            "attended":
                attended,

            "total":
                total,

            "percentage":
                percentage
        })

    # -----------------------------------------------------
    # 7. RECENT ATTENDANCE
    # -----------------------------------------------------

    recent_attendance = []

    for record in attendance_records[:10]:

        qr_session = (
            db.query(QRSession)
            .filter(
                QRSession.id == record.qr_session_id
            )
            .first()
        )

        if not qr_session:
            continue

        # ---------------------------------------------
        # GET REAL COURSE
        # ---------------------------------------------

        course_record = (
            db.query(Course)
            .filter(
                Course.id == qr_session.course_id
            )
            .first()
        )

        recent_attendance.append({
            "attendance_id":
                record.id,

            "course_id":
                qr_session.course_id,

            "course_code":
                (
                    course_record.course_code
                    if course_record
                    else None
                ),

            "course_name":
                (
                    course_record.course_name
                    if course_record
                    else None
                ),

            "session_code":
                qr_session.session_code,

            "status":
                record.status,

            "marked_at":
                record.marked_at,

            "distance_from_classroom":
                record.distance_from_classroom
        })

    # -----------------------------------------------------
    # 8. FINAL RESPONSE
    # -----------------------------------------------------

    response = {

        "student": {
            "id":
                student.id,

            "student_id":
                student.student_id,

            "name":
                student.name,

            "email":
                student.email,

            "department":
                student.department,

            "year":
                student.year
        },

        "summary": {

            "overall_percentage":
                overall_percentage,

            "present":
                present_count,

            "absent":
                absent_count,

            "total_classes":
                total_classes
        },

        "subjects":
            subjects,

        "recent_attendance":
            recent_attendance
    }

    print("")
    print("Dashboard response:")
    print(response)
    print("")

    print("============================================")
    print("END STUDENT DASHBOARD REQUEST")
    print("============================================")
    print("")

    return response


# =========================================================
# FACULTY - GET SESSIONS
# =========================================================

@router.get("/faculty/sessions/{faculty_id}")
def get_faculty_sessions(
    faculty_id: int,
    db: Session = Depends(get_db)
):

    sessions = (
        db.query(QRSession)
        .filter(
            QRSession.faculty_id == faculty_id
        )
        .order_by(
            QRSession.created_at.desc()
        )
        .all()
    )

    result = []

    for session in sessions:

        course = (
            db.query(Course)
            .filter(
                Course.id == session.course_id
            )
            .first()
        )

        result.append({

            "id":
                session.id,

            "session_code":
                session.session_code,

            "course_id":
                session.course_id,

            "course_code":
                (
                    course.course_code
                    if course
                    else None
                ),

            "course_name":
                (
                    course.course_name
                    if course
                    else None
                ),

            "created_at":
                session.created_at,

            "expires_at":
                session.expires_at,

            "is_active":
                session.is_active
        })

    return {

        "faculty_id":
            faculty_id,

        "sessions":
            result
    }


# =========================================================
# FACULTY - LIVE ATTENDANCE
# =========================================================

@router.get("/faculty/live/{faculty_id}")
def get_live_attendance(
    faculty_id: int,
    session_code: str,
    db: Session = Depends(get_db)
):

    clean_session_code = session_code.strip().upper()

    # -----------------------------------------------------
    # FIND SESSION
    # -----------------------------------------------------

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code == clean_session_code,
            QRSession.faculty_id == faculty_id
        )
        .first()
    )

    if not qr_session:

        raise HTTPException(
            status_code=404,
            detail="Attendance session not found."
        )

    # -----------------------------------------------------
    # GET COURSE
    # -----------------------------------------------------

    course = (
        db.query(Course)
        .filter(
            Course.id == qr_session.course_id
        )
        .first()
    )

    # -----------------------------------------------------
    # GET ATTENDANCE
    # -----------------------------------------------------

    records = (
        db.query(Attendance, Student)
        .join(
            Student,
            Student.id == Attendance.student_id
        )
        .filter(
            Attendance.qr_session_id == qr_session.id
        )
        .order_by(
            Attendance.marked_at.asc()
        )
        .all()
    )

    students = []

    for attendance, student in records:

        students.append({

            "attendance_id":
                attendance.id,

            "student_id":
                student.id,

            "college_student_id":
                student.student_id,

            "name":
                student.name,

            "status":
                attendance.status,

            "marked_at":
                attendance.marked_at,

            "distance_from_classroom":
                attendance.distance_from_classroom
        })

    # -----------------------------------------------------
    # TOTAL STUDENTS
    # -----------------------------------------------------

    total_students = (
        db.query(Student)
        .count()
    )

    present_count = len(students)

    percentage = (
        round(
            (present_count / total_students) * 100
        )
        if total_students > 0
        else 0
    )

    return {

        "session": {

            "id":
                qr_session.id,

            "session_code":
                qr_session.session_code,

            "course_id":
                qr_session.course_id,

            "course_code":
                (
                    course.course_code
                    if course
                    else None
                ),

            "course_name":
                (
                    course.course_name
                    if course
                    else None
                ),

            "faculty_id":
                qr_session.faculty_id,

            "is_active":
                qr_session.is_active,

            "created_at":
                qr_session.created_at,

            "expires_at":
                qr_session.expires_at
        },

        "summary": {

            "present":
                present_count,

            "total_students":
                total_students,

            "percentage":
                percentage
        },

        "students":
            students
    }

# =========================================================
# FACULTY - TODAY'S ATTENDANCE
# =========================================================

@router.get("/faculty/today/{faculty_id}")
def get_today_attendance(
    faculty_id: str,
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # 1. FIND FACULTY USING COLLEGE FACULTY ID
    # Example: FAC003
    # -----------------------------------------------------

    faculty = (
        db.query(Faculty)
        .filter(
            Faculty.faculty_id == faculty_id
        )
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty not found."
        )

    # -----------------------------------------------------
    # 2. GET TODAY'S DATE IN INDIA
    # -----------------------------------------------------

    from datetime import timedelta
    from zoneinfo import ZoneInfo

    india_timezone = ZoneInfo("Asia/Kolkata")

    now_india = datetime.now(india_timezone)

    start_of_day_india = now_india.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0
    )

    end_of_day_india = (
        start_of_day_india + timedelta(days=1)
    )

    # Convert to UTC because attendance is stored using UTC
    start_of_day_utc = (
        start_of_day_india.astimezone(timezone.utc)
    )

    end_of_day_utc = (
        end_of_day_india.astimezone(timezone.utc)
    )

    # -----------------------------------------------------
    # 3. GET TODAY'S QR SESSIONS FOR THIS FACULTY
    # -----------------------------------------------------

    sessions = (
        db.query(QRSession)
        .filter(
            QRSession.faculty_id == faculty.id,
            QRSession.created_at >= start_of_day_utc,
            QRSession.created_at < end_of_day_utc
        )
        .all()
    )

    # -----------------------------------------------------
    # 4. FIND ACTUAL CONDUCTED SESSIONS
    #
    # A session counts only if at least one student
    # actually marked present.
    # -----------------------------------------------------

    conducted_session_ids = set()

    for session in sessions:
        attendance_exists = (
            db.query(Attendance)
            .filter(
                Attendance.qr_session_id == session.id,
                Attendance.status == "present"
            )
            .first()
        )

        if attendance_exists:
            conducted_session_ids.add(session.id)

    total_conducted_sessions = len(
        conducted_session_ids
    )

    # -----------------------------------------------------
    # 5. GET TODAY'S PRESENT ATTENDANCE RECORDS
    # -----------------------------------------------------

    today_attendance = []

    if conducted_session_ids:
        today_attendance = (
            db.query(Attendance)
            .filter(
                Attendance.qr_session_id.in_(
                    conducted_session_ids
                ),
                Attendance.status == "present",
                Attendance.marked_at >= start_of_day_utc,
                Attendance.marked_at < end_of_day_utc
            )
            .all()
        )

    present_count = len(today_attendance)

    # -----------------------------------------------------
    # 6. TOTAL STUDENTS
    # -----------------------------------------------------

    total_students = (
        db.query(Student)
        .count()
    )

    # -----------------------------------------------------
    # 7. CALCULATE TODAY'S ATTENDANCE PERCENTAGE
    # -----------------------------------------------------

    possible_attendance = (
        total_students *
        total_conducted_sessions
    )

    attendance_percentage = (
        round(
            (
                present_count /
                possible_attendance
            ) * 100
        )
        if possible_attendance > 0
        else 0
    )

    # -----------------------------------------------------
    # 8. RESPONSE
    # -----------------------------------------------------

    return {
        "faculty_id": faculty.faculty_id,
        "faculty_db_id": faculty.id,
        "faculty_name": faculty.name,
        "date": now_india.date().isoformat(),
        "total_students": total_students,
        "conducted_sessions": total_conducted_sessions,
        "present_count": present_count,
        "possible_attendance": possible_attendance,
        "attendance_percentage": attendance_percentage
    }
# =========================================================
# FACULTY - ATTENDANCE REPORT
# =========================================================

@router.get("/faculty/report/{faculty_id}")
def get_attendance_report(
    faculty_id: int,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # 1. GET ALL QR SESSIONS FOR THIS FACULTY
    # -----------------------------------------------------

    all_sessions = (
        db.query(QRSession)
        .filter(
            QRSession.faculty_id == faculty_id
        )
        .order_by(
            QRSession.created_at.desc()
        )
        .all()
    )

    # -----------------------------------------------------
    # 2. GET ACTUAL ATTENDANCE RECORDS
    #
    # Only QR sessions that have at least one real
    # attendance record are treated as conducted sessions
    # for this report.
    # -----------------------------------------------------

    attendance_records = (
        db.query(Attendance)
        .join(
            QRSession,
            QRSession.id == Attendance.qr_session_id
        )
        .filter(
            QRSession.faculty_id == faculty_id
        )
        .all()
    )

    # -----------------------------------------------------
    # 3. FIND SESSIONS WITH ACTUAL ATTENDANCE ACTIVITY
    # -----------------------------------------------------

    conducted_session_ids = set()

    for attendance in attendance_records:

        if attendance.status is None:
            continue

        if attendance.status.lower() == "present":

            conducted_session_ids.add(
                attendance.qr_session_id
            )

    # -----------------------------------------------------
    # 4. ONLY USE ACTUAL CONDUCTED SESSIONS
    # -----------------------------------------------------

    sessions = [
        session
        for session in all_sessions
        if session.id in conducted_session_ids
    ]

    total_sessions = len(sessions)

    # -----------------------------------------------------
    # 5. GET ALL STUDENTS
    # -----------------------------------------------------

    students = (
        db.query(Student)
        .order_by(
            Student.name.asc()
        )
        .all()
    )

    # -----------------------------------------------------
    # 6. CREATE REPORT
    # -----------------------------------------------------

    report = []

    for student in students:

        attended_sessions = 0

        # -------------------------------------------------
        # CHECK EACH CONDUCTED SESSION
        # -------------------------------------------------

        for session in sessions:

            attendance = (
                db.query(Attendance)
                .filter(
                    Attendance.student_id == student.id,
                    Attendance.qr_session_id == session.id,
                    Attendance.status == "present"
                )
                .first()
            )

            if attendance:

                attended_sessions += 1

        # -------------------------------------------------
        # CALCULATE ABSENCES
        # -------------------------------------------------

        absent_sessions = max(
            total_sessions - attended_sessions,
            0
        )

        # -------------------------------------------------
        # CALCULATE ATTENDANCE PERCENTAGE
        # -------------------------------------------------

        percentage = (

            round(
                (attended_sessions / total_sessions) * 100,
                1
            )

            if total_sessions > 0

            else 0
        )

        # -------------------------------------------------
        # ADD STUDENT REPORT
        # -------------------------------------------------

        report.append({

            "student_id":
                student.id,

            "college_student_id":
                student.student_id,

            "name":
                student.name,

            "department":
                student.department,

            "year":
                student.year,

            "present":
                attended_sessions,

            "absent":
                absent_sessions,

            "total":
                total_sessions,

            "percentage":
                percentage
        })

    # -----------------------------------------------------
    # 7. FINAL RESPONSE
    # -----------------------------------------------------

    return {

        "faculty_id":
            faculty_id,

        "total_sessions":
            total_sessions,

        "total_qr_sessions":
            len(all_sessions),

        "students":
            report
    }


# =========================================================
# FACULTY - SUSPICIOUS ATTEMPTS
# =========================================================

@router.get("/faculty/suspicious/{faculty_id}")
def get_suspicious_attempts(
    faculty_id: int,
    db: Session = Depends(get_db)
):

    attempts = (
        db.query(
            AttendanceAttempt,
            Student,
            QRSession
        )
        .outerjoin(
            Student,
            Student.id == AttendanceAttempt.student_id
        )
        .outerjoin(
            QRSession,
            QRSession.id == AttendanceAttempt.qr_session_id
        )
        .filter(
            QRSession.faculty_id == faculty_id
        )
        .order_by(
            AttendanceAttempt.attempted_at.desc()
        )
        .all()
    )

    result = []

    for attempt, student, session in attempts:

        course = None

        if session:

            course = (
                db.query(Course)
                .filter(
                    Course.id == session.course_id
                )
                .first()
            )

        result.append({

            "id":
                attempt.id,

            "student_id":
                (
                    student.student_id
                    if student
                    else None
                ),

            "student_name":
                (
                    student.name
                    if student
                    else "Unknown Student"
                ),

            "session_code":
                (
                    session.session_code
                    if session
                    else None
                ),

            "course_id":
                (
                    session.course_id
                    if session
                    else None
                ),

            "course_code":
                (
                    course.course_code
                    if course
                    else None
                ),

            "course_name":
                (
                    course.course_name
                    if course
                    else None
                ),

            "attempted_at":
                attempt.attempted_at,

            "attempt_type":
                attempt.attempt_type,

            "reason":
                attempt.reason,

            "distance_from_classroom":
                attempt.distance_from_classroom,

            "student_latitude":
                attempt.student_latitude,

            "student_longitude":
                attempt.student_longitude
        })

    return {

        "total":
            len(result),

        "attempts":
            result
    }
