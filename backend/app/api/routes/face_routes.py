import json
import os

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.student import Student

from deepface import DeepFace


router = APIRouter(
    prefix="/face",
    tags=["Face Verification"]
)


# ============================================================
# FACE SETTINGS
# ============================================================

MODEL_NAME = "ArcFace"

# Face similarity threshold
# 0.10 = minimum similarity required
DISTANCE_THRESHOLD = 0.10

# More reliable face detector than OpenCV for face verification
DETECTOR_BACKEND = "retinaface"


# ============================================================
# EXTRACT FACE EMBEDDING
# ============================================================

def extract_embedding(image_path: str):

    try:

        result = DeepFace.represent(
            img_path=image_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True
        )

        if not result:
            raise ValueError("No face detected")

        embedding = result[0]["embedding"]

        return np.array(
            embedding,
            dtype=np.float32
        )

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=f"Face detection failed: {str(error)}"
        )


# ============================================================
# COSINE DISTANCE
# ============================================================

def cosine_distance(a, b):

    a = np.array(
        a,
        dtype=np.float32
    )

    b = np.array(
        b,
        dtype=np.float32
    )

    denominator = (
        np.linalg.norm(a)
        *
        np.linalg.norm(b)
    )

    if denominator == 0:

        return 1.0

    similarity = (
        np.dot(a, b)
        /
        denominator
    )

    return float(
        1 - similarity
    )


# ============================================================
# CHECK FACE ENROLLMENT STATUS
# ============================================================

@router.get("/status/{student_id}")
def face_status(
    student_id: int,
    db: Session = Depends(get_db)
):

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return {
        "student_id": student.id,
        "face_enrolled": bool(
            student.face_embedding
        )
    }


# ============================================================
# FACE ENROLLMENT
# ============================================================

@router.post("/enroll")
async def enroll_face(
    student_id: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Find student
    # --------------------------------------------------------

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    # --------------------------------------------------------
    # Prevent duplicate enrollment
    # --------------------------------------------------------

    if student.face_embedding:

        raise HTTPException(
            status_code=400,
            detail="Face is already enrolled for this student"
        )

    # --------------------------------------------------------
    # Read uploaded image
    # --------------------------------------------------------

    image_bytes = await image.read()

    temp_path = (
        f"temp_face_{student_id}.jpg"
    )

    try:

        # ----------------------------------------------------
        # Save temporary image
        # ----------------------------------------------------

        with open(
            temp_path,
            "wb"
        ) as file:

            file.write(image_bytes)

        # ----------------------------------------------------
        # Extract face embedding
        # ----------------------------------------------------

        embedding = extract_embedding(
            temp_path
        )

        # ----------------------------------------------------
        # Store embedding as JSON
        # ----------------------------------------------------

        student.face_embedding = json.dumps(
            embedding.tolist()
        )

        db.commit()

        db.refresh(student)

        return {
            "success": True,
            "student_id": student.id,
            "message": "Face enrolled successfully"
        }

    except HTTPException:

        raise

    except Exception as error:

        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Face enrollment failed: {str(error)}"
        )

    finally:

        # ----------------------------------------------------
        # Delete temporary image
        # ----------------------------------------------------

        if os.path.exists(temp_path):

            os.remove(temp_path)


# ============================================================
# FACE VERIFICATION
# ============================================================

@router.post("/verify")
async def verify_face(
    student_id: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Find student
    # --------------------------------------------------------

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    # --------------------------------------------------------
    # Check enrollment
    # --------------------------------------------------------

    if not student.face_embedding:

        raise HTTPException(
            status_code=400,
            detail="Face is not enrolled for this student"
        )

    # --------------------------------------------------------
    # Read uploaded image
    # --------------------------------------------------------

    image_bytes = await image.read()

    temp_path = (
        f"temp_verify_{student_id}.jpg"
    )

    try:

        # ----------------------------------------------------
        # Save image temporarily
        # ----------------------------------------------------

        with open(
            temp_path,
            "wb"
        ) as file:

            file.write(image_bytes)

        # ----------------------------------------------------
        # Extract live face embedding
        # ----------------------------------------------------

        live_embedding = extract_embedding(
            temp_path
        )

        # ----------------------------------------------------
        # Load enrolled embedding
        # ----------------------------------------------------

        stored_embedding = np.array(
            json.loads(
                student.face_embedding
            ),
            dtype=np.float32
        )

        # ----------------------------------------------------
        # Calculate cosine distance
        # ----------------------------------------------------

        distance = cosine_distance(
            live_embedding,
            stored_embedding
        )

        # ----------------------------------------------------
        # Convert distance to similarity
        # ----------------------------------------------------

        similarity = max(
            0.0,
            1.0 - distance
        )

        # ----------------------------------------------------
        # Compare with threshold
        # ----------------------------------------------------

        verified = (
            similarity >= DISTANCE_THRESHOLD
        )

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return {
            "verified": verified,
            "student_id": student.id,
            "similarity": round(
                similarity,
                4
            ),
            "threshold": DISTANCE_THRESHOLD,
            "message":
                "Face verified successfully"
                if verified
                else
                "Face verification failed"
        }

    except HTTPException:

        raise

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=f"Face verification failed: {str(error)}"
        )

    finally:

        # ----------------------------------------------------
        # Delete temporary image
        # ----------------------------------------------------

        if os.path.exists(temp_path):

            os.remove(temp_path)