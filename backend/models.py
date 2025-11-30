from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin
from datetime import datetime

db = SQLAlchemy()

# Association table for User <-> Role (Many-to-Many)
roles_users = db.Table('roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean(), default=True)
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False)
    roles = db.relationship('Role', secondary=roles_users, backref=db.backref('users', lazy='dynamic'))
    
    # User profile fields
    name = db.Column(db.String(100), nullable=False)
    
    # Relationships
    doctor_profile = db.relationship('Doctor', backref='user', uselist=False)
    patient_profile = db.relationship('Patient', backref='user', uselist=False)

class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255))
    
    # Relationships
    doctors = db.relationship('Doctor', backref='department', lazy=True)
    
    def __repr__(self):
        return f'<Department {self.name}>'

class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'), nullable=False)
    specialization = db.Column(db.String(100), nullable=False)
    experience_years = db.Column(db.Integer, default=0)
    available_today = db.Column(db.Boolean, default=True)
    
    # Relationships
    appointments = db.relationship('Appointment', backref='doctor', lazy=True)
    
    def __repr__(self):
        return f'<Doctor {self.user.name if self.user else "Unknown"}>'

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    dob = db.Column(db.Date)
    
    # Relationships
    appointments = db.relationship('Appointment', backref='patient', lazy=True)
    
    def __repr__(self):
        return f'<Patient {self.user.name if self.user else "Unknown"}>'

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    date_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='Booked')  # Booked, Completed, Cancelled, No-Show
    
    # Treatment details (filled after completion)
    diagnosis = db.Column(db.Text)
    prescription = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    def __repr__(self):
        return f'<Appointment {self.id}: {self.patient.user.name if self.patient else "Unknown"} -> {self.doctor.user.name if self.doctor else "Unknown"}>'

class DoctorAvailability(db.Model):
    """Table to manage doctor's weekly availability schedule"""
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    is_available = db.Column(db.Boolean, default=True)
    
    # Constraints to ensure logical time slots
    __table_args__ = (
        db.UniqueConstraint('doctor_id', 'day_of_week', 'start_time', name='unique_doctor_schedule'),
    )
    
    def __repr__(self):
        return f'<DoctorAvailability {self.doctor.user.name if self.doctor else "Unknown"}: Day {self.day_of_week}>'

class AppointmentHistory(db.Model):
    """Audit trail for appointment changes"""
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    change_type = db.Column(db.String(50), nullable=False)  # Created, Updated, Cancelled, Completed
    old_values = db.Column(db.Text)  # JSON string of old values
    new_values = db.Column(db.Text)  # JSON string of new values
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    appointment = db.relationship('Appointment', backref='history')
    changed_by = db.relationship('User', backref='appointment_changes')

class SystemSettings(db.Model):
    """System-wide settings and configuration"""
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)
    description = db.Column(db.String(255))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SystemSettings {self.key}: {self.value}>'