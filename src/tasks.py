from celery import Celery
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import get_db
from .models import Note

# Get Redis URL from environment variable with fallback
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Initialize Celery
celery = Celery('tasks', broker=redis_url, backend=redis_url)

# Configure Celery
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)

@celery.task(name='test_task')
def test_task():
    """A simple test task to verify Celery is working."""
    return {'status': 'Task completed successfully'}

@celery.task
def cleanup_old_notes():
    """Delete notes that have been in the trash for more than 30 days"""
    db = next(get_db())
    try:
        # Calculate the cutoff date (30 days ago)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        # Find all notes in trash that were deleted more than 30 days ago
        old_notes = db.query(Note).filter(
            Note.status == 'trash',
            Note.deleted_at <= cutoff_date
        ).all()
        
        # Delete each note (this will cascade to attachments due to relationship settings)
        for note in old_notes:
            db.delete(note)
        
        db.commit()
        return f"Deleted {len(old_notes)} old notes from trash"
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

# Schedule the cleanup task to run daily
@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        timedelta(days=1),  # Run once per day
        cleanup_old_notes.s(),
        name='cleanup-old-notes'
    ) 
