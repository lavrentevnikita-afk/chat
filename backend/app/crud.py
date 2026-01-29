from sqlalchemy.orm import Session
from . import models
from .auth import get_password_hash

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, username: str, password: str, role: str = 'user'):
    hashed = get_password_hash(password)
    user = models.User(username=username, password_hash=hashed, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def create_task(db: Session, title: str, description: str, creator: int, assigned_to: int | None = None, due_date=None):
    task = models.Task(title=title, description=description, creator=creator, assigned_to=assigned_to, due_date=due_date)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def get_tasks(db: Session, limit: int = 100):
    return db.query(models.Task).filter(models.Task.archived == False).order_by(models.Task.created_at.desc()).limit(limit).all()

def update_task_status(db: Session, task_id: int, status: str):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return None
    task.status = status
    db.commit()
    db.refresh(task)
    return task
