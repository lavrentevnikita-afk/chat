from sqlalchemy.orm import Session
from ..models import Message
from typing import Optional


def create_message(db: Session, sender_id: int, content: str, 
                   room: str = "general", reply_to: Optional[int] = None) -> Message:
    msg = Message(
        sender_id=sender_id,
        content=content,
        room=room,
        reply_to=reply_to
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_messages(db: Session, room: str = "general", limit: int = 50, 
                 before_id: Optional[int] = None) -> list[Message]:
    query = db.query(Message).filter(Message.room == room)
    if before_id is not None:
        query = query.filter(Message.id < before_id)
    return query.order_by(Message.created_at.desc()).limit(limit).all()[::-1]


def get_message(db: Session, message_id: int) -> Optional[Message]:
    return db.query(Message).filter(Message.id == message_id).first()


def delete_message(db: Session, message: Message) -> None:
    db.delete(message)
    db.commit()
