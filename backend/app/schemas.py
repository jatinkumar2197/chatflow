"""
Pydantic schemas used for request validation and response serialization.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict, Field


# ---------- Auth ----------

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ---------- User ----------

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    profile_image: Optional[str] = None
    is_online: bool
    last_seen: datetime
    qr_uuid: str


class UserPublic(BaseModel):
    """Reduced user info safe to expose to other users (e.g. QR scan result)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    profile_image: Optional[str] = None
    is_online: bool
    last_seen: datetime


class UserUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None


# ---------- Chat ----------

class MessageCreate(BaseModel):
    receiver_id: int
    message: str = Field(min_length=1)
    message_type: str = "text"


class MessageUpdate(BaseModel):
    message: str = Field(min_length=1)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    receiver_id: int
    message: str
    message_type: str
    is_read: bool
    is_delivered: bool
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class ConversationSummary(BaseModel):
    user: UserPublic
    last_message: Optional[MessageOut] = None
    unread_count: int = 0


# ---------- QR ----------

class QRScanRequest(BaseModel):
    qr_uuid: str


class QRUserResponse(BaseModel):
    user: UserPublic
    conversation_exists: bool


Token.model_rebuild()
