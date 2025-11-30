# Hospital Management System - Background Tasks
# Contains Celery tasks for automated processes

from celery_app import app as celery
from datetime import datetime, date, timedelta
import csv
import os
import tempfile
import logging

logger = logging.getLogger(__name__)

@celery.task
def send_appointment_reminder(patient_email, patient_name, doctor_name, appointment_time, specialization):
    """Send appointment reminder to patient"""
    try:
        subject = f"Appointment Reminder - {appointment_time}"
        
        message = f"""
        Dear {patient_name},
        
        You have an upcoming appointment:
        
        Doctor: Dr. {doctor_name}
        Specialty: {specialization}
        Date & Time: {appointment_time}
        
        Please arrive 15 minutes early.
        
        Best regards,
        HMS Team
        """
        
        # In production, this would send actual emails
        print(f"EMAIL SENT TO: {patient_email}")
        print(f"Subject: {subject}")
        print(f"Message: {message}")
        
        return f"Reminder sent to {patient_email}"
        
    except Exception as e:
        logger.error(f"Error sending reminder: {str(e)}")
        return f"Failed to send reminder: {str(e)}"

@celery.task
def daily_appointment_reminders():
    """Send reminders for all appointments scheduled for tomorrow"""
    try:
        tomorrow = date.today() + timedelta(days=1)
        
        print(f"Processing reminders for {tomorrow}")
        
        # Sample appointments for demo
        sample_appointments = [
            {
                "patient_email": "john.doe@example.com",
                "patient_name": "John Doe", 
                "doctor_name": "Dr. Smith",
                "appointment_time": "2025-12-01 10:00 AM",
                "specialization": "Cardiology"
            },
            {
                "patient_email": "jane.smith@example.com",
                "patient_name": "Jane Smith",
                "doctor_name": "Dr. Johnson", 
                "appointment_time": "2025-12-01 2:00 PM",
                "specialization": "Dermatology"
            }
        ]
        
        reminder_count = 0
        for apt in sample_appointments:
            send_appointment_reminder.delay(
                patient_email=apt["patient_email"],
                patient_name=apt["patient_name"],
                doctor_name=apt["doctor_name"],
                appointment_time=apt["appointment_time"],
                specialization=apt["specialization"]
            )
            reminder_count += 1
        
        return f"Queued {reminder_count} reminder emails for {tomorrow}"
        
    except Exception as e:
        return f"Error in daily reminders: {str(e)}"

@celery.task
def export_patient_data(patient_id, patient_email):
    """Export patient treatment history to CSV format"""
    try:
        from backend.models import Patient, Appointment
        
        patient = Patient.query.get(patient_id)
        if not patient:
            return "Patient not found"
        
        completed_appointments = Appointment.query.filter_by(
            patient_id=patient_id,
            status='Completed'
        ).order_by(Appointment.date_time.desc()).all()
        
        # Create temporary CSV file
        csv_filename = f"treatment_history_{patient.user.name}_{date.today()}.csv"
        csv_path = os.path.join(tempfile.gettempdir(), csv_filename)
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'Patient Name', 'Patient Email', 'Doctor Name', 'Doctor Specialty',
                'Date', 'Diagnosis', 'Prescription', 'Notes'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for apt in completed_appointments:
                writer.writerow({
                    'Patient Name': patient.user.name,
                    'Patient Email': patient.user.email,
                    'Doctor Name': apt.doctor.user.name,
                    'Doctor Specialty': apt.doctor.specialization,
                    'Date': apt.date_time.strftime('%Y-%m-%d %H:%M'),
                    'Diagnosis': apt.diagnosis or 'N/A',
                    'Prescription': apt.prescription or 'N/A',
                    'Notes': apt.notes or 'N/A'
                })
        
        # Email notification (simulated)
        email_subject = "Treatment History Export Ready"
        email_body = f"""
        Dear {patient.user.name},
        
        Your treatment history export is complete.
        Contains {len(completed_appointments)} appointment records.
        
        HMS Team
        """
        
        print(f"CSV EXPORT COMPLETE: {csv_path}")
        print(f"Email notification sent to: {patient_email}")
        print(f"Records exported: {len(completed_appointments)}")
        
        # Cleanup
        if os.path.exists(csv_path):
            os.remove(csv_path)
        
        return f"Export completed - {len(completed_appointments)} records sent to {patient_email}"
        
    except Exception as e:
        return f"Export failed: {str(e)}"

@celery.task
def generate_monthly_doctor_report(doctor_id):
    """Generate monthly activity report for a specific doctor"""
    try:
        from backend.models import Doctor, Appointment
        
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return "Doctor not found"
        
        # Calculate last month period
        today = date.today()
        first_day_last_month = today.replace(day=1) - timedelta(days=1)
        first_day_last_month = first_day_last_month.replace(day=1)
        last_day_last_month = today.replace(day=1) - timedelta(days=1)
        
        monthly_appointments = Appointment.query.filter(
            Appointment.doctor_id == doctor_id,
            Appointment.date_time >= first_day_last_month,
            Appointment.date_time <= last_day_last_month,
            Appointment.status == 'Completed'
        ).all()
        
        # Create report content
        report_data = {
            'doctor_name': doctor.user.name,
            'specialty': doctor.specialization,
            'period': first_day_last_month.strftime('%B %Y'),
            'total_appointments': len(monthly_appointments),
            'unique_patients': len(set(apt.patient_id for apt in monthly_appointments)),
            'department': doctor.department.name if doctor.department else 'N/A'
        }
        
        # Generate simple report
        report_text = f"""
Monthly Report - Dr. {report_data['doctor_name']}
Specialty: {report_data['specialty']}
Period: {report_data['period']}

Summary:
- Total Appointments: {report_data['total_appointments']}
- Unique Patients: {report_data['unique_patients']}
- Department: {report_data['department']}
        """
        
        # Save report (demo)
        report_filename = f"report_{doctor.user.name}_{first_day_last_month.strftime('%Y_%m')}.txt"
        report_path = os.path.join(tempfile.gettempdir(), report_filename)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_text)
        
        print(f"REPORT GENERATED: {report_path}")
        print(f"Email notification sent to: {doctor.user.email}")
        print(f"Appointments processed: {report_data['total_appointments']}")
        
        # Cleanup
        if os.path.exists(report_path):
            os.remove(report_path)
        
        return f"Report completed for Dr. {doctor.user.name} - {report_data['total_appointments']} appointments"
        
    except Exception as e:
        return f"Report generation error: {str(e)}"

@celery.task
def monthly_reports_for_all_doctors():
    """Generate monthly reports for all active doctors"""
    try:
        from backend.models import Doctor, User
        
        active_doctors = Doctor.query.join(User).filter(User.active == True).all()
        
        report_count = 0
        for doctor in active_doctors:
            # Queue individual report generation for each doctor
            generate_monthly_doctor_report.delay(doctor.id)
            report_count += 1
        
        print(f"Monthly reports queued for {report_count} doctors")
        return f"Monthly reports started for {report_count} active doctors"
        
    except Exception as e:
        logger.error(f"Monthly reports job failed: {str(e)}")
        return f"Monthly reports job error: {str(e)}"

@celery.task
def send_email(to_email, subject, message):
    """Generic email sending task"""
    try:
        # Email sending logic would go here
        # For now, just simulate the email send
        
        print(f"EMAIL SENT")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Message: {message}")
        
        return f"Email sent successfully to {to_email}"
        
    except Exception as e:
        logger.error(f"Email send failed: {str(e)}")
        return f"Email send error: {str(e)}"
def send_email(recipient, subject, body, attachment_path=None):
    """Generic email sending task"""
    try:
        # This is a simplified version - in production you'd use proper SMTP config
        print(f"EMAIL TO: {recipient}")
        print(f"SUBJECT: {subject}")
        print(f"BODY: {body}")
        if attachment_path:
            print(f"ATTACHMENT: {attachment_path}")
        
        return f"Email sent to {recipient}"
        
    except Exception as e:
        return f"Failed to send email: {str(e)}"