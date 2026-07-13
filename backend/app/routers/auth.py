"""
Authentication routes: register, login, logout.
"""
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, crud
from ..database import get_db
from ..auth import verify_password, create_access_token
from ..utils import generate_qr_code
from ..dependencies import get_current_user
from .. import models

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000")


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    """Create a new user account, hash the password, and issue a QR code + JWT."""
    if crud.get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if crud.get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user = crud.create_user(db, user_in)

    # Automatically generate this user's personal QR code (encodes only their UUID)
    qr_path = generate_qr_code(user.qr_uuid, APP_BASE_URL)
    user.qr_image_path = qr_path
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Validate credentials and issue a JWT access token."""
    user = crud.get_user_by_email(db, credentials.email)
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(data={"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Log out the current user. JWTs are stateless, so logout is enforced
    client-side by discarding the token; here we also mark the user offline.
    """
    crud.update_user_status(db, current_user, is_online=False)
    return {"detail": "Successfully logged out"}
