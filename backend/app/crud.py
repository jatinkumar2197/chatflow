"""
CRUD (Create/Read/Update/Delete) helper functions.
Keeps database query logic out of the route handlers.
"""
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from . import models, schemas
from .auth import hash_password


# ---------- User ----------

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_qr_uuid(db: Session, qr_uuid: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.qr_uuid == qr_uuid).first()


def create_user(db: Session, user_in: schemas.UserRegister) -> models.User:
    user = models.User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_all_users(db: Session, exclude_user_id: int) -> List[models.User]:
    return (
        db.query(models.User)
        .filter(models.User.id != exclude_user_id)
        .order_by(models.User.is_online.desc(), models.User.username.asc())
        .all()
    )


def update_user_status(db: Session, user: models.User, is_online: bool) -> None:
    user.is_online = is_online
    user.last_seen = datetime.now(timezone.utc)
    db.commit()


def update_user_profile(
    db: Session, user: models.User, update: schemas.UserUpdate
) -> models.User:
    if update.username is not None:
        user.username = update.username
    if update.email is not None:
        user.email = update.email
    db.commit()
    db.refresh(user)
    return user


# ---------- Messages ----------

def create_message(
    db: Session, sender_id: int, msg_in: schemas.MessageCreate
) -> models.Message:
    message = models.Message(
        sender_id=sender_id,
        receiver_id=msg_in.receiver_id,
        message=msg_in.message,
        message_type=msg_in.message_type,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_conversation(
    db: Session, user_id: int, other_user_id: int, limit: int = 100, offset: int = 0
) -> List[models.Message]:
    return (
        db.query(models.Message)
        .filter(
            and_(
                models.Message.is_deleted == False,  # noqa: E712
                or_(
                    and_(
                        models.Message.sender_id == user_id,
                        models.Message.receiver_id == other_user_id,
                    ),
                    and_(
                        models.Message.sender_id == other_user_id,
                        models.Message.receiver_id == user_id,
                    ),
                ),
            )
        )
        .order_by(models.Message.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def mark_messages_read(db: Session, reader_id: int, sender_id: int) -> int:
    """Mark all messages sent by sender_id to reader_id as read. Returns count updated."""
    updated = (
        db.query(models.Message)
        .filter(
            models.Message.sender_id == sender_id,
            models.Message.receiver_id == reader_id,
            models.Message.is_read == False,  # noqa: E712
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated


def get_unread_count(db: Session, reader_id: int, sender_id: int) -> int:
    return (
        db.query(models.Message)
        .filter(
            models.Message.sender_id == sender_id,
            models.Message.receiver_id == reader_id,
            models.Message.is_read == False,  # noqa: E712
        )
        .count()
    )


def get_message(db: Session, message_id: int) -> Optional[models.Message]:
    return db.query(models.Message).filter(models.Message.id == message_id).first()


def delete_message(db: Session, message: models.Message) -> None:
    message.is_deleted = True
    message.message = "This message was deleted"
    db.commit()


def edit_message(db: Session, message: models.Message, new_text: str) -> models.Message:
    message.message = new_text
    message.is_edited = True
    db.commit()
    db.refresh(message)
    return message


def get_conversations_list(db: Session, user_id: int) -> List[dict]:
    """
    Build a list of conversation partners for a user, each with their
    last message and unread count -- used to populate the sidebar.
    """
    sent_to = db.query(models.Message.receiver_id).filter(
        models.Message.sender_id == user_id
    )
    received_from = db.query(models.Message.sender_id).filter(
        models.Message.receiver_id == user_id
    )
    partner_ids = {row[0] for row in sent_to.all()} | {row[0] for row in received_from.all()}

    results = []
    for partner_id in partner_ids:
        partner = get_user_by_id(db, partner_id)
        if not partner:
            continue
        last_msg = (
            db.query(models.Message)
            .filter(
                or_(
                    and_(models.Message.sender_id == user_id, models.Message.receiver_id == partner_id),
                    and_(models.Message.sender_id == partner_id, models.Message.receiver_id == user_id),
                )
            )
            .order_by(models.Message.created_at.desc())
            .first()
        )
        unread = get_unread_count(db, reader_id=user_id, sender_id=partner_id)
        results.append({"user": partner, "last_message": last_msg, "unread_count": unread})

    results.sort(
        key=lambda r: r["last_message"].created_at if r["last_message"] else datetime.min,
        reverse=True,
    )
    return results
