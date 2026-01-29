from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..deps import get_db, get_current_user
from ...models import User
from ...schemas.message import MessageCreate, MessageOut
from ...services import message_service

router = APIRouter(prefix="/api/v1/messages", tags=["messages"])


@router.get("", response_model=list[MessageOut])
def get_messages(
    room: str = Query("general", description="Chat room name"),
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = Query(None, description="For pagination: get messages before this ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get messages from a room with pagination."""
    messages = message_service.get_messages(db, room=room, limit=limit, before_id=before_id)
    return [
        MessageOut(
            id=m.id,
            sender_id=m.sender_id,
            sender_username=m.sender.username if m.sender else "deleted",
            content=m.content,
            room=m.room,
            reply_to=m.reply_to,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("", response_model=MessageOut)
def create_message(
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new message (via REST, for fallback if WebSocket unavailable)."""
    msg = message_service.create_message(
        db,
        sender_id=current_user.id,
        content=body.content,
        room=body.room,
        reply_to=body.reply_to,
    )
    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_username=current_user.username,
        content=msg.content,
        room=msg.room,
        reply_to=msg.reply_to,
        created_at=msg.created_at,
    )


@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete your own message (or any if admin)."""
    msg = message_service.get_message(db, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")
    message_service.delete_message(db, msg)
    return {"detail": "Message deleted"}
