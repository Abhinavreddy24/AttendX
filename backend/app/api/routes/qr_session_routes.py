from datetime import datetime, timedelta

import secrets
import hashlib
import hmac

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.qr_session import QRSession
from app.models.faculty import Faculty


router = APIRouter(
    prefix="/qr-sessions/qr",
    tags=["QR Sessions"]
)


# ==========================================================
# CONFIGURATION
# ==========================================================

# QR changes on the faculty screen every 3 seconds.
QR_ROTATION_SECONDS = 3

# The attendance session itself lasts 5 minutes by default.
DEFAULT_SESSION_DURATION_MINUTES = 5

# Accept the current QR + previous 3 rotations.
# 4 rotations × 3 seconds = approximately 12 seconds
# of QR validity.
VALID_ROTATION_COUNT = 4


# ==========================================================
# GENERATE DYNAMIC QR TOKEN
# ==========================================================

def generate_qr_token(
    session: QRSession,
    rotation_number: int
) -> str:

    message = (
        f"{session.session_code}:{rotation_number}"
    )

    token = hmac.new(
        session.qr_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return token[:32]


# ==========================================================
# GET CURRENT ROTATION NUMBER
# ==========================================================

def get_rotation_number(
    session: QRSession,
    current_time: datetime
) -> int:

    elapsed_seconds = int(
        (
            current_time -
            session.created_at
        ).total_seconds()
    )

    if elapsed_seconds < 0:
        elapsed_seconds = 0

    return (
        elapsed_seconds //
        QR_ROTATION_SECONDS
    )


# ==========================================================
# CREATE QR SESSION
# ==========================================================

@router.post("/create")
def create_qr_session(
    faculty_id: int,
    course_id: int,
    classroom_latitude: float,
    classroom_longitude: float,
    allowed_radius: float = 100.0,
    duration_minutes: int = DEFAULT_SESSION_DURATION_MINUTES,
    db: Session = Depends(get_db)
):

    # ------------------------------------------------------
    # VALIDATE SESSION DURATION
    # ------------------------------------------------------

    if duration_minutes < 1 or duration_minutes > 180:
        raise HTTPException(
            status_code=400,
            detail=(
                "Session duration must be "
                "between 1 and 180 minutes"
            )
        )

    # ------------------------------------------------------
    # VALIDATE GPS RADIUS
    # ------------------------------------------------------

    if allowed_radius <= 0 or allowed_radius > 1000:
        raise HTTPException(
            status_code=400,
            detail=(
                "Allowed radius must be "
                "between 1 and 1000 meters"
            )
        )

    # ------------------------------------------------------
    # CHECK FACULTY
    # ------------------------------------------------------

    faculty = (
        db.query(Faculty)
        .filter(
            Faculty.id == faculty_id
        )
        .first()
    )

    if not faculty:

        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )

    # ------------------------------------------------------
    # GENERATE STABLE SESSION CODE
    # ------------------------------------------------------

    session_code = (
        "AX-" +
        secrets.token_hex(4).upper()
    )

    # ------------------------------------------------------
    # GENERATE SECRET
    # ------------------------------------------------------

    qr_secret = secrets.token_hex(32)

    # ------------------------------------------------------
    # SERVER CREATION TIME
    # ------------------------------------------------------

    created_at = datetime.utcnow()

    # ------------------------------------------------------
    # SESSION EXPIRY
    # ------------------------------------------------------

    expires_at = (
        created_at +
        timedelta(
            minutes=duration_minutes
        )
    )

    # ------------------------------------------------------
    # CREATE ONE DATABASE SESSION ROW
    # ------------------------------------------------------

    qr_session = QRSession(
        session_code=session_code,
        qr_secret=qr_secret,
        course_id=course_id,
        faculty_id=faculty_id,
        created_at=created_at,
        expires_at=expires_at,
        is_active=True,
        classroom_latitude=classroom_latitude,
        classroom_longitude=classroom_longitude,
        allowed_radius=allowed_radius
    )

    db.add(qr_session)

    db.commit()

    db.refresh(qr_session)

    # ------------------------------------------------------
    # FIRST QR TOKEN
    # ------------------------------------------------------

    initial_rotation = 0

    initial_token = generate_qr_token(
        qr_session,
        initial_rotation
    )

    # ------------------------------------------------------
    # LOG
    # ------------------------------------------------------

    print("\n========================================")
    print("       ATTENDX QR SESSION CREATED")
    print("========================================")
    print(
        f"Session ID          : {qr_session.id}"
    )
    print(
        f"Session Code        : {qr_session.session_code}"
    )
    print(
        f"Faculty ID          : {qr_session.faculty_id}"
    )
    print(
        f"Course ID           : {qr_session.course_id}"
    )
    print(
        f"Created At          : {qr_session.created_at}"
    )
    print(
        f"Expires At          : {qr_session.expires_at}"
    )
    print(
        f"Duration            : "
        f"{duration_minutes} minutes"
    )
    print(
        f"QR Rotation         : "
        f"{QR_ROTATION_SECONDS} seconds"
    )
    print(
        f"Allowed QR History  : "
        f"{VALID_ROTATION_COUNT} rotations"
    )
    print("========================================\n")

    return {
        "message": (
            "QR session created successfully"
        ),
        "session_id": qr_session.id,
        "session_code": qr_session.session_code,
        "qr_token": initial_token,
        "rotation_number": initial_rotation,
        "rotation_seconds": QR_ROTATION_SECONDS,
        "course_id": qr_session.course_id,
        "faculty_id": qr_session.faculty_id,
        "created_at": qr_session.created_at,
        "expires_at": qr_session.expires_at,
        "is_active": qr_session.is_active,
        "classroom_latitude": (
            qr_session.classroom_latitude
        ),
        "classroom_longitude": (
            qr_session.classroom_longitude
        ),
        "allowed_radius": (
            qr_session.allowed_radius
        )
    }


# ==========================================================
# GET CURRENT QR TOKEN
# ==========================================================

@router.get("/{session_code}/current")
def get_current_qr_token(
    session_code: str,
    db: Session = Depends(get_db)
):

    clean_code = (
        session_code
        .strip()
        .upper()
    )

    # ------------------------------------------------------
    # FIND SESSION
    # ------------------------------------------------------

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code ==
            clean_code
        )
        .first()
    )

    if not qr_session:

        raise HTTPException(
            status_code=404,
            detail="QR session not found"
        )

    # ------------------------------------------------------
    # CHECK ACTIVE
    # ------------------------------------------------------

    if not qr_session.is_active:

        raise HTTPException(
            status_code=400,
            detail=(
                "QR session is no longer active"
            )
        )

    # ------------------------------------------------------
    # SERVER TIME
    # ------------------------------------------------------

    current_time = datetime.utcnow()

    # ------------------------------------------------------
    # CHECK SESSION EXPIRY
    # ------------------------------------------------------

    if current_time >= qr_session.expires_at:

        qr_session.is_active = False

        db.commit()

        raise HTTPException(
            status_code=400,
            detail="QR session has expired"
        )

    # ------------------------------------------------------
    # CURRENT ROTATION
    # ------------------------------------------------------

    rotation_number = get_rotation_number(
        qr_session,
        current_time
    )

    # ------------------------------------------------------
    # CURRENT TOKEN
    # ------------------------------------------------------

    token = generate_qr_token(
        qr_session,
        rotation_number
    )

    # ------------------------------------------------------
    # QR WINDOW COUNTDOWN
    # ------------------------------------------------------

    elapsed_seconds = int(
        (
            current_time -
            qr_session.created_at
        ).total_seconds()
    )

    seconds_into_window = (
        elapsed_seconds %
        QR_ROTATION_SECONDS
    )

    seconds_remaining = (
        QR_ROTATION_SECONDS -
        seconds_into_window
    )

    if seconds_remaining <= 0:
        seconds_remaining = QR_ROTATION_SECONDS

    # ------------------------------------------------------
    # SESSION COUNTDOWN
    # ------------------------------------------------------

    session_seconds_remaining = max(
        0,
        int(
            (
                qr_session.expires_at -
                current_time
            ).total_seconds()
        )
    )

    return {
        "valid": True,
        "session_code": (
            qr_session.session_code
        ),
        "qr_token": token,
        "rotation_number": rotation_number,
        "rotation_seconds": QR_ROTATION_SECONDS,
        "seconds_remaining": seconds_remaining,
        "session_seconds_remaining": (
            session_seconds_remaining
        ),
        "expires_at": qr_session.expires_at,
        "is_active": qr_session.is_active
    }


# ==========================================================
# VALIDATE DYNAMIC QR TOKEN
# ==========================================================

@router.post("/{session_code}/validate")
def validate_qr_token(
    session_code: str,
    qr_token: str,
    db: Session = Depends(get_db)
):

    clean_code = (
        session_code
        .strip()
        .upper()
    )

    clean_token = qr_token.strip()

    print("\n========================================")
    print("        ATTENDX QR VALIDATION")
    print("========================================")

    print(
        f"Scanned session code : {clean_code}"
    )

    print(
        f"Scanned QR token     : {clean_token}"
    )

    # ------------------------------------------------------
    # FIND SESSION
    # ------------------------------------------------------

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code ==
            clean_code
        )
        .first()
    )

    if not qr_session:

        print(
            "RESULT: SESSION NOT FOUND"
        )

        print(
            "========================================\n"
        )

        raise HTTPException(
            status_code=404,
            detail="Invalid QR session"
        )

    print(
        f"DB session ID        : {qr_session.id}"
    )

    print(
        f"DB session code      : "
        f"{qr_session.session_code}"
    )

    print(
        f"Session active       : "
        f"{qr_session.is_active}"
    )

    print(
        f"Created at           : "
        f"{qr_session.created_at}"
    )

    print(
        f"Expires at           : "
        f"{qr_session.expires_at}"
    )

    # ------------------------------------------------------
    # ACTIVE CHECK
    # ------------------------------------------------------

    if not qr_session.is_active:

        print(
            "RESULT: SESSION INACTIVE"
        )

        print(
            "========================================\n"
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "QR session is no longer active"
            )
        )

    # ------------------------------------------------------
    # SERVER TIME
    # ------------------------------------------------------

    current_time = datetime.utcnow()

    print(
        f"Server UTC time      : "
        f"{current_time}"
    )

    # ------------------------------------------------------
    # EXPIRY CHECK
    # ------------------------------------------------------

    if current_time >= qr_session.expires_at:

        qr_session.is_active = False

        db.commit()

        print(
            "RESULT: SESSION EXPIRED"
        )

        print(
            "========================================\n"
        )

        raise HTTPException(
            status_code=400,
            detail="QR session has expired"
        )

    # ------------------------------------------------------
    # CURRENT ROTATION
    # ------------------------------------------------------

    current_rotation = get_rotation_number(
        qr_session,
        current_time
    )

    print(
        f"Current rotation     : "
        f"{current_rotation}"
    )

    # ------------------------------------------------------
    # ACCEPT CURRENT + PREVIOUS 3
    # ------------------------------------------------------

    valid_rotations = [
        current_rotation - offset
        for offset in range(
            VALID_ROTATION_COUNT
        )
    ]

    print(
        f"Accepted rotations  : "
        f"{valid_rotations}"
    )

    # ------------------------------------------------------
    # CHECK EACH ROTATION
    # ------------------------------------------------------

    for rotation_number in valid_rotations:

        if rotation_number < 0:
            continue

        expected_token = generate_qr_token(
            qr_session,
            rotation_number
        )

        print(
            f"Rotation "
            f"{rotation_number}: "
            f"expected={expected_token}"
        )

        # --------------------------------------------------
        # CONSTANT-TIME COMPARISON
        # --------------------------------------------------

        if hmac.compare_digest(
            clean_token,
            expected_token
        ):

            print(
                f"RESULT: QR VALID "
                f"(rotation "
                f"{rotation_number})"
            )

            print(
                "========================================\n"
            )

            return {
                "valid": True,
                "message": (
                    "QR token is valid"
                ),
                "session_id": qr_session.id,
                "session_code": (
                    qr_session.session_code
                ),
                "course_id": (
                    qr_session.course_id
                ),
                "faculty_id": (
                    qr_session.faculty_id
                ),
                "classroom_latitude": (
                    qr_session.classroom_latitude
                ),
                "classroom_longitude": (
                    qr_session.classroom_longitude
                ),
                "allowed_radius": (
                    qr_session.allowed_radius
                ),
                "expires_at": (
                    qr_session.expires_at
                ),
                "rotation_number": (
                    rotation_number
                ),
                "current_rotation": (
                    current_rotation
                )
            }

    # ------------------------------------------------------
    # NO MATCH
    # ------------------------------------------------------

    print(
        "RESULT: QR INVALID / EXPIRED"
    )

    print(
        "The scanned token did not match "
        "any accepted rotation."
    )

    print(
        "========================================\n"
    )

    raise HTTPException(
        status_code=400,
        detail=(
            "QR token is expired or invalid. "
            "Please scan the latest QR."
        )
    )


