import os
import json
import gzip
from datetime import datetime, timedelta
from app.db import SessionLocal
from app.models import Message, Task

ARCHIVE_DIR = os.getenv('ARCHIVE_DIR', '/app/archives')

def archive_old():
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    cutoff = datetime.utcnow() - timedelta(days=30)
    db = SessionLocal()
    try:
        old_msgs = db.query(Message).filter(Message.created_at < cutoff).all()
        old_tasks = db.query(Task).filter(Task.created_at < cutoff).all()
        if not old_msgs and not old_tasks:
            print('Nothing to archive')
            return
        date_tag = datetime.utcnow().strftime('%Y-%m-%d')
        out_path = os.path.join(ARCHIVE_DIR, f'archive-{date_tag}.json.gz')
        payload = {
            'messages': [ { 'id': m.id, 'sender': m.sender, 'content': m.content, 'created_at': str(m.created_at) } for m in old_msgs],
            'tasks': [ { 'id': t.id, 'title': t.title, 'description': t.description, 'created_at': str(t.created_at) } for t in old_tasks]
        }
        with gzip.open(out_path, 'wt', encoding='utf-8') as f:
            json.dump(payload, f)
        # mark archived (simple approach)
        for t in old_tasks:
            t.archived = True
        db.commit()
        print('Archived to', out_path)
    finally:
        db.close()

if __name__ == '__main__':
    archive_old()
