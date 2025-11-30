from flask import Blueprint, request, jsonify, current_app
from flask_security import verify_password, auth_token_required, roles_required, current_user, hash_password
from backend.models import db, User, Doctor, Patient, Appointment, Department
from flask_caching import Cache
from datetime import datetime, timedelta, date
from sqlalchemy import and_, or_
import csv
import os
# from backend.tasks import send_appointment_reminder, export_patient_data  # Disabled for now

api = Blueprint('api', __name__)

# --- AUTHENTICATION ---
@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    if not verify_password(password, user.password):
        return jsonify({"message": "Invalid password"}), 401

    return jsonify({
        "token": user.get_auth_token(),
        "email": user.email,
        "name": user.name,
        "role": user.roles[0].name if user.roles else "patient",
        "id": user.id
    })

# --- DASHBOARD DATA (Protected) ---
@api.route('/dashboard-stats', methods=['GET'])
@auth_token_required
@roles_required('admin')
def admin_stats():
    try:
        cache = current_app.extensions.get('cache')
        if cache:
            stats = cache.get('dashboard_stats')
            if stats:
                return jsonify(stats)
    except Exception as e:
        print(f"Cache error: {e}")
    
    total_doctors = Doctor.query.count()
    total_patients = Patient.query.count()
    total_appointments = Appointment.query.count()
    upcoming_appointments = Appointment.query.filter(
        and_(Appointment.date_time >= datetime.now(), 
             Appointment.status == 'Booked')
    ).count()
    
    stats = {
        "doctors": total_doctors,
        "patients": total_patients,
        "appointments": total_appointments,
        "upcoming_appointments": upcoming_appointments
    }
    
    try:
        if cache:
            cache.set('dashboard_stats', stats, timeout=300)  # 5 minutes cache
    except Exception as e:
        print(f"Cache set error: {e}")
    
    return jsonify(stats)

# --- DOCTOR MANAGEMENT (Admin Only) ---
@api.route('/doctors', methods=['GET'])
@auth_token_required
def get_doctors():
    search = request.args.get('search', '')
    specialization = request.args.get('specialization', '')
    department_id = request.args.get('department', '')
    
    query = Doctor.query.join(User)
    
    if search:
        query = query.filter(User.name.contains(search))
    if specialization:
        query = query.filter(Doctor.specialization.contains(specialization))
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    
    doctors = query.all()
    output = []
    for d in doctors:
        output.append({
            "id": d.id,
            "name": d.user.name,
            "email": d.user.email,
            "specialization": d.specialization,
            "experience_years": d.experience_years,
            "department": d.department.name if d.department else None,
            "available_today": d.available_today
        })
    return jsonify(output)

