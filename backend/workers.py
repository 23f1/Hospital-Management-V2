# Celery instance setup
# This file configures and initializes the Celery instance

from celery import Celery
from celery.schedules import crontab
import os

def make_celery(app=None):
    """Create Celery instance with optional Flask app integration"""
    
    celery = Celery('hm2_app')
    
    # Configure Celery with Redis broker
    celery.conf.update(
        broker_url='redis://localhost:6379/0',
        broker_transport_options={},
        result_backend='redis://localhost:6379/0',
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        result_expires=3600,
        include=['backend.tasks'],  # Auto-discover tasks
        # Scheduled tasks configuration (for beat scheduler)
        beat_schedule={
            # Daily appointment reminders at 8 AM
            'daily-appointment-reminders': {
                'task': 'backend.tasks.daily_appointment_reminders',
                'schedule': crontab(hour=8, minute=0),
            },
            # Monthly reports on 1st of every month at 9 AM
            'monthly-doctor-reports': {
                'task': 'backend.tasks.monthly_reports_for_all_doctors',
                'schedule': crontab(hour=9, minute=0, day_of_month=1),
            },
        },
    )
    
    # Flask integration (if Flask app is provided)
    if app:
        class ContextTask(celery.Task):
            """Make celery tasks work with Flask app context."""
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)
        
        celery.Task = ContextTask
    
    return celery

# Initialize celery instance (without Flask app for CLI usage)
celery = make_celery()