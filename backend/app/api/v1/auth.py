from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from ..deps import get_db, get_current_user
from ...models import User
from ...core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6)

class TokenResponse(BaseModel):
    access: str
    refresh: str

class RefreshRequest(BaseModel):
    refresh: str

class UserRead(BaseModel):
    id: int
    username: str
    role: str
    class Config:
        orm_mode = True

@router.post("/register", response_model=UserRead)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=TokenResponse)
def login(data: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_access_token({"sub": user.username, "id": user.id, "role": user.role})
    refresh = create_refresh_token({"sub": user.username, "id": user.id, "role": user.role})
    return {"access": access, "refresh": refresh}

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshRequest):
    payload = decode_token(data.refresh)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access = create_access_token({"sub": payload["sub"], "id": payload["id"], "role": payload.get("role", "user")})
    refresh = create_refresh_token({"sub": payload["sub"], "id": payload["id"], "role": payload.get("role", "user")})
    return {"access": access, "refresh": refresh}

@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
