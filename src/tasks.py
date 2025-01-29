from celery import Celery
import os

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
