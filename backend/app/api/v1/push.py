from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

from ..deps import get_db, get_current_user
from ...models import User, PushSubscription
from ...services.push_service import get_vapid_public_key

router = APIRouter(prefix="/api/v1/push", tags=["push"])


@router.get("/vapid-key")
def get_vapid_key():
    """Return VAPID public key for client subscription."""
    return {"publicKey": get_vapid_public_key()}


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict


@router.post("/subscribe")
def subscribe_push(
    body: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Subscribe to push notifications."""
    # Check if subscription already exists
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.endpoint == body.endpoint
    ).first()
    
    if existing:
        # Update keys
        existing.p256dh = body.keys.get('p256dh', '')
        existing.auth = body.keys.get('auth', '')
        db.commit()
        return {"detail": "Subscription updated"}
    
    # Create new subscription
    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.keys.get('p256dh', ''),
        auth=body.keys.get('auth', ''),
    )
    db.add(sub)
    db.commit()
    
    return {"detail": "Subscribed"}


@router.delete("/subscribe")
def unsubscribe_push(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unsubscribe from push notifications."""
    db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).delete()
    db.commit()
    return {"detail": "Unsubscribed"}


@router.get("/status")
def push_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check push subscription status."""
    count = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).count()
    return {"subscribed": count > 0, "subscription_count": count}
