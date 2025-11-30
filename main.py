from flask import Flask, render_template
from backend.models import db, User, Role, Department, Doctor, Patient
from flask_security import Security, SQLAlchemyUserDatastore, hash_password
from flask_caching import Cache
import redis
from backend.api import api # Import the Blueprint
from datetime import date

# Configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hms.sqlite3'
app.config['SECURITY_PASSWORD_SALT'] = 'salty-password'
app.config['SECURITY_TOKEN_AUTHENTICATION_HEADER'] = 'Authentication-Token'

# Use argon2 instead of bcrypt to avoid compatibility issues
app.config['SECURITY_PASSWORD_HASH'] = 'argon2'

# Flask-Security configuration
app.config['SECURITY_REGISTERABLE'] = False  # Disable default registration
app.config['SECURITY_CHANGEABLE'] = True
app.config['SECURITY_RECOVERABLE'] = True
app.config['SECURITY_TRACKABLE'] = True

# Redis & Celery Config (Disabled for local development)
# app.config['CACHE_TYPE'] = 'RedisCache'
# app.config['CACHE_REDIS_HOST'] = 'localhost'
# app.config['CACHE_REDIS_PORT'] = 6379

# Use simple cache instead of Redis
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300

# Email configuration (for production)
app.config['MAIL_SERVER'] = 'localhost'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = None
app.config['MAIL_PASSWORD'] = None

# Register API blueprint
app.register_blueprint(api, url_prefix='/api')

# Initialize extensions
db.init_app(app)
cache = Cache(app)

# Setup Flask-Security
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

# Create DB and populate initial data
with app.app_context():
    db.create_all()
    
    # Create roles if they don't exist
    admin_role = user_datastore.find_or_create_role(name='admin', description='Administrator')
    doctor_role = user_datastore.find_or_create_role(name='doctor', description='Doctor')
    patient_role = user_datastore.find_or_create_role(name='patient', description='Patient')
    
    # Create admin user if doesn't exist
    if not user_datastore.find_user(email='admin@hms.com'):
        password = 'admin123'[:72]  # Ensure password is within limit
        user_datastore.create_user(
            email='admin@hms.com', 
            password=hash_password(password), 
            roles=[admin_role],
            name='Hospital Administrator',
            fs_uniquifier='admin_unique_id',
            active=True
        )
        db.session.commit()
    
    # Create default departments if they don't exist
    departments_data = [
        ('Cardiology', 'Heart and cardiovascular diseases'),
        ('Neurology', 'Brain and nervous system disorders'),
        ('Orthopedics', 'Bone, joint, and muscle conditions'),
        ('Pediatrics', 'Medical care for infants, children, and adolescents'),
        ('General Medicine', 'General medical care and consultation'),
        ('Dermatology', 'Skin, hair, and nail disorders'),
        ('Gynecology', 'Women\'s reproductive health'),
        ('ENT', 'Ear, nose, and throat conditions'),
        ('Psychiatry', 'Mental health and behavioral disorders'),
        ('Emergency', 'Emergency medical care')
    ]
    
    for dept_name, dept_desc in departments_data:
        if not Department.query.filter_by(name=dept_name).first():
            department = Department(name=dept_name, description=dept_desc)
            db.session.add(department)
    
    db.session.commit()
    
    # Create sample patients if they don't exist
    sample_patients = [
        {
            'name': 'John Smith',
            'email': 'john.smith@email.com',
            'password': 'patient123',
            'phone': '555-0101',
            'address': '123 Main St, City, State',
            'dob': date(1985, 6, 15)
        },
        {
            'name': 'Sarah Johnson',
            'email': 'sarah.johnson@email.com',
            'password': 'patient123',
            'phone': '555-0102',
            'address': '456 Oak Ave, City, State',
            'dob': date(1990, 3, 22)
        },
        {
            'name': 'Michael Brown',
            'email': 'michael.brown@email.com',
            'password': 'patient123',
            'phone': '555-0103',
            'address': '789 Pine Rd, City, State',
            'dob': date(1978, 11, 8)
        },
        {
            'name': 'Emily Davis',
            'email': 'emily.davis@email.com',
            'password': 'patient123',
            'phone': '555-0104',
            'address': '321 Elm St, City, State',
            'dob': date(1992, 8, 14)
        },
        {
            'name': 'Robert Wilson',
            'email': 'robert.wilson@email.com',
            'password': 'patient123',
            'phone': '555-0105',
            'address': '654 Cedar Dr, City, State',
            'dob': date(1983, 12, 3)
        }
    ]
    
    patient_role = user_datastore.find_role('patient')
    
    for patient_data in sample_patients:
        if not User.query.filter_by(email=patient_data['email']).first():
            # Create user account
            new_user = user_datastore.create_user(
                email=patient_data['email'],
                password=hash_password(patient_data['password']),
                name=patient_data['name'],
                roles=[patient_role],
                fs_uniquifier=patient_data['email']
            )
            
            # Commit user first to get ID
            db.session.commit()
            
            # Create patient profile
            new_patient = Patient(
                user_id=new_user.id,
                phone=patient_data['phone'],
                address=patient_data['address'],
                dob=patient_data['dob']
            )
            
            db.session.add(new_patient)
    
    db.session.commit()
    
    print("Database initialized successfully!")
    print("Admin credentials:")
    print("Email: admin@hms.com")
    print("Password: admin123")

# Routes
@app.route('/')
def home():
    # Serve the VueJS entry point
    return render_template('index.html')

@app.route('/admin')
@app.route('/doctor') 
@app.route('/patient')
@app.route('/register')
def spa_routes():
    """Handle SPA routes - all serve the same Vue.js entry point"""
    return render_template('index.html')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('index.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return {"error": "Internal server error"}, 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)