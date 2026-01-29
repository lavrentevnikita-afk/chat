"""Team Messenger - FastAPI + Socket.IO Backend"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import socketio
import os
import shutil

from .db import engine, Base, SessionLocal
from .core.config import UPLOAD_FOLDER
from .models import User
from .crud import create_user

# Import routers
from .api.v1.auth import router as auth_router
from .api.v1.tasks import router as tasks_router
from .api.v1.messages import router as messages_router
from .api.v1.push import router as push_router
from .api.v1.files import router as files_router
from .api.v1.admin import router as admin_router

# Import Socket.IO instance
from .sockets import sio

# Create database tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(title='Team Messenger', version='0.0.5')

# Include API routers
app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(messages_router)
app.include_router(push_router)
app.include_router(files_router)
app.include_router(admin_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post('/api/v1/uploads')
async def upload_file(file: UploadFile = File(...)):
    """Upload a file (zip archives only for now)."""
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail='Only zip files allowed')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    dst = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(dst, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    return {'filename': file.filename}


@app.get('/health')
def health():
    """Health check endpoint."""
    return {'status': 'ok'}


@app.on_event('startup')
def on_startup():
    """Create admin user on startup if configured."""
    admin_user = os.getenv('ADMIN_USER')
    admin_pass = os.getenv('ADMIN_PASS')
    if admin_user and admin_pass:
        db = SessionLocal()
        try:
            existing = db.query(User).filter(User.username == admin_user).first()
            if not existing:
                create_user(db, admin_user, admin_pass, role='admin')
                print(f"[Startup] Created admin user: {admin_user}")
        finally:
            db.close()


# Mount Socket.IO on top of FastAPI ASGI app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Export combined ASGI app (used by uvicorn)
asgi_app = socket_app
