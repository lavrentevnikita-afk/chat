from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class TaskStatusEnum(str, Enum):
    open = "open"
    in_progress = "in_progress"
    done = "done"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    status: Optional[TaskStatusEnum] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    status: TaskStatusEnum
    creator: int
    assigned_to: Optional[int]
    due_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
