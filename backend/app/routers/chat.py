"""
Chat routes: REST endpoints for message history/CRUD, plus the
/ws/{token} WebSocket endpoint for real-time delivery, typing
indicators, read receipts, and presence.
"""
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from .. import schemas, crud, models
from ..database import get_db, SessionLocal
from ..dependencies import get_current_user
from ..auth import decode_access_token
from ..websocket import manager

router = APIRouter(prefix="/api", tags=["Chat"])


@router.get("/conversations", response_model=List[schemas.ConversationSummary])
def list_conversations(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Sidebar data: every conversation partner, their last message, and unread count."""
    raw = crud.get_conversations_list(db, current_user.id)
    return [
        schemas.ConversationSummary(
            user=schemas.UserPublic.model_validate(r["user"]),
            last_message=schemas.MessageOut.model_validate(r["last_message"])
            if r["last_message"]
            else None,
            unread_count=r["unread_count"],
        )
        for r in raw
    ]


@router.get("/messages/{user_id}", response_model=List[schemas.MessageOut])
def get_messages(
    user_id: int,
    limit: int = 100,
    offset: int = 0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch (and mark-as-read) the conversation history with another user."""
    if not crud.get_user_by_id(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    messages = crud.get_conversation(db, current_user.id, user_id, limit, offset)
    crud.mark_messages_read(db, reader_id=current_user.id, sender_id=user_id)
    return messages


@router.post("/message", response_model=schemas.MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    msg_in: schemas.MessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fallback REST send (in addition to WebSocket) so messages can still be
    sent if a client's socket is temporarily down.
    """
    if not crud.get_user_by_id(db, msg_in.receiver_id):
        raise HTTPException(status_code=404, detail="Recipient not found")
    if msg_in.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    message = crud.create_message(db, current_user.id, msg_in)

    await manager.send_to_user(
        msg_in.receiver_id,
        {"type": "message", "data": json.loads(schemas.MessageOut.model_validate(message).model_dump_json())},
    )
    return message


@router.put("/message/{message_id}", response_model=schemas.MessageOut)
async def edit_message(
    message_id: int,
    update: schemas.MessageUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = crud.get_message(db, message_id)
    if not message or message.is_deleted:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")

    updated = crud.edit_message(db, message, update.message)

    await manager.send_to_user(
        message.receiver_id,
        {"type": "message_edited", "data": json.loads(schemas.MessageOut.model_validate(updated).model_dump_json())},
    )
    return updated


@router.delete("/message/{message_id}")
async def delete_message(
    message_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = crud.get_message(db, message_id)
    if not message or message.is_deleted:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    crud.delete_message(db, message)

    await manager.send_to_user(
        message.receiver_id, {"type": "message_deleted", "data": {"id": message.id}}
    )
    return {"detail": "Message deleted"}


# ---------- WebSocket ----------

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    Real-time channel. Client connects with their JWT in the URL path.
    Supported outgoing event types from client: "message", "typing", "read".
    Supported incoming event types to client: "message", "typing",
    "read_receipt", "presence", "message_edited", "message_deleted".
    """
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = int(payload.get("sub"))
    db = SessionLocal()
    user = crud.get_user_by_id(db, user_id)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        db.close()
        return

    await manager.connect(user_id, websocket)
    crud.update_user_status(db, user, is_online=True)
    await manager.broadcast_presence(user_id, is_online=True)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type")

            if event_type == "message":
                receiver_id = event.get("receiver_id")
                text = event.get("message", "")
                if not receiver_id or not text.strip():
                    continue
                msg_in = schemas.MessageCreate(
                    receiver_id=receiver_id,
                    message=text,
                    message_type=event.get("message_type", "text"),
                )
                message = crud.create_message(db, user_id, msg_in)
                payload_out = {
                    "type": "message",
                    "data": json.loads(
                        schemas.MessageOut.model_validate(message).model_dump_json()
                    ),
                }
                await manager.send_to_user(receiver_id, payload_out)
                await manager.send_to_user(user_id, payload_out)  # echo to sender's other tabs

            elif event_type == "typing":
                receiver_id = event.get("receiver_id")
                if receiver_id:
                    await manager.send_to_user(
                        receiver_id,
                        {
                            "type": "typing",
                            "sender_id": user_id,
                            "is_typing": bool(event.get("is_typing", True)),
                        },
                    )

            elif event_type == "read":
                sender_id = event.get("sender_id")
                if sender_id:
                    crud.mark_messages_read(db, reader_id=user_id, sender_id=sender_id)
                    await manager.send_to_user(
                        sender_id,
                        {"type": "read_receipt", "reader_id": user_id},
                    )

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)
        crud.update_user_status(db, user, is_online=manager.is_online(user_id))
        if not manager.is_online(user_id):
            await manager.broadcast_presence(user_id, is_online=False)
        db.close()
