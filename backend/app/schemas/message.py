from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    room: str = "general"
    reply_to: Optional[int] = None


class MessageOut(BaseModel):
    id: int
    sender_id: int
    sender_username: str
    content: str
    room: str
    reply_to: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
