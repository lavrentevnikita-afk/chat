from sqlalchemy.orm import Session
from ..models import Task, TaskStatus
from datetime import datetime
from typing import Optional

def create_task(db: Session, title: str, description: str, creator_id: int, 
                assigned_to: Optional[int] = None, due_date: Optional[datetime] = None) -> Task:
    task = Task(
        title=title,
        description=description,
        creator=creator_id,
        assigned_to=assigned_to,
        due_date=due_date,
        status=TaskStatus.open
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def get_task(db: Session, task_id: int) -> Optional[Task]:
    return db.query(Task).filter(Task.id == task_id, Task.archived == False).first()

def list_tasks(db: Session, assigned_to: Optional[int] = None, status: Optional[str] = None,
               date_from: Optional[datetime] = None, date_to: Optional[datetime] = None,
               limit: int = 50, offset: int = 0) -> list[Task]:
    query = db.query(Task).filter(Task.archived == False)
    if assigned_to is not None:
        query = query.filter(Task.assigned_to == assigned_to)
    if status is not None:
        query = query.filter(Task.status == status)
    if date_from is not None:
        query = query.filter(Task.due_date >= date_from)
    if date_to is not None:
        query = query.filter(Task.due_date <= date_to)
    return query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()

def update_task(db: Session, task: Task, status: Optional[str] = None, 
                assigned_to: Optional[int] = None, title: Optional[str] = None,
                description: Optional[str] = None) -> Task:
    if status is not None:
        task.status = status
    if assigned_to is not None:
        task.assigned_to = assigned_to
    if title is not None:
        task.title = title
    if description is not None:
        task.description = description
    db.commit()
    db.refresh(task)
    return task

def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()
