# Hospital Management System (HMS)

A comprehensive web application for managing hospital operations with role-based access control for Admins, Doctors, and Patients.

## Features

### Admin Features
- Dashboard with statistics (doctors, patients, appointments)
- Add, update, and delete doctor profiles
- Manage patient information
- View and manage all appointments
- Search functionality for doctors and patients
- Department management
- Background task management (trigger daily reminders, monthly reports)

### Doctor Features
- Personal dashboard with appointment statistics
- View assigned appointments
- Mark appointments as completed
- Update patient treatment history (diagnosis, prescriptions, notes)
- Manage availability schedule

### Patient Features
- Patient registration and profile management
- Search and view doctors by specialization
- Book, reschedule, and cancel appointments
- View appointment history and treatment details
- Export treatment history to CSV

### Background Jobs
- **Daily Reminders**: Automatic appointment reminders sent to patients
- **Monthly Reports**: Activity reports generated for doctors
- **CSV Export**: Asynchronous export of patient treatment data

## Technology Stack

- **Backend**: Flask (Python)
- **Frontend**: Vue.js 3 (CDN)
- **Database**: SQLite
- **Authentication**: Flask-Security-Too
- **Caching**: Redis
- **Background Tasks**: Celery + Redis
- **Styling**: Bootstrap 5

## Setup Instructions

### Prerequisites
- Python 3.11+
- Redis server
- Git

### Installation

1. **Clone the repository** (if applicable):
   ```bash
   git clone <your-repo-url>
   cd HM2
   ```

2. **Create and activate virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Redis server** (required for caching and background tasks):

   **Using Memurai (Windows Redis):**
   ```bash
   # Memurai should be running as a Windows service after installation
   # If not running, start it manually or check Windows Services
   
   # Test Redis connection
   python -c "import redis; r = redis.Redis(host='127.0.0.1', port=6379); print('Redis connected:', r.ping())"
   ```
   
   **Redis Configuration:**
   The application is configured to connect to Redis at `127.0.0.1:6379`. This matches Memurai's default configuration.
   No additional configuration needed if Memurai is running as a service.
5. **Initialize the database and start the Flask application**:
   ```bash
   python main.py
   ```

6. **Start Celery worker** (in a new terminal):
   ```bash
   # Activate virtual environment first
   python -c "import redis; r = redis.Redis(host='127.0.0.1', port=6379); print('Redis connected:', r.ping())"
   ```

7. **Start Celery beat scheduler** (in another terminal, for scheduled tasks):
   ```bash
   # Activate virtual environment first  
   celery -A celery_app beat --loglevel=info
   ```

### Access the Application

1. Open your web browser
2. Navigate to: `http://localhost:5000` or `http://127.0.0.1:5000`
3. Use the following credentials:

**Admin Login:**
- Email: `admin@hms.com`
- Password: `admin123`

**Patient Registration:**
- New patients can register through the registration form

## Project Structure

```
HM2/
├── backend/
│   ├── models.py          # Database models (User, Doctor, Patient, Appointment, etc.)
│   ├── api.py             # REST API endpoints
│   └── tasks.py           # Celery background tasks
├── static/
│   ├── js/
│   │   ├── app.js         # Vue.js components
│   │   └── router.js      # Vue Router configuration
│   └── css/
│       └── style.css      # Custom styles
├── templates/
│   └── index.html         # Single page application entry point
├── main.py                # Flask application entry point
├── celery_app.py          # Celery application entry point
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - Patient registration

### Admin Endpoints
- `GET /api/dashboard-stats` - Dashboard statistics
- `GET /api/doctors` - List all doctors
- `POST /api/doctors` - Add new doctor
- `PUT /api/doctors/<id>` - Update doctor
- `DELETE /api/doctors/<id>` - Deactivate doctor
- `GET /api/patients` - List all patients
- `GET /api/departments` - List departments
- `POST /api/departments` - Add department

### Appointment Management
- `GET /api/appointments` - Get appointments (filtered by user role)
- `POST /api/appointments` - Book new appointment
- `PUT /api/appointments/<id>` - Update appointment
- `DELETE /api/appointments/<id>` - Cancel appointment

### Doctor Features
- `GET /api/doctor/dashboard` - Doctor dashboard statistics
- `GET /api/doctors/<id>/availability` - Doctor availability schedule

### Patient Features
- `GET /api/patient/dashboard` - Patient dashboard
- `POST /api/patient/export-csv` - Export treatment history

### Search
- `GET /api/search` - Search doctors and patients

### Background Tasks
- `POST /api/tasks/daily-reminders` - Trigger daily appointment reminders
- `POST /api/tasks/monthly-reports` - Generate monthly doctor reports
- `GET /api/tasks/status` - Check task queue status

## Database Schema

### Key Tables
- **User**: Base user table with authentication
- **Role**: User roles (admin, doctor, patient)
- **Department**: Medical departments/specializations
- **Doctor**: Doctor profiles and information
- **Patient**: Patient profiles and medical information
- **Appointment**: Appointment scheduling and treatment records

## Background Tasks

### Scheduled Tasks
1. **Daily Appointment Reminders** (8:00 AM daily)
   - Sends reminders to patients with appointments next day
   
2. **Monthly Doctor Reports** (1st of every month, 9:00 AM)
   - Generates activity reports for all doctors
   - Includes appointment statistics and patient information

### User-Triggered Tasks
1. **CSV Export**
   - Exports patient treatment history
   - Runs asynchronously and sends email notification

## Caching Strategy

- Dashboard statistics cached for 5 minutes
- Department list cached for 1 hour
- Authentication tokens cached during session
- Cache invalidation on data updates

## Security Features

- Role-based access control (RBAC)
- Token-based authentication
- Password hashing with Argon2
- SQL injection prevention with SQLAlchemy ORM
- XSS protection with proper input sanitization

## Development

### Running in Development Mode
The application runs in debug mode by default when using `python main.py`.

### Database Migrations
The database is created automatically on first run. To reset the database:
1. Delete the `hms.sqlite3` file
2. Restart the application

### Adding New Features
1. Update models in `backend/models.py`
2. Add API endpoints in `backend/api.py`  
3. Create Vue components in `static/js/app.js`
4. Update routes in `static/js/router.js`

## Production Deployment

For production deployment:

1. Update configuration:
   - Set `DEBUG = False`
   - Use strong `SECRET_KEY`
   - Configure proper database (PostgreSQL/MySQL)
   - Set up proper email server

2. Use production WSGI server:
   ```bash
   gunicorn -w 4 main:app
   ```

3. Set up reverse proxy (Nginx)
4. Configure SSL certificates
5. Set up monitoring and logging

## Troubleshooting

### Common Issues

1. **Redis Connection Error**
   - Ensure Redis server is running
   - Check Redis configuration in `main.py`

2. **Database Errors**
   - Delete `hms.sqlite3` and restart application
   - Check database permissions

3. **Celery Tasks Not Running**
   - Ensure Celery worker is started
   - Check Redis connection
   - Verify task imports in `backend/tasks.py`

4. **Authentication Issues**
   - Clear browser localStorage
   - Check token expiration settings

## License

This project is for educational purposes made for MAD II .

## Support

For issues and questions, please refer to the project documentation or contact the development team.