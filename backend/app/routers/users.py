"""
User routes: profile management, online users list, profile picture upload,
and QR-code based user discovery.
"""
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from .. import schemas, crud, models
from ..database import get_db
from ..dependencies import get_current_user
from ..utils import save_profile_image, generate_qr_code
from ..websocket import manager

router = APIRouter(prefix="/api", tags=["Users"])

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/users", response_model=List[schemas.UserPublic])
def list_users(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Return all users (excluding self) with live online status and last seen."""
    users = crud.get_all_users(db, exclude_user_id=current_user.id)
    for u in users:
        u.is_online = manager.is_online(u.id)
    return users


@router.get("/profile", response_model=schemas.UserOut)
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if update.username and update.username != current_user.username:
        if crud.get_user_by_username(db, update.username):
            raise HTTPException(status_code=400, detail="Username already taken")
    if update.email and update.email != current_user.email:
        if crud.get_user_by_email(db, update.email):
            raise HTTPException(status_code=400, detail="Email already registered")

    return crud.update_user_profile(db, current_user, update)


@router.post("/profile/picture", response_model=schemas.UserOut)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload and set a new profile picture. Validates type and size."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WEBP images are allowed")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be smaller than 5MB")

    relative_path = save_profile_image(contents, file.filename, current_user.id)
    current_user.profile_image = relative_path
    db.commit()
    db.refresh(current_user)
    return current_user


# ---------- QR Code Endpoints ----------

@router.get("/my-qr")
def get_my_qr(current_user: models.User = Depends(get_current_user)):
    """Return the current user's QR code image path and deep link."""
    return {
        "qr_uuid": current_user.qr_uuid,
        "qr_image_url": f"/{current_user.qr_image_path}" if current_user.qr_image_path else None,
        "deep_link": f"{APP_BASE_URL}/chat/{current_user.qr_uuid}",
    }


@router.post("/generate-qr")
def regenerate_qr(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Force-regenerate the user's QR code image (e.g. after a UUID rotation)."""
    qr_path = generate_qr_code(current_user.qr_uuid, APP_BASE_URL)
    current_user.qr_image_path = qr_path
    db.commit()
    return {"qr_image_url": f"/{qr_path}"}


@router.get("/user-by-qr/{qr_uuid}", response_model=schemas.QRUserResponse)
def get_user_by_qr(
    qr_uuid: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Resolve a scanned QR UUID to a public user profile. Used by the
    scanner page before starting a chat. Never exposes email/password.
    """
    target = crud.get_user_by_qr_uuid(db, qr_uuid)
    if not target:
        raise HTTPException(status_code=404, detail="No user found for this QR code")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot start a chat with yourself")

    target.is_online = manager.is_online(target.id)

    conversation_exists = bool(
        crud.get_conversation(db, current_user.id, target.id, limit=1)
    )

    return schemas.QRUserResponse(
        user=schemas.UserPublic.model_validate(target),
        conversation_exists=conversation_exists,
    )


@router.post("/scan-qr", response_model=schemas.QRUserResponse)
def scan_qr(
    payload: schemas.QRScanRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validate scanned QR data server-side and return the target user's
    public profile plus whether a conversation already exists, so the
    frontend can either open it or start a new one.
    """
    return get_user_by_qr(payload.qr_uuid, current_user, db)
