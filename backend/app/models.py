from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.sql import func
from .db import Base
import enum

class TaskStatus(str, enum.Enum):
    open = 'open'
    done = 'done'

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default='user')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text)
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)
    creator = Column(Integer, ForeignKey('users.id'), nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.open)
    archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Message(Base):
    __tablename__ = 'messages'
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(Integer, ForeignKey('users.id'))
    content = Column(Text)
    org_id = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PushSubscription(Base):
    __tablename__ = 'push_subscriptions'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    endpoint = Column(String(1024))
    p256dh = Column(String(256))
    auth = Column(String(256))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Attachment(Base):
    __tablename__ = 'attachments'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    message_id = Column(Integer, ForeignKey('messages.id'), nullable=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=True)
    original_name = Column(String(512))
    stored_name = Column(String(256))
    file_type = Column(String(32))  # image, document, archive, other
    size = Column(Integer)  # bytes
    mime_type = Column(String(128))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
