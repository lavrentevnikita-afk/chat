"""Socket.IO event handlers with JWT authentication."""
import socketio
from .db import SessionLocal
from .models import User, Message
from .core.security import decode_token
from .services import message_service

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Connected users: sid -> user_id
connected_users: dict[str, int] = {}


async def get_user_from_token(token: str) -> User | None:
    """Decode JWT and return User or None."""
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get('id')
    if not user_id:
        return None
    db = SessionLocal()
    try:
        return db.query(User).filter(User.id == user_id).first()
    finally:
        db.close()


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection with JWT auth."""
    token = auth.get('token') if auth else None
    if not token:
        # Try to get from query string
        query = environ.get('QUERY_STRING', '')
        for part in query.split('&'):
            if part.startswith('token='):
                token = part[6:]
                break
    
    if not token:
        await sio.disconnect(sid)
        return False
    
    user = await get_user_from_token(token)
    if not user:
        await sio.disconnect(sid)
        return False
    
    connected_users[sid] = user.id
    print(f"[Socket.IO] User {user.username} connected (sid={sid})")
    
    # Join user to their personal room for private notifications
    await sio.enter_room(sid, f"user_{user.id}")
    
    # Broadcast online status
    await sio.emit('user_online', {'user_id': user.id, 'username': user.username})
    return True


@sio.event
async def disconnect(sid):
    """Handle client disconnect."""
    user_id = connected_users.pop(sid, None)
    if user_id:
        await sio.emit('user_offline', {'user_id': user_id})
        print(f"[Socket.IO] User {user_id} disconnected (sid={sid})")


@sio.event
async def join_room(sid, data):
    """Join a chat room."""
    room = data.get('room', 'general')
    await sio.enter_room(sid, room)
    await sio.emit('room_joined', {'room': room}, to=sid)


@sio.event
async def leave_room(sid, data):
    """Leave a chat room."""
    room = data.get('room', 'general')
    await sio.leave_room(sid, room)
    await sio.emit('room_left', {'room': room}, to=sid)


@sio.event
async def send_message(sid, data):
    """Handle incoming chat message."""
    user_id = connected_users.get(sid)
    if not user_id:
        return
    
    content = data.get('content', '').strip()
    room = data.get('room', 'general')
    reply_to = data.get('reply_to')
    
    if not content:
        return
    
    # Save message to DB
    db = SessionLocal()
    try:
        msg = message_service.create_message(
            db, 
            sender_id=user_id, 
            content=content, 
            room=room,
            reply_to=reply_to
        )
        user = db.query(User).filter(User.id == user_id).first()
        
        # Broadcast to room
        await sio.emit('new_message', {
            'id': msg.id,
            'sender_id': user_id,
            'sender_username': user.username if user else 'unknown',
            'content': msg.content,
            'room': msg.room,
            'reply_to': msg.reply_to,
            'created_at': msg.created_at.isoformat(),
        }, room=room)
    finally:
        db.close()


@sio.event
async def typing(sid, data):
    """Broadcast typing indicator."""
    user_id = connected_users.get(sid)
    if not user_id:
        return
    room = data.get('room', 'general')
    await sio.emit('user_typing', {'user_id': user_id, 'room': room}, room=room, skip_sid=sid)


async def emit_task_created(task_id: int, title: str, assigned_to: int | None):
    """Emit task created event (called from task service)."""
    await sio.emit('task_created', {
        'id': task_id,
        'title': title,
        'assigned_to': assigned_to
    })
    # Notify assigned user specifically
    if assigned_to:
        await sio.emit('task_assigned', {
            'id': task_id,
            'title': title
        }, room=f"user_{assigned_to}")


async def emit_task_updated(task_id: int, status: str, assigned_to: int | None):
    """Emit task updated event."""
    await sio.emit('task_updated', {
        'id': task_id,
        'status': status
    })