@api.route('/doctors', methods=['POST'])
@auth_token_required
@roles_required('admin')
def add_doctor():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'email', 'password', 'specialization', 'experience_years', 'department_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"message": f"{field} is required"}), 400
    
    # Check if email already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"message": "Email already exists"}), 400
    
    # Check if department exists
    department = Department.query.get(data['department_id'])
    if not department:
        return jsonify({"message": "Department not found"}), 400
    
    try:
        user_datastore = current_app.extensions['security'].datastore
        doctor_role = user_datastore.find_role('doctor')
        
        # Create user
        new_user = user_datastore.create_user(
            email=data['email'],
            password=hash_password(data['password']),
            name=data['name'],
            roles=[doctor_role],
            fs_uniquifier=data['email']
        )
        
        # Commit the user first to get the ID
        db.session.commit()
        
        # Create doctor profile
        new_doctor = Doctor(
            user_id=new_user.id,
            department_id=data['department_id'],
            specialization=data['specialization'],
            experience_years=data['experience_years'],
            available_today=True
        )
        
        db.session.add(new_doctor)
        db.session.commit()
        
        # Clear cache
        try:
            cache = current_app.extensions.get('cache')
            if cache:
                cache.delete('dashboard_stats')
        except Exception as e:
            print(f"Cache clear error: {e}")
        
        return jsonify({"message": "Doctor added successfully"}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error creating doctor: {str(e)}"}), 500

@api.route('/doctors/<int:doctor_id>', methods=['PUT'])
@auth_token_required
@roles_required('admin')
def update_doctor(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    data = request.get_json()
    
    try:
        # Update user info
        if 'name' in data:
            doctor.user.name = data['name']
        if 'email' in data:
            if User.query.filter(and_(User.email == data['email'], User.id != doctor.user.id)).first():
                return jsonify({"message": "Email already exists"}), 400
            doctor.user.email = data['email']
        
        # Update doctor info
        if 'specialization' in data:
            doctor.specialization = data['specialization']
        if 'experience_years' in data:
            doctor.experience_years = data['experience_years']
        if 'department_id' in data:
            doctor.department_id = data['department_id']
        if 'available_today' in data:
            doctor.available_today = data['available_today']
        
        db.session.commit()
        return jsonify({"message": "Doctor updated successfully"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error updating doctor: {str(e)}"}), 500

@api.route('/doctors/<int:doctor_id>', methods=['DELETE'])
@auth_token_required
@roles_required('admin')
def delete_doctor(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    
    try:
        # Check for existing appointments
        upcoming_appointments = Appointment.query.filter(
            and_(Appointment.doctor_id == doctor_id,
                 Appointment.date_time >= datetime.now(),
                 Appointment.status == 'Booked')
        ).count()
        
        if upcoming_appointments > 0:
            return jsonify({"message": f"Cannot delete doctor with {upcoming_appointments} upcoming appointments"}), 400
        
        # Mark user as inactive instead of deleting
        doctor.user.active = False
        db.session.commit()
        
        return jsonify({"message": "Doctor deactivated successfully"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error deleting doctor: {str(e)}"}), 500

# --- PATIENT REGISTRATION ---
@api.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    # Validation
    if not email or not password or not name:
        return jsonify({"message": "All fields are required"}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400
        
    try:
        user_datastore = current_app.extensions['security'].datastore
        patient_role = user_datastore.find_role('patient')
        
        new_user = user_datastore.create_user(
            email=email,
            password=hash_password(password),
            roles=[patient_role],
            name=name,
            fs_uniquifier=email
        )
        
        # Commit the user first to get the ID
        db.session.commit()
        
        # Create Patient Profile
        new_patient = Patient(
            user_id=new_user.id,
            phone=data.get('phone', ''),
            address=data.get('address', ''),
            dob=None  # Can be set later
        )
        db.session.add(new_patient)
        db.session.commit()
        
        return jsonify({"message": "Registration successful! Please login."}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Registration failed: {str(e)}"}), 500

# --- PATIENT MANAGEMENT ---
@api.route('/patients', methods=['GET'])
@auth_token_required
@roles_required('admin')
def get_patients():
    search = request.args.get('search', '')
    
    query = Patient.query.join(User)
    if search:
        query = query.filter(User.name.contains(search))
    
    patients = query.all()
    output = []
    for p in patients:
        output.append({
            "id": p.id,
            "name": p.user.name,
            "email": p.user.email,
            "phone": p.phone,
            "address": p.address,
            "dob": p.dob.isoformat() if p.dob else None,
            "total_appointments": len(p.appointments)
        })
    return jsonify(output)

@api.route('/patients/<int:patient_id>', methods=['PUT'])
@auth_token_required
def update_patient(patient_id):
    patient = Patient.query.get_or_404(patient_id)
    
    # Check authorization
    if not (current_user.has_role('admin') or 
            (current_user.has_role('patient') and patient.user_id == current_user.id)):
        return jsonify({"message": "Unauthorized"}), 403
    
    data = request.get_json()
    
    try:
        if 'name' in data:
            patient.user.name = data['name']
        if 'phone' in data:
            patient.phone = data['phone']
        if 'address' in data:
            patient.address = data['address']
        if 'dob' in data and data['dob']:
            patient.dob = datetime.strptime(data['dob'], '%Y-%m-%d').date()
        
        db.session.commit()
        return jsonify({"message": "Profile updated successfully"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error updating profile: {str(e)}"}), 500

@api.route('/patients/<int:patient_id>', methods=['DELETE'])
@auth_token_required
@roles_required('admin')
def delete_patient(patient_id):
    patient = Patient.query.get_or_404(patient_id)
    
    try:
        # Delete associated appointments first
        Appointment.query.filter_by(patient_id=patient.id).delete()
        
        # Get user before deleting patient
        user = patient.user
        
        # Delete patient record
        db.session.delete(patient)
        
        # Delete user account
        db.session.delete(user)
        
        db.session.commit()
        
        # Clear cache
        try:
            cache = current_app.extensions.get('cache')
            if cache:
                cache.delete('dashboard_stats')
        except Exception as e:
            print(f"Cache clear error: {e}")
        
        return jsonify({"message": "Patient deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error deleting patient: {str(e)}"}), 500

# --- DEPARTMENT MANAGEMENT ---
@api.route('/departments', methods=['GET'])
def get_departments():
    try:
        cache = current_app.extensions.get('cache')
        if cache:
            departments = cache.get('departments_list')
            if departments:
                return jsonify(departments)
    except Exception as e:
        print(f"Cache error: {e}")
    
    departments = Department.query.all()
    output = []
    for d in departments:
        output.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "doctor_count": len(d.doctors)
        })
    
    try:
        if cache:
            cache.set('departments_list', output, timeout=3600)  # 1 hour cache
    except Exception as e:
        print(f"Cache set error: {e}")
    
    return jsonify(output)

@api.route('/departments', methods=['POST'])
@auth_token_required
@roles_required('admin')
def add_department():
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({"message": "Department name is required"}), 400
    
    if Department.query.filter_by(name=data['name']).first():
        return jsonify({"message": "Department already exists"}), 400
    
    try:
        new_department = Department(
            name=data['name'],
            description=data.get('description', '')
        )
        db.session.add(new_department)
        db.session.commit()
        
        # Clear cache
        try:
            cache = current_app.extensions.get('cache')
            if cache:
                cache.delete('departments_list')
        except Exception as e:
            print(f"Cache clear error: {e}")
        
        return jsonify({"message": "Department added successfully"}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error adding department: {str(e)}"}), 500

@api.route('/departments/<int:department_id>', methods=['DELETE'])
@auth_token_required
@roles_required('admin')
def delete_department(department_id):
    department = Department.query.get_or_404(department_id)
    
    # Check if department has doctors
    if department.doctors:
        return jsonify({"message": "Cannot delete department with assigned doctors"}), 400
    
    try:
        db.session.delete(department)
        db.session.commit()
        
        # Clear cache
        try:
            cache = current_app.extensions.get('cache')
            if cache:
                cache.delete('departments_list')
        except Exception as e:
            print(f"Cache clear error: {e}")
        
        return jsonify({"message": "Department deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error deleting department: {str(e)}"}), 500

# --- APPOINTMENT MANAGEMENT ---
@api.route('/appointments', methods=['GET'])
@auth_token_required
def get_appointments():
    status = request.args.get('status', '')
    date_filter = request.args.get('date', '')
    
    if current_user.has_role('admin'):
        query = Appointment.query
    elif current_user.has_role('doctor'):
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor:
            return jsonify({"message": "Doctor profile not found"}), 404
        query = Appointment.query.filter_by(doctor_id=doctor.id)
    elif current_user.has_role('patient'):
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        if not patient:
            return jsonify({"message": "Patient profile not found"}), 404
        query = Appointment.query.filter_by(patient_id=patient.id)
    else:
        return jsonify({"message": "Unauthorized"}), 403
    
    if status:
        query = query.filter_by(status=status)
    
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Appointment.date_time) == filter_date)
        except ValueError:
            return jsonify({"message": "Invalid date format"}), 400
    
    appointments = query.order_by(Appointment.date_time.desc()).all()
    output = []
    
    for a in appointments:
        output.append({
            "id": a.id,
            "doctor_name": a.doctor.user.name,
            "doctor_specialization": a.doctor.specialization,
            "department_name": a.doctor.department.name if a.doctor.department else "N/A",
            "patient_name": a.patient.user.name,
            "patient_phone": a.patient.phone,
            "date_time": a.date_time.isoformat(),
            "status": a.status,
            "diagnosis": a.diagnosis,
            "prescription": a.prescription,
            "notes": a.notes
        })
    
    return jsonify(output)

@api.route('/appointments', methods=['POST'])
@auth_token_required
@roles_required('patient')
def book_appointment():
    data = request.get_json()
    patient = Patient.query.filter_by(user_id=current_user.id).first()
    
    if not patient:
        return jsonify({"message": "Patient profile not found"}), 404
    
    # Validate required fields
    if not all(k in data for k in ('doctor_id', 'date_time')):
        return jsonify({"message": "Doctor ID and date_time are required"}), 400
    
    try:
        appointment_time = datetime.fromisoformat(data['date_time'])
        
        # Check if appointment is in the future
        if appointment_time <= datetime.now():
            return jsonify({"message": "Appointment must be in the future"}), 400
        
        # Check if doctor exists and is available
        doctor = Doctor.query.get(data['doctor_id'])
        if not doctor:
            return jsonify({"message": "Doctor not found"}), 404
        
        # Check for conflicting appointments
        existing = Appointment.query.filter(
            and_(Appointment.doctor_id == data['doctor_id'],
                 Appointment.date_time == appointment_time,
                 Appointment.status == 'Booked')
        ).first()
        
        if existing:
            return jsonify({"message": "This time slot is already booked"}), 409
        
        # Create appointment
        new_appointment = Appointment(
            doctor_id=data['doctor_id'],
            patient_id=patient.id,
            date_time=appointment_time,
            status='Booked'
        )
        
        db.session.add(new_appointment)
        db.session.commit()
        
        # Clear relevant caches
        try:
            cache = current_app.extensions.get('cache')
            if cache:
                cache.delete('dashboard_stats')
        except Exception as e:
            print(f"Cache clear error: {e}")
        
        return jsonify({"message": "Appointment booked successfully"}), 201
        
    except ValueError:
        return jsonify({"message": "Invalid date_time format"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error booking appointment: {str(e)}"}), 500

@api.route('/appointments/<int:appointment_id>', methods=['PUT'])
@auth_token_required
def update_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.get_json()
    
    # Authorization check
    if current_user.has_role('patient'):
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        if not patient or appointment.patient_id != patient.id:
            return jsonify({"message": "Unauthorized"}), 403
    elif current_user.has_role('doctor'):
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor or appointment.doctor_id != doctor.id:
            return jsonify({"message": "Unauthorized"}), 403
    elif not current_user.has_role('admin'):
        return jsonify({"message": "Unauthorized"}), 403
    
    try:
        # Update status
        if 'status' in data:
            if data['status'] in ['Booked', 'Completed', 'Cancelled']:
                appointment.status = data['status']
            else:
                return jsonify({"message": "Invalid status"}), 400
        
        # Update treatment details (doctor only)
        if current_user.has_role('doctor') or current_user.has_role('admin'):
            if 'diagnosis' in data:
                appointment.diagnosis = data['diagnosis']
            if 'prescription' in data:
                appointment.prescription = data['prescription']
            if 'notes' in data:
                appointment.notes = data['notes']
        
        # Update date_time (patient can reschedule if not completed)
        if 'date_time' in data and appointment.status == 'Booked':
            new_time = datetime.fromisoformat(data['date_time'])
            if new_time <= datetime.now():
                return jsonify({"message": "Appointment must be in the future"}), 400
            
            # Check for conflicts
            existing = Appointment.query.filter(
                and_(Appointment.doctor_id == appointment.doctor_id,
                     Appointment.date_time == new_time,
                     Appointment.status == 'Booked',
                     Appointment.id != appointment_id)
            ).first()
            
            if existing:
                return jsonify({"message": "This time slot is already booked"}), 409
            
            appointment.date_time = new_time
        
        db.session.commit()
        return jsonify({"message": "Appointment updated successfully"})
        
    except ValueError:
        return jsonify({"message": "Invalid date_time format"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error updating appointment: {str(e)}"}), 500

@api.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@auth_token_required
def cancel_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    
    # Authorization check
    if current_user.has_role('patient'):
        patient = Patient.query.filter_by(user_id=current_user.id).first()
        if not patient or appointment.patient_id != patient.id:
            return jsonify({"message": "Unauthorized"}), 403
    elif not current_user.has_role('admin'):
        return jsonify({"message": "Unauthorized"}), 403
    
    try:
        appointment.status = 'Cancelled'
        db.session.commit()
        return jsonify({"message": "Appointment cancelled successfully"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error cancelling appointment: {str(e)}"}), 500

# --- DOCTOR DASHBOARD ---
@api.route('/doctor/dashboard', methods=['GET'])
@auth_token_required
@roles_required('doctor')
def doctor_dashboard():
    doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    if not doctor:
        return jsonify({"message": "Doctor profile not found"}), 404
    
    # Get today's appointments
    today = date.today()
    today_appointments = Appointment.query.filter(
        and_(Appointment.doctor_id == doctor.id,
             db.func.date(Appointment.date_time) == today,
             Appointment.status == 'Booked')
    ).count()
    
    # Get week's appointments
    week_start = today
    week_end = today + timedelta(days=7)
    week_appointments = Appointment.query.filter(
        and_(Appointment.doctor_id == doctor.id,
             Appointment.date_time >= week_start,
             Appointment.date_time <= week_end,
             Appointment.status == 'Booked')
    ).count()
    
    # Get total patients
    total_patients = db.session.query(Appointment.patient_id).filter(
        Appointment.doctor_id == doctor.id
    ).distinct().count()
    
    return jsonify({
        "today_appointments": today_appointments,
        "week_appointments": week_appointments,
        "total_patients": total_patients,
        "doctor_name": doctor.user.name,
        "specialization": doctor.specialization
    })

# --- PATIENT DASHBOARD ---
@api.route('/patient/dashboard', methods=['GET'])
@auth_token_required
@roles_required('patient')
def patient_dashboard():
    patient = Patient.query.filter_by(user_id=current_user.id).first()
    if not patient:
        return jsonify({"message": "Patient profile not found"}), 404
    
    # Get upcoming appointments
    upcoming = Appointment.query.filter(
        and_(Appointment.patient_id == patient.id,
             Appointment.date_time >= datetime.now(),
             Appointment.status == 'Booked')
    ).count()
    
    # Get completed appointments
    completed = Appointment.query.filter(
        and_(Appointment.patient_id == patient.id,
             Appointment.status == 'Completed')
    ).count()
    
    # Get available departments
    departments = Department.query.all()
    dept_list = [{"id": d.id, "name": d.name, "description": d.description} for d in departments]
    
    return jsonify({
        "upcoming_appointments": upcoming,
        "completed_appointments": completed,
        "patient_name": patient.user.name,
        "departments": dept_list
    })

# --- DOCTOR AVAILABILITY ---
@api.route('/doctors/<int:doctor_id>/availability', methods=['GET'])
def get_doctor_availability(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    
    # Get next 7 days
    start_date = date.today()
    availability = []
    
    for i in range(7):
        check_date = start_date + timedelta(days=i)
        
        # Get existing appointments for this day
        existing_appointments = Appointment.query.filter(
            and_(Appointment.doctor_id == doctor_id,
                 db.func.date(Appointment.date_time) == check_date,
                 Appointment.status == 'Booked')
        ).all()
        
        existing_times = [apt.date_time.time() for apt in existing_appointments]
        
        # Generate available time slots (9 AM to 5 PM, 1-hour slots)
        available_slots = []
        for hour in range(9, 17):
            time_slot = datetime.combine(check_date, datetime.min.time().replace(hour=hour))
            if time_slot > datetime.now() and time_slot.time() not in existing_times:
                available_slots.append(time_slot.isoformat())
        
        availability.append({
            "date": check_date.isoformat(),
            "available_slots": available_slots
        })
    
    return jsonify({
        "doctor_name": doctor.user.name,
        "specialization": doctor.specialization,
        "availability": availability
    })

# --- CSV EXPORT (Async Job) ---
@api.route('/patient/export-csv', methods=['POST'])
@auth_token_required
@roles_required('patient')
def trigger_csv_export():
    patient = Patient.query.filter_by(user_id=current_user.id).first()
    if not patient:
        return jsonify({"message": "Patient profile not found"}), 404
    
    try:
        # For now, generate CSV synchronously (without Celery)
        # In production with Redis, you would use: export_patient_data.delay(patient.id, current_user.email)
        
        appointments = Appointment.query.filter_by(
            patient_id=patient.id,
            status='Completed'
        ).order_by(Appointment.date_time.desc()).all()
        
        csv_data = []
        csv_data.append(['Patient Name', 'Patient Email', 'Doctor Name', 'Doctor Specialization', 
                        'Appointment Date', 'Diagnosis', 'Prescription', 'Notes'])
        
        for apt in appointments:
            csv_data.append([
                patient.user.name,
                patient.user.email,
                apt.doctor.user.name,
                apt.doctor.specialization,
                apt.date_time.strftime('%Y-%m-%d %H:%M'),
                apt.diagnosis or 'N/A',
                apt.prescription or 'N/A',
                apt.notes or 'N/A'
            ])
        
        return jsonify({
            "message": f"Export completed. Found {len(appointments)} completed appointments.",
            "data": csv_data
        }), 200
        
    except Exception as e:
        return jsonify({"message": f"Error exporting data: {str(e)}"}), 500

# --- SEARCH FUNCTIONALITY ---
@api.route('/search', methods=['GET'])
@auth_token_required
def search():
    query = request.args.get('q', '')
    search_type = request.args.get('type', 'all')  # doctors, patients, all
    
    if not query:
        return jsonify({"message": "Search query is required"}), 400
    
    results = {"doctors": [], "patients": []}
    
    if search_type in ['doctors', 'all']:
        doctors = Doctor.query.join(User).filter(
            or_(User.name.contains(query),
                Doctor.specialization.contains(query))
        ).all()
        
        results["doctors"] = [{
            "id": d.id,
            "name": d.user.name,
            "specialization": d.specialization,
            "available": d.available_today
        } for d in doctors]
    
    if search_type in ['patients', 'all'] and current_user.has_role('admin'):
        patients = Patient.query.join(User).filter(
            User.name.contains(query)
        ).all()
        
        results["patients"] = [{
            "id": p.id,
            "name": p.user.name,
            "email": p.user.email,
            "phone": p.phone
        } for p in patients]
    
    return jsonify(results)

# --- BACKGROUND TASK ENDPOINTS ---
@api.route('/tasks/daily-reminders', methods=['POST'])
@auth_token_required
@roles_required('admin')
def trigger_daily_reminders():
    """Manually trigger daily appointment reminders"""
    try:
        from backend.tasks import daily_appointment_reminders
        task = daily_appointment_reminders.delay()
        return jsonify({
            "message": "Daily reminders task queued successfully",
            "task_id": task.id
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error triggering daily reminders: {str(e)}"}), 500

@api.route('/tasks/monthly-reports', methods=['POST'])
@auth_token_required  
@roles_required('admin')
def trigger_monthly_reports():
    """Manually trigger monthly doctor reports"""
    try:
        from backend.tasks import monthly_reports_for_all_doctors
        task = monthly_reports_for_all_doctors.delay()
        return jsonify({
            "message": "Monthly reports task queued successfully",
            "task_id": task.id
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error triggering monthly reports: {str(e)}"}), 500

@api.route('/tasks/status', methods=['GET'])
@auth_token_required
@roles_required('admin')
def check_task_status():
    """Check Celery worker and Redis status"""
    try:
        import redis
        # Test Redis connection
        r = redis.Redis(host='127.0.0.1', port=6379)
        redis_status = r.ping()
        
        # You can add more sophisticated Celery worker checking here
        return jsonify({
            "redis_connected": redis_status,
            "message": "Task queue is operational" if redis_status else "Redis connection failed"
        }), 200
    except Exception as e:
        return jsonify({
            "redis_connected": False,
            "message": f"Task queue error: {str(e)}"
        }), 500