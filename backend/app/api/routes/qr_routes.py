from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import hashlib
import secrets

from app.core.database import get_db
from app.models.qr_session import QRSession


router = APIRouter(
    prefix="/qr-sessions",
    tags=["QR Sessions"],
)


# ============================================================
# SETTINGS
# ============================================================

SESSION_DURATION_MINUTES = 5
QR_ROTATION_SECONDS = 5


# ============================================================
# TOKEN GENERATION
# ============================================================

def generate_qr_token(
    qr_secret: str,
    session_code: str,
    rotation_number: int,
) -> str:
    """
    Generate the QR token for a specific 3-second rotation.
    """

    raw_value = (
        f"{qr_secret}:"
        f"{session_code}:"
        f"{rotation_number}"
    )

    return hashlib.sha256(
        raw_value.encode("utf-8")
    ).hexdigest()


def get_rotation_number(
    created_at: datetime,
) -> int:
    """
    Determine which 3-second QR rotation is currently active.
    """

    elapsed_seconds = (
        datetime.now() - created_at
    ).total_seconds()

    return int(
        elapsed_seconds // QR_ROTATION_SECONDS
    )


# ============================================================
# CREATE QR SESSION
# ============================================================

@router.post("/qr/create")
def create_qr_session(
    faculty_id: int,
    course_id: int,
    classroom_latitude: float,
    classroom_longitude: float,
    allowed_radius: float = 100.0,
    duration_minutes: int = 5,
    db: Session = Depends(get_db),
):
    if duration_minutes < 1 or duration_minutes > 180:
        raise HTTPException(
            status_code=400,
            detail="Duration must be between 1 and 180 minutes.",
        )

    if allowed_radius <= 0:
        raise HTTPException(
            status_code=400,
            detail="Allowed radius must be greater than 0.",
        )

    created_at = datetime.now()

    expires_at = created_at + timedelta(
        minutes=duration_minutes
    )

    session_code = (
        "AX-"
        + secrets.token_hex(4).upper()
    )

    # Secret stored only in the database.
    qr_secret = secrets.token_hex(32)

    # First QR rotation.
    first_token = generate_qr_token(
        qr_secret=qr_secret,
        session_code=session_code,
        rotation_number=0,
    )

    new_session = QRSession(
        session_code=session_code,
        qr_secret=qr_secret,
        course_id=course_id,
        faculty_id=faculty_id,
        created_at=created_at,
        expires_at=expires_at,
        is_active=True,
        classroom_latitude=classroom_latitude,
        classroom_longitude=classroom_longitude,
        allowed_radius=allowed_radius,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "message": "QR session created successfully",
        "session_id": new_session.id,
        "session_code": new_session.session_code,
        "course_id": new_session.course_id,
        "faculty_id": new_session.faculty_id,
        "created_at": new_session.created_at,
        "expires_at": new_session.expires_at,
        "is_active": new_session.is_active,
        "classroom_latitude": new_session.classroom_latitude,
        "classroom_longitude": new_session.classroom_longitude,
        "allowed_radius": new_session.allowed_radius,
        "qr_token": first_token,
        "qr_rotation_seconds": QR_ROTATION_SECONDS,
    }


# ============================================================
# GET CURRENT QR TOKEN
# ============================================================

@router.get("/qr/{session_code}/current")
def get_current_qr_token(
    session_code: str,
    db: Session = Depends(get_db),
):
    clean_code = session_code.strip().upper()

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code == clean_code
        )
        .first()
    )

    if not qr_session:
        raise HTTPException(
            status_code=404,
            detail="QR session not found.",
        )

    if not qr_session.is_active:
        raise HTTPException(
            status_code=400,
            detail="QR session is no longer active.",
        )

    now = datetime.now()

    if now >= qr_session.expires_at:
        qr_session.is_active = False
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="QR session has expired.",
        )

    rotation_number = get_rotation_number(
        qr_session.created_at
    )

    current_token = generate_qr_token(
        qr_secret=qr_session.qr_secret,
        session_code=qr_session.session_code,
        rotation_number=rotation_number,
    )

    return {
        "valid": True,
        "session_code": qr_session.session_code,
        "qr_token": current_token,
        "rotation_number": rotation_number,
        "qr_rotation_seconds": QR_ROTATION_SECONDS,
        "expires_at": qr_session.expires_at,
        "is_active": qr_session.is_active,
    }


# ============================================================
# VALIDATE ROTATING QR TOKEN
# ============================================================

@router.post("/qr/{session_code}/validate")
def validate_qr_token(
    session_code: str,
    qr_token: str,
    db: Session = Depends(get_db),
):
    clean_code = session_code.strip().upper()
    received_token = qr_token.strip()

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code == clean_code
        )
        .first()
    )

    if not qr_session:
        raise HTTPException(
            status_code=404,
            detail="QR session not found.",
        )

    if not qr_session.is_active:
        raise HTTPException(
            status_code=400,
            detail="QR session is no longer active.",
        )

    now = datetime.now()

    if now >= qr_session.expires_at:
        qr_session.is_active = False
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="QR session has expired.",
        )

    current_rotation = get_rotation_number(
        qr_session.created_at
    )

    # Allow the current rotation and the immediately
    # previous rotation. This prevents a QR from becoming
    # invalid while the student camera is reading it.
    valid_rotations = [
        current_rotation,
        current_rotation - 1,
    ]

    for rotation_number in valid_rotations:
        if rotation_number < 0:
            continue

        expected_token = generate_qr_token(
            qr_secret=qr_session.qr_secret,
            session_code=qr_session.session_code,
            rotation_number=rotation_number,
        )

        if secrets.compare_digest(
            received_token,
            expected_token,
        ):
            return {
                "valid": True,
                "message": "QR token is valid.",
                "session_id": qr_session.id,
                "session_code": qr_session.session_code,
                "course_id": qr_session.course_id,
                "faculty_id": qr_session.faculty_id,
                "expires_at": qr_session.expires_at,
                "is_active": qr_session.is_active,
                "classroom_latitude": qr_session.classroom_latitude,
                "classroom_longitude": qr_session.classroom_longitude,
                "allowed_radius": qr_session.allowed_radius,
                "rotation_number": rotation_number,
            }

    raise HTTPException(
        status_code=400,
        detail="QR token is expired or invalid.",
    )


# ============================================================
# STATIC / SESSION VALIDATION
# ============================================================

@router.get("/qr/{session_code}")
def get_qr_session(
    session_code: str,
    db: Session = Depends(get_db),
):
    clean_code = session_code.strip().upper()

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code == clean_code
        )
        .first()
    )

    if not qr_session:
        raise HTTPException(
            status_code=404,
            detail="Invalid QR session.",
        )

    if not qr_session.is_active:
        raise HTTPException(
            status_code=400,
            detail="QR session is no longer active.",
        )

    now = datetime.now()

    if now >= qr_session.expires_at:
        qr_session.is_active = False
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="QR session has expired.",
        )

    return {
        "valid": True,
        "session_id": qr_session.id,
        "session_code": qr_session.session_code,
        "course_id": qr_session.course_id,
        "faculty_id": qr_session.faculty_id,
        "created_at": qr_session.created_at,
        "expires_at": qr_session.expires_at,
        "is_active": qr_session.is_active,
        "classroom_latitude": qr_session.classroom_latitude,
        "classroom_longitude": qr_session.classroom_longitude,
        "allowed_radius": qr_session.allowed_radius,
    }


# ============================================================
# CHECK SESSION
# ============================================================

@router.get("/check/{session_code}")
def check_qr_session(
    session_code: str,
    db: Session = Depends(get_db),
):
    clean_code = session_code.strip().upper()

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code == clean_code
        )
        .first()
    )

    if not qr_session:
        raise HTTPException(
            status_code=404,
            detail="Invalid QR session.",
        )

    if not qr_session.is_active:
        raise HTTPException(
            status_code=400,
            detail="QR session is no longer active.",
        )

    now = datetime.now()

    if now >= qr_session.expires_at:
        qr_session.is_active = False
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="QR session has expired.",
        )

    return {
        "valid": True,
        "message": "QR session is valid.",
        "session_id": qr_session.id,
        "session_code": qr_session.session_code,
        "course_id": qr_session.course_id,
        "faculty_id": qr_session.faculty_id,
        "created_at": qr_session.created_at,
        "expires_at": qr_session.expires_at,
        "is_active": qr_session.is_active,
        "classroom_latitude": qr_session.classroom_latitude,
        "classroom_longitude": qr_session.classroom_longitude,
        "allowed_radius": qr_session.allowed_radius,
    }


# ============================================================
# DEACTIVATE BY SESSION CODE
# ============================================================

@router.post("/qr/{session_code}/deactivate")
def deactivate_qr_session_by_code(
    session_code: str,
    db: Session = Depends(get_db),
):
    clean_code = session_code.strip().upper()

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.session_code == clean_code
        )
        .first()
    )

    if not qr_session:
        raise HTTPException(
            status_code=404,
            detail="QR session not found.",
        )

    qr_session.is_active = False

    db.commit()

    return {
        "message": "QR session deactivated successfully.",
        "session_id": qr_session.id,
        "session_code": qr_session.session_code,
        "is_active": qr_session.is_active,
    }


# ============================================================
# DEACTIVATE BY DATABASE ID
# ============================================================

@router.put("/{session_id}/deactivate")
def deactivate_qr_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.id == session_id
        )
        .first()
    )

    if not qr_session:
        raise HTTPException(
            status_code=404,
            detail="QR session not found.",
        )

    qr_session.is_active = False

    db.commit()

    return {
        "message": "QR session deactivated successfully.",
        "session_id": qr_session.id,
        "session_code": qr_session.session_code,
        "is_active": qr_session.is_active,
    }


# ============================================================
# GET ACTIVE SESSION FOR COURSE
# ============================================================

@router.get("/active/{course_id}")
def get_active_qr_session(
    course_id: int,
    db: Session = Depends(get_db),
):
    now = datetime.now()

    qr_session = (
        db.query(QRSession)
        .filter(
            QRSession.course_id == course_id,
            QRSession.is_active == True,
            QRSession.expires_at > now,
        )
        .order_by(
            QRSession.created_at.desc()
        )
        .first()
    )

    if not qr_session:
        raise HTTPException(
            status_code=404,
            detail="No active QR session found for this course.",
        )

    rotation_number = get_rotation_number(
        qr_session.created_at
    )

    current_token = generate_qr_token(
        qr_secret=qr_session.qr_secret,
        session_code=qr_session.session_code,
        rotation_number=rotation_number,
    )

    return {
        "valid": True,
        "session_id": qr_session.id,
        "session_code": qr_session.session_code,
        "course_id": qr_session.course_id,
        "faculty_id": qr_session.faculty_id,
        "created_at": qr_session.created_at,
        "expires_at": qr_session.expires_at,
        "is_active": qr_session.is_active,
        "classroom_latitude": qr_session.classroom_latitude,
        "classroom_longitude": qr_session.classroom_longitude,
        "allowed_radius": qr_session.allowed_radius,
        "qr_token": current_token,
        "qr_rotation_seconds": QR_ROTATION_SECONDS,
    }