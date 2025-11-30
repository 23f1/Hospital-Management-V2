@echo off
echo Starting Celery Worker for Hospital Management System...
echo.
echo Make sure you have activated your virtual environment!
echo.
echo Starting worker in 3 seconds...
timeout /t 3
echo.
celery -A celery_app worker --loglevel=info --concurrency=1
pause