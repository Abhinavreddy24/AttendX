import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.student import Student


router = APIRouter(
    prefix="/password",
    tags=["Password Management"]
)


# ============================================================
# REQUEST MODELS
# ============================================================

class SendOTPRequest(BaseModel):
    username: str


class VerifyOTPRequest(BaseModel):
    username: str
    otp: str


class ChangePasswordRequest(BaseModel):
    username: str
    otp: str
    new_password: str
    confirm_password: str


# ============================================================
# HELPER - HASH OTP
# ============================================================

def hash_otp(otp: str) -> str:
    return hashlib.sha256(
        otp.encode("utf-8")
    ).hexdigest()


# ============================================================
# SEND OTP
# ============================================================

@router.post("/send-otp")
def send_otp(
    request: SendOTPRequest,
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.username == request.username
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User account not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    # --------------------------------------------------------
    # ONLY STUDENTS FOR NOW
    # --------------------------------------------------------

    if user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Password change is currently available for students only"
        )

    # --------------------------------------------------------
    # FIND STUDENT
    # --------------------------------------------------------

    student = (
        db.query(Student)
        .filter(
            Student.user_id == user.id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=500,
            detail="Student account is not linked correctly"
        )

    if not student.email:
        raise HTTPException(
            status_code=400,
            detail="No email address is registered for this student"
        )

    # --------------------------------------------------------
    # INVALIDATE OLD OTPs
    # --------------------------------------------------------

    db.execute(
        text("""
            UPDATE password_reset_otps
            SET is_used = TRUE
            WHERE user_id = :user_id
              AND is_used = FALSE
        """),
        {
            "user_id": user.id
        }
    )

    # --------------------------------------------------------
    # GENERATE 6-DIGIT OTP
    # --------------------------------------------------------

    otp = str(
        secrets.randbelow(900000) + 100000
    )

    otp_hash = hash_otp(otp)

    expires_at = (
        datetime.now() +
        timedelta(minutes=5)
    )

    # --------------------------------------------------------
    # STORE HASHED OTP
    # --------------------------------------------------------

    db.execute(
        text("""
            INSERT INTO password_reset_otps
            (
                user_id,
                otp_hash,
                expires_at,
                attempts,
                is_used
            )
            VALUES
            (
                :user_id,
                :otp_hash,
                :expires_at,
                0,
                FALSE
            )
        """),
        {
            "user_id": user.id,
            "otp_hash": otp_hash,
            "expires_at": expires_at
        }
    )

    db.commit()

    # --------------------------------------------------------
    # TEMPORARY DEVELOPMENT RESPONSE
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # We are NOT sending the email yet.
    #
    # For testing the backend flow, the OTP is returned here.
    #
    # We will REMOVE this OTP from the response once Gmail
    # SMTP is connected.
    # --------------------------------------------------------

    return {
        "success": True,
        "message": "OTP generated successfully",
        "email": student.email,
        "otp": otp,
        "expires_in_seconds": 300
    }


# ============================================================
# VERIFY OTP
# ============================================================

@router.post("/verify-otp")
def verify_otp(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.username == request.username
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User account not found"
        )

    # --------------------------------------------------------
    # GET LATEST ACTIVE OTP
    # --------------------------------------------------------

    otp_record = db.execute(
        text("""
            SELECT
                id,
                otp_hash,
                expires_at,
                attempts,
                is_used
            FROM password_reset_otps
            WHERE user_id = :user_id
              AND is_used = FALSE
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {
            "user_id": user.id
        }
    ).mappings().first()

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="No active OTP found. Please request a new OTP."
        )

    # --------------------------------------------------------
    # CHECK ATTEMPTS
    # --------------------------------------------------------

    if otp_record["attempts"] >= 5:
        db.execute(
            text("""
                UPDATE password_reset_otps
                SET is_used = TRUE
                WHERE id = :otp_id
            """),
            {
                "otp_id": otp_record["id"]
            }
        )

        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Too many incorrect OTP attempts. Please request a new OTP."
        )

    # --------------------------------------------------------
    # CHECK EXPIRY
    # --------------------------------------------------------

    if datetime.now() > otp_record["expires_at"]:
        db.execute(
            text("""
                UPDATE password_reset_otps
                SET is_used = TRUE
                WHERE id = :otp_id
            """),
            {
                "otp_id": otp_record["id"]
            }
        )

        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP."
        )

    # --------------------------------------------------------
    # CHECK OTP
    # --------------------------------------------------------

    entered_hash = hash_otp(
        request.otp.strip()
    )

    if not secrets.compare_digest(
        entered_hash,
        otp_record["otp_hash"]
    ):
        db.execute(
            text("""
                UPDATE password_reset_otps
                SET attempts = attempts + 1
                WHERE id = :otp_id
            """),
            {
                "otp_id": otp_record["id"]
            }
        )

        db.commit()

        remaining_attempts = (
            4 - otp_record["attempts"]
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid OTP. "
                f"{max(remaining_attempts, 0)} attempts remaining."
            )
        )

    # --------------------------------------------------------
    # OTP IS VALID
    # --------------------------------------------------------

    return {
        "success": True,
        "message": "OTP verified successfully"
    }


# ============================================================
# CHANGE PASSWORD
# ============================================================

@router.post("/change")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # BASIC PASSWORD VALIDATION
    # --------------------------------------------------------

    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long"
        )

    if (
        request.new_password !=
        request.confirm_password
    ):
        raise HTTPException(
            status_code=400,
            detail="New password and confirm password do not match"
        )

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.username == request.username
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User account not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    # --------------------------------------------------------
    # FIND LATEST ACTIVE OTP
    # --------------------------------------------------------

    otp_record = db.execute(
        text("""
            SELECT
                id,
                otp_hash,
                expires_at,
                attempts,
                is_used
            FROM password_reset_otps
            WHERE user_id = :user_id
              AND is_used = FALSE
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {
            "user_id": user.id
        }
    ).mappings().first()

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="No active OTP found. Please request a new OTP."
        )

    # --------------------------------------------------------
    # CHECK EXPIRY
    # --------------------------------------------------------

    if datetime.now() > otp_record["expires_at"]:
        db.execute(
            text("""
                UPDATE password_reset_otps
                SET is_used = TRUE
                WHERE id = :otp_id
            """),
            {
                "otp_id": otp_record["id"]
            }
        )

        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP."
        )

    # --------------------------------------------------------
    # CHECK OTP
    # --------------------------------------------------------

    entered_hash = hash_otp(
        request.otp.strip()
    )

    if not secrets.compare_digest(
        entered_hash,
        otp_record["otp_hash"]
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    # --------------------------------------------------------
    # UPDATE PASSWORD USING PGCRYPTO
    # --------------------------------------------------------

    db.execute(
        text("""
            UPDATE users
            SET
                password_hash = crypt(
                    :new_password,
                    gen_salt('bf')
                ),
                must_change_password = FALSE
            WHERE id = :user_id
        """),
        {
            "new_password": request.new_password,
            "user_id": user.id
        }
    )

    # --------------------------------------------------------
    # MARK OTP AS USED
    # --------------------------------------------------------

    db.execute(
        text("""
            UPDATE password_reset_otps
            SET is_used = TRUE
            WHERE id = :otp_id
        """),
        {
            "otp_id": otp_record["id"]
        }
    )

    db.commit()

    return {
        "success": True,
        "message": "Password changed successfully"
    }