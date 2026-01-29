"""Push notification service using Web Push API."""
import os
import json
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session
from ..models import PushSubscription


# VAPID keys - generate once and keep secret
# Generate with: vapid --gen
VAPID_PUBLIC_KEY = os.getenv(
    'VAPID_PUBLIC_KEY',
    'BMLgE4mdPb5E-TyPCMFWZq4Fw_pXQypxWi5Mz-vRB4x0-rjQz3rj8q0jZqKzN_DUMMY_KEY'
)
VAPID_PRIVATE_KEY = os.getenv(
    'VAPID_PRIVATE_KEY',
    'DUMMY_PRIVATE_KEY_REPLACE_IN_PRODUCTION'
)
VAPID_CLAIMS = {
    'sub': 'mailto:admin@corpchat.local'
}


def send_push_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    data: dict = None,
    icon: str = '/icons/icon-192.svg',
    tag: str = None,
) -> int:
    """
    Send push notification to all subscriptions of a user.
    Returns count of successful sends.
    """
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id
    ).all()
    
    success_count = 0
    failed_endpoints = []
    
    payload = json.dumps({
        'title': title,
        'body': body,
        'icon': icon,
        'tag': tag or 'notification',
        'data': data or {},
    })
    
    for sub in subscriptions:
        subscription_info = {
            'endpoint': sub.endpoint,
            'keys': {
                'p256dh': sub.p256dh,
                'auth': sub.auth,
            }
        }
        
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
            success_count += 1
        except WebPushException as e:
            print(f"Push failed for {sub.endpoint[:50]}...: {e}")
            # Remove invalid subscriptions (410 Gone, 404 Not Found)
            if e.response and e.response.status_code in (404, 410):
                failed_endpoints.append(sub.id)
        except Exception as e:
            print(f"Push error: {e}")
    
    # Clean up invalid subscriptions
    if failed_endpoints:
        db.query(PushSubscription).filter(
            PushSubscription.id.in_(failed_endpoints)
        ).delete(synchronize_session=False)
        db.commit()
    
    return success_count


def notify_new_task(db: Session, user_id: int, task_title: str, task_id: int):
    """Send push when user gets assigned a new task."""
    send_push_notification(
        db=db,
        user_id=user_id,
        title='📋 Новая задача',
        body=task_title,
        data={'type': 'task', 'task_id': task_id},
        tag=f'task-{task_id}',
    )


def notify_task_updated(db: Session, user_id: int, task_title: str, task_id: int, status: str):
    """Send push when task status changes."""
    emoji = '✅' if status == 'done' else '📋'
    send_push_notification(
        db=db,
        user_id=user_id,
        title=f'{emoji} Задача обновлена',
        body=f'{task_title} — {status}',
        data={'type': 'task', 'task_id': task_id},
        tag=f'task-{task_id}',
    )


def notify_new_message(db: Session, user_id: int, sender_name: str, content: str):
    """Send push for new chat message."""
    preview = content[:50] + '...' if len(content) > 50 else content
    send_push_notification(
        db=db,
        user_id=user_id,
        title=f'💬 {sender_name}',
        body=preview,
        data={'type': 'message'},
        tag='chat',
    )


def get_vapid_public_key() -> str:
    """Return public VAPID key for client subscription."""
    return VAPID_PUBLIC_KEY
