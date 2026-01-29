from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import socketio
from .db import engine, Base, get_db, SessionLocal
from . import crud, schemas
from sqlalchemy.orm import Session
from .core.security import create_access_token, verify_password, decode_token
from .core.config import UPLOAD_FOLDER
import os
from .models import User
from typing import Optional
import shutil

# Import routers
from .api.v1.auth import router as auth_router
from .api.v1.tasks import router as tasks_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Team Messenger', version='0.0.4')

# Include routers
app.include_router(auth_router)
app.include_router(tasks_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO server (async)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
# Mount Socket.IO on top of FastAPI ASGI app so both work under same process
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@app.post('/api/v1/auth/register')
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = crud.get_user_by_username(db, user.username)
    if existing:
        raise HTTPException(status_code=400, detail='User exists')
    u = crud.create_user(db, user.username, user.password)
    return {'id': u.id, 'username': u.username}


@app.post('/api/v1/auth/login')
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, user.username)
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_access_token({'sub': db_user.username, 'id': db_user.id})
    return {'access': token}


def get_current_user(request: Request) -> Optional[User]:
    auth = request.headers.get('Authorization')
    if not auth:
        return None
    parts = auth.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    token = parts[1]
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get('id')
    db = SessionLocal()
    try:
        return db.query(User).filter(User.id == user_id).first()
    finally:
        db.close()


@app.get('/api/v1/tasks')
def list_tasks(db: Session = Depends(get_db)):
    tasks = crud.get_tasks(db)
    return [schemas.TaskRead.from_orm(t) for t in tasks]


@app.post('/api/v1/tasks')
def create_task(payload: schemas.TaskCreate, request: Request, db: Session = Depends(get_db)):
    current = get_current_user(request)
    if not current:
        raise HTTPException(status_code=401, detail='Unauthorized')
    creator = current.id
    task = crud.create_task(db, payload.title, payload.description or '', creator, payload.assigned_to, payload.due_date)
    # emit socket event
    try:
        import asyncio
        asyncio.create_task(sio.emit('task_created', { 'id': task.id, 'title': task.title, 'assigned_to': task.assigned_to }))
    except Exception:
        pass
    return JSONResponse(status_code=201, content=schemas.TaskRead.from_orm(task).dict())


@app.put('/api/v1/tasks/{task_id}')
def update_task(task_id: int, payload: dict, db: Session = Depends(get_db)):
    status = payload.get('status')
    assigned = payload.get('assigned_to')
    if status:
        task = crud.update_task_status(db, task_id, status)
    else:
        task = None
    if task:
        try:
            import asyncio
            asyncio.create_task(sio.emit('task_updated', { 'id': task.id, 'status': task.status }))
        except Exception:
            pass
        return schemas.TaskRead.from_orm(task)
    raise HTTPException(status_code=404, detail='Task not found')


@app.post('/api/v1/uploads')
async def upload_zip(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail='Only zip allowed')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    dst = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(dst, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    return {'filename': file.filename}


@app.get('/health')
def health():
    return {'status':'ok'}



@app.on_event('startup')
def ensure_admin():
    admin_user = os.getenv('ADMIN_USER')
    admin_pass = os.getenv('ADMIN_PASS')
    if admin_user and admin_pass:
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.username == admin_user).first()
            if not u:
                from .crud import create_user
                create_user(db, admin_user, admin_pass, role='admin')
        finally:
            db.close()


asgi_app = socket_app  # export combined ASGI app (Socket.IO + FastAPI)
