#!/usr/bin/env python3
"""
Simple Celery test script - no interactive prompts
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.tasks import send_appointment_reminder

def test_celery_task():
    print("🚀 Testing Celery Task Execution")
    print("=" * 50)
    
    try:
        print("📤 Sending task to Celery queue...")
        
        # Send a task
        result = send_appointment_reminder.delay(
            patient_email="test@example.com",
            patient_name="John Test",
            doctor_name="Dr. Smith", 
            appointment_time="2025-12-01 10:00 AM",
            specialization="Cardiology"
        )
        
        print(f"✅ Task queued successfully!")
        print(f"📋 Task ID: {result.id}")
        print(f"📊 Task State: {result.state}")
        
        # Try to get result (with timeout)
        print("⏳ Waiting for task completion...")
        try:
            task_result = result.get(timeout=15)
            print(f"🎉 Task completed successfully!")
            print(f"📝 Result: {task_result}")
            return True
        except Exception as e:
            print(f"⚠️  Could not get task result: {e}")
            print("💡 This might be normal if worker is not running")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Celery: {e}")
        return False

if __name__ == "__main__":
    success = test_celery_task()
    if success:
        print("\n✅ Celery test PASSED - Tasks are working!")
    else:
        print("\n⚠️  Celery test INCOMPLETE - Make sure worker is running")
    print("\nTo start worker: celery -A celery_app worker --loglevel=info")