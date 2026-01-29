from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..deps import get_db, get_current_user, require_admin
from ...models import User
from ...schemas.task import TaskCreate, TaskUpdate, TaskOut
from ...services import task_service

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def get_tasks(
    assigned_to: Optional[int] = Query(None, description="Filter by assigned user ID"),
    status: Optional[str] = Query(None, description="Filter by status: open, in_progress, done"),
    date_from: Optional[datetime] = Query(None, description="Due date from"),
    date_to: Optional[datetime] = Query(None, description="Due date to"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List tasks with optional filters."""
    tasks = task_service.list_tasks(
        db, assigned_to=assigned_to, status=status,
        date_from=date_from, date_to=date_to,
        limit=limit, offset=offset
    )
    return tasks


@router.post("", response_model=TaskOut)
def create_task(
    body: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new task (admin only)."""
    task = task_service.create_task(
        db,
        title=body.title,
        description=body.description,
        creator_id=current_user.id,
        assigned_to=body.assigned_to,
        due_date=body.due_date,
    )
    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get task by ID."""
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    body: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update task. 
    - Admins can update any field.
    - Assigned users can only update status.
    """
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Non-admin can only update status of their own tasks
    if not current_user.is_admin:
        if task.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Can only update your assigned tasks")
        # Allow only status update
        if body.title is not None or body.description is not None or body.assigned_to is not None:
            raise HTTPException(status_code=403, detail="Only admins can update task details")
    
    task = task_service.update_task(
        db, task,
        status=body.status.value if body.status else None,
        assigned_to=body.assigned_to,
        title=body.title,
        description=body.description,
    )
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete task (admin only)."""
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task_service.delete_task(db, task)
    return {"detail": "Task deleted"}