# ==========================================================
# GET SESSION
# ==========================================================

@router.get("/{session_code}")
def get_qr_session(
    session_code: str,
    db: Session = Depends(get_db)
):

    clean_code = (
        session_code
        .strip()
        .upper()
    )

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code ==
            clean_code
        )
        .first()
    )

    if not qr_session:

        raise HTTPException(
            status_code=404,
            detail="QR session not found"
        )

    current_time = datetime.utcnow()

    # ------------------------------------------------------
    # AUTO EXPIRE
    # ------------------------------------------------------

    if (
        qr_session.is_active
        and current_time >=
        qr_session.expires_at
    ):

        qr_session.is_active = False

        db.commit()

    return {
        "session_id": qr_session.id,
        "session_code": (
            qr_session.session_code
        ),
        "course_id": (
            qr_session.course_id
        ),
        "faculty_id": (
            qr_session.faculty_id
        ),
        "created_at": (
            qr_session.created_at
        ),
        "expires_at": (
            qr_session.expires_at
        ),
        "is_active": (
            qr_session.is_active
        ),
        "classroom_latitude": (
            qr_session.classroom_latitude
        ),
        "classroom_longitude": (
            qr_session.classroom_longitude
        ),
        "allowed_radius": (
            qr_session.allowed_radius
        )
    }


# ==========================================================
# DEACTIVATE SESSION
# ==========================================================

@router.post("/{session_code}/deactivate")
def deactivate_qr_session(
    session_code: str,
    db: Session = Depends(get_db)
):

    clean_code = (
        session_code
        .strip()
        .upper()
    )

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code ==
            clean_code
        )
        .first()
    )

    if not qr_session:

        raise HTTPException(
            status_code=404,
            detail="QR session not found"
        )

    qr_session.is_active = False

    db.commit()

    print("\n========================================")
    print("       ATTENDX QR SESSION STOPPED")
    print("========================================")
    print(
        f"Session ID     : {qr_session.id}"
    )
    print(
        f"Session Code   : "
        f"{qr_session.session_code}"
    )
    print("========================================\n")

    return {
        "message": (
            "QR session deactivated successfully"
        ),
        "session_code": (
            qr_session.session_code
        ),
        "is_active": False
    }