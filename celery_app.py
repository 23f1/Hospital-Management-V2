# celery_app.py
from celery import Celery
from celery.schedules import crontab

celery = Celery('hm2_app')

celery.conf.update(
    broker_url='redis://127.0.0.1:6379/0',
    result_backend='redis://127.0.0.1:6379/0',

    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',

    timezone='UTC',
    enable_utc=True,

    include=['backend.tasks'],

    task_routes={
        'backend.tasks.send_appointment_reminder': {'queue': 'notifications'},
        'backend.tasks.daily_appointment_reminders': {'queue': 'notifications'},
        'backend.tasks.generate_monthly_doctor_report': {'queue': 'reports'},
        'backend.tasks.export_patient_data': {'queue': 'exports'},
    },

    beat_schedule={
        'daily-appointment-reminders': {
            'task': 'backend.tasks.daily_appointment_reminders',
            'schedule': crontab(hour=8, minute=0),  # 8:00 AM daily
        },
        'monthly-doctor-reports': {
            'task': 'backend.tasks.monthly_reports_for_all_doctors',
            'schedule': crontab(hour=9, minute=0, day_of_month=1),  # 9:00 AM on 1st of month
        },
    }
)

# If you want the variable named `app` as well (so "from celery_app import app"):
app = celery

if __name__ == '__main__':
    celery.start()
