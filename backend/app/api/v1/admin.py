"""Admin API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from ..deps import get_db, get_current_user, require_admin
from ...models import User, Task, Message, Attachment, PushSubscription

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class UserUpdate(BaseModel):
    role: Optional[str] = None
    password: Optional[str] = None


# -- Stats --
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get dashboard statistics."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    
    # Users
    total_users = db.query(User).count()
    new_users_week = db.query(User).filter(User.created_at >= week_ago).count()
    
    # Tasks
    total_tasks = db.query(Task).filter(Task.archived == False).count()
    open_tasks = db.query(Task).filter(
        Task.archived == False, 
        Task.status == 'open'
    ).count()
    done_tasks = db.query(Task).filter(
        Task.archived == False, 
        Task.status == 'done'
    ).count()
    
    # Messages
    total_messages = db.query(Message).count()
    messages_week = db.query(Message).filter(Message.created_at >= week_ago).count()
    
    # Files
    total_files = db.query(Attachment).count()
    total_file_size = db.query(func.sum(Attachment.size)).scalar() or 0
    
    # Push subscriptions
    push_subs = db.query(PushSubscription).count()
    
    return {
        "users": {
            "total": total_users,
            "new_this_week": new_users_week,
        },
        "tasks": {
            "total": total_tasks,
            "open": open_tasks,
            "done": done_tasks,
        },
        "messages": {
            "total": total_messages,
            "this_week": messages_week,
        },
        "files": {
            "total": total_files,
            "total_size_mb": round(total_file_size / 1024 / 1024, 2),
        },
        "push_subscriptions": push_subs,
    }


# -- Users Management --
@router.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all users."""
    users = db.query(User).offset(skip).limit(limit).all()
    return [{
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]


@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get user details."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Stats for this user
    task_count = db.query(Task).filter(Task.assigned_to == user_id).count()
    message_count = db.query(Message).filter(Message.sender == user_id).count()
    
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "task_count": task_count,
        "message_count": message_count,
    }


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update user (role, password)."""
    if user_id == current_user.id and body.role and body.role != 'admin':
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if body.role:
        user.role = body.role
    
    if body.password:
        import bcrypt
        user.password_hash = bcrypt.hashpw(
            body.password.encode(), bcrypt.gensalt()
        ).decode()
    
    db.commit()
    return {"detail": "User updated"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete user."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user's push subscriptions
    db.query(PushSubscription).filter(PushSubscription.user_id == user_id).delete()
    
    # Note: Messages and tasks remain for history
    db.delete(user)
    db.commit()
    
    return {"detail": "User deleted"}


# -- Tasks Management --
@router.get("/tasks/archived")
def list_archived_tasks(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List archived tasks."""
    tasks = db.query(Task).filter(Task.archived == True).offset(skip).limit(limit).all()
    return [{
        "id": t.id,
        "title": t.title,
        "status": t.status.value if t.status else 'open',
        "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in tasks]


@router.post("/tasks/{task_id}/archive")
def archive_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Archive a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.archived = True
    db.commit()
    return {"detail": "Task archived"}


@router.post("/tasks/{task_id}/restore")
def restore_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Restore archived task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.archived = False
    db.commit()
    return {"detail": "Task restored"}


# -- Broadcast --
class BroadcastMessage(BaseModel):
    message: str


@router.post("/broadcast")
def broadcast_message(
    body: BroadcastMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Send broadcast message to all users (creates system message)."""
    msg = Message(
        sender=current_user.id,
        content=f"📢 {body.message}",
        org_id='general',
    )
    db.add(msg)
    db.commit()
    
    return {"detail": "Broadcast sent", "message_id": msg.id}
