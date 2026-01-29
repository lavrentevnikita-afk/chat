"""File attachment API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import shutil

from ..deps import get_db, get_current_user
from ...models import User, Attachment
from ...core.config import UPLOAD_FOLDER

router = APIRouter(prefix="/api/v1/files", tags=["files"])

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    'document': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.md'],
    'archive': ['.zip', '.rar', '.7z', '.tar', '.gz'],
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def get_file_type(filename: str) -> str:
    """Determine file type from extension."""
    ext = os.path.splitext(filename)[1].lower()
    for file_type, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            return file_type
    return 'other'


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    ext = os.path.splitext(filename)[1].lower()
    for extensions in ALLOWED_EXTENSIONS.values():
        if ext in extensions:
            return True
    return False


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    message_id: Optional[int] = None,
    task_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file and create attachment record."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed: {list(ALLOWED_EXTENSIONS.values())}"
        )
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_type = get_file_type(file.filename)
    
    # Create upload directory
    upload_dir = os.path.join(UPLOAD_FOLDER, file_type)
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, unique_name)
    
    # Check file size (read in chunks)
    total_size = 0
    with open(file_path, 'wb') as f:
        while chunk := await file.read(8192):
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                f.close()
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size: {MAX_FILE_SIZE // 1024 // 1024}MB"
                )
            f.write(chunk)
    
    # Create database record
    attachment = Attachment(
        user_id=current_user.id,
        message_id=message_id,
        task_id=task_id,
        original_name=file.filename,
        stored_name=unique_name,
        file_type=file_type,
        size=total_size,
        mime_type=file.content_type or 'application/octet-stream',
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    return {
        "id": attachment.id,
        "original_name": attachment.original_name,
        "file_type": attachment.file_type,
        "size": attachment.size,
        "url": f"/api/v1/files/{attachment.id}",
        "thumbnail_url": f"/api/v1/files/{attachment.id}/thumb" if file_type == 'image' else None,
    }


@router.get("/{file_id}")
def get_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a file."""
    attachment = db.query(Attachment).filter(Attachment.id == file_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = os.path.join(UPLOAD_FOLDER, attachment.file_type, attachment.stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        file_path,
        filename=attachment.original_name,
        media_type=attachment.mime_type,
    )


@router.get("/{file_id}/thumb")
def get_thumbnail(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get image thumbnail (returns original for now)."""
    attachment = db.query(Attachment).filter(Attachment.id == file_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="File not found")
    
    if attachment.file_type != 'image':
        raise HTTPException(status_code=400, detail="Thumbnails only for images")
    
    file_path = os.path.join(UPLOAD_FOLDER, attachment.file_type, attachment.stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(file_path, media_type=attachment.mime_type)


@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a file (owner or admin only)."""
    attachment = db.query(Attachment).filter(Attachment.id == file_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="File not found")
    
    if attachment.user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Remove file from disk
    file_path = os.path.join(UPLOAD_FOLDER, attachment.file_type, attachment.stored_name)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from database
    db.delete(attachment)
    db.commit()
    
    return {"detail": "File deleted"}


@router.get("/message/{message_id}")
def get_message_attachments(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all attachments for a message."""
    attachments = db.query(Attachment).filter(
        Attachment.message_id == message_id
    ).all()
    
    return [{
        "id": a.id,
        "original_name": a.original_name,
        "file_type": a.file_type,
        "size": a.size,
        "url": f"/api/v1/files/{a.id}",
        "thumbnail_url": f"/api/v1/files/{a.id}/thumb" if a.file_type == 'image' else None,
    } for a in attachments]


@router.get("/task/{task_id}")
def get_task_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all attachments for a task."""
    attachments = db.query(Attachment).filter(
        Attachment.task_id == task_id
    ).all()
    
    return [{
        "id": a.id,
        "original_name": a.original_name,
        "file_type": a.file_type,
        "size": a.size,
        "url": f"/api/v1/files/{a.id}",
        "thumbnail_url": f"/api/v1/files/{a.id}/thumb" if a.file_type == 'image' else None,
    } for a in attachments]
