from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    id: int
    username: str
    role: str
    
    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    sender: str
    content: str
