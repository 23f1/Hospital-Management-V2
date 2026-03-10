# Hospital Management System — Project Report

## 1. Introduction

The Hospital Management System (HMS) is a comprehensive web application designed to digitize and streamline hospital operations. It provides role-based access for three categories of users — Administrators, Doctors, and Patients — enabling efficient management of appointments, departments, doctor profiles, patient records, and automated background tasks.

## 2. Objectives

- Provide a centralized platform for managing hospital operations
- Enable role-based access control for Admins, Doctors, and Patients
- Allow patients to book appointments with available doctors
- Enable doctors to manage appointments and record treatment details (diagnosis, prescription, notes)
- Provide admin oversight of all hospital data including doctors, patients, departments, and appointments
- Automate routine tasks such as appointment reminders and monthly reports using background job processing
- Support treatment history export for patients in CSV format

## 3. Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend Framework** | Flask 2.3.3 (Python) |
| **Frontend Framework** | Vue.js 3 (Single Page Application) |
| **Database** | SQLite with SQLAlchemy ORM |
| **Authentication** | Flask-Security-Too 5.3.0 (Token-based) |
| **Password Hashing** | Argon2-CFFI |
| **Background Tasks** | Celery 5.3.1 with Redis as message broker |
| **Caching** | Flask-Caching 2.1.0 (SimpleCache / Redis) |
| **UI Framework** | Bootstrap 5.3.0, Font Awesome 6.4.0 |
| **Routing** | Vue Router 4 (hash-based SPA routing) |
| **Email** | Flask-Mail 0.9.1 |
| **Production Server** | Gunicorn 21.2.0 |

## 4. System Architecture

The application follows an **MVC + SPA** architecture:

```
┌──────────────────────────────────────────────┐
│         FRONTEND (Vue.js 3 SPA)              │
│  Components: Login, Register, Admin,         │
│              Doctor, Patient Dashboards       │
│  Routing: Vue Router with auth guards        │
│  State: localStorage (token, role, name)     │
└──────────────────┬───────────────────────────┘
                   │  REST API calls (Fetch)
                   ▼
┌──────────────────────────────────────────────┐
│         BACKEND (Flask REST API)             │
│  Auth: Token-based with role enforcement     │
│  Endpoints: /api/* (Blueprint)               │
│  Caching: SimpleCache / Redis                │
└──────┬───────────────────┬───────────────────┘
       │                   │
       ▼                   ▼
┌──────────────┐   ┌──────────────────────────┐
│   SQLite DB  │   │ Celery + Redis            │
│  (SQLAlchemy │   │ Background task queues:   │
│   ORM)       │   │ notifications, reports,   │
│              │   │ exports                   │
└──────────────┘   └──────────────────────────┘
```

## 5. Database Design

The system uses 9 database tables:

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Authentication & authorization | id, email, password (hashed), name, active, roles |
| **Role** | User role definitions | id, name, description |
| **Department** | Hospital departments | id, name, description |
| **Doctor** | Doctor profiles | id, user_id (FK), department_id (FK), specialization, experience_years, available_today |
| **Patient** | Patient profiles | id, user_id (FK), phone, address, dob |
| **Appointment** | Scheduling & treatment records | id, doctor_id (FK), patient_id (FK), date_time, status, diagnosis, prescription, notes |
| **DoctorAvailability** | Weekly schedule | id, doctor_id (FK), day_of_week, start_time, end_time, is_available |
| **AppointmentHistory** | Audit trail | id, appointment_id (FK), changed_by_user_id, change_type, old_values, new_values, timestamp |
| **SystemSettings** | App configuration | id, key, value, description, updated_at |

**Key Relationships:**

- User ↔ Role: Many-to-Many
- User → Doctor / Patient: One-to-One
- Doctor → Department: Many-to-One
- Doctor / Patient → Appointment: One-to-Many

**Pre-seeded Data:** 3 roles (admin, doctor, patient), 1 admin user, 10 medical departments (Cardiology, Neurology, Orthopedics, Pediatrics, General Medicine, Dermatology, Gynecology, ENT, Psychiatry, Emergency), and 5 sample patients.

## 6. API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/login` | User login, returns auth token |
| POST | `/api/register` | Patient self-registration |

### Admin Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard-stats` | Admin statistics |
| GET/POST | `/api/doctors` | List / Add doctors |
| PUT/DELETE | `/api/doctors/<id>` | Update / Deactivate doctor |
| GET/PUT/DELETE | `/api/patients/<id>` | List / Update / Delete patients |
| GET/POST | `/api/departments` | List / Add departments |
| DELETE | `/api/departments/<id>` | Delete department |

### Appointments

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/appointments` | List appointments (role-filtered) |
| POST | `/api/appointments` | Book appointment (patients) |
| PUT | `/api/appointments/<id>` | Update status/treatment details |
| DELETE | `/api/appointments/<id>` | Cancel appointment |

### Doctor & Patient Dashboards

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/doctor/dashboard` | Doctor stats |
| GET | `/api/doctors/<id>/availability` | Doctor weekly availability |
| GET | `/api/patient/dashboard` | Patient stats |
| POST | `/api/patient/export-csv` | Export treatment history to CSV |

### Background Tasks (Admin)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/tasks/daily-reminders` | Trigger appointment reminders |
| POST | `/api/tasks/monthly-reports` | Trigger monthly doctor reports |
| GET | `/api/tasks/status` | Check Celery/Redis status |

## 7. Frontend Components

The frontend is a Vue.js 3 Single Page Application with 5 components:

### 7.1 Login Component

- Email/password authentication form
- Role-based redirect after login (admin → /admin, doctor → /doctor, patient → /patient)
- Auth token stored in localStorage

### 7.2 Register Component

- Patient self-registration with name, email, password, phone, and address
- Input validation and error handling

### 7.3 Admin Dashboard

- **Statistics Cards:** Total Doctors, Patients, Appointments, Upcoming Appointments
- **Doctor Management Tab:** Add new doctor form, searchable doctor directory, edit/delete actions
- **Patient Management Tab:** Searchable patient list, view details modal, delete action
- **Appointments Tab:** Searchable appointment list with status badges, complete/cancel actions
- **Departments Tab:** Add department form, department cards with doctor count, delete action
- **Background Tasks Tab:** Manually trigger daily reminders and monthly reports, check task queue status

### 7.4 Doctor Dashboard

- **Statistics Cards:** Today's Appointments, This Week's Appointments, Total Patients
- **My Appointments:** Full appointments table with status filter, treatment completion modal (diagnosis, prescription, notes), cancel appointment action

### 7.5 Patient Dashboard

- **Statistics Cards:** Upcoming Appointments, Completed Appointments
- **Treatment History:** Export to CSV (background task via Celery)
- **Department Browsing:** View departments, see doctors per department
- **Appointment Booking:** Select doctor, pick date/time, enter reason, book appointment with conflict validation

## 8. Authentication & Authorization

- **Mechanism:** Token-based authentication using Flask-Security-Too
- **Token Header:** `Authentication-Token`
- **Password Hashing:** Argon2
- **Role-Based Access Control (RBAC):** Three roles — `admin`, `doctor`, `patient`
- **Route Guards:** Vue Router navigation guards check auth token and role before rendering protected routes
- **Backend Enforcement:** `@auth_token_required` and `@roles_required()` decorators on API endpoints

## 9. Background Tasks (Celery)

| Task | Queue | Schedule |
|------|-------|----------|
| **Daily Appointment Reminders** | notifications | 8:00 AM daily |
| **Monthly Doctor Reports** | reports | 9:00 AM on 1st of month |
| **Patient Data CSV Export** | exports | User-triggered |

- **Broker & Result Backend:** Redis at localhost:6379
- **Serialization:** JSON
- **Scheduling:** Celery Beat for periodic tasks
- Tasks can also be triggered manually by admin from the dashboard

## 10. Caching

- **Development:** Flask-Caching with SimpleCache
- **Production:** Redis-backed caching
- **Cached Data:** Dashboard statistics (5-minute TTL), Department list (1-hour TTL)
- Cache is invalidated automatically when relevant data is modified

## 11. Project Structure

```
Hospital_Management_App/
├── main.py                  # Flask app entry point & initialization
├── celery_app.py            # Celery configuration & beat schedule
├── requirements.txt         # Python dependencies
├── start_celery_worker.bat  # Windows batch file to start Celery
├── backend/
│   ├── api.py               # REST API endpoints (Blueprint)
│   ├── config.py            # Configuration
│   ├── models.py            # SQLAlchemy database models
│   ├── tasks.py             # Celery background tasks
│   └── workers.py           # Celery worker setup
├── static/
│   ├── css/style.css        # Custom styles
│   └── js/
│       ├── app.js           # Vue.js components
│       └── router.js        # Vue Router configuration
└── templates/
    └── index.html           # SPA entry HTML template
```

## 12. How to Run

1. **Install dependencies:** `pip install -r requirements.txt`
2. **Start Redis/Memurai** (required for Celery)
3. **Start the Flask app:** `python main.py`
4. **Start Celery worker:** `celery -A celery_app.celery worker --loglevel=info --pool=solo`
5. **Start Celery Beat (optional):** `celery -A celery_app.celery beat --loglevel=info`
6. **Access the app:** `http://localhost:5000`
7. **Default admin login:** `admin@hms.com` / `admin123`

## 13. Conclusion

The Hospital Management System successfully delivers a full-stack web application that addresses core hospital management needs. It features secure role-based access, a responsive single-page frontend, RESTful API architecture, automated background task processing, and a well-normalized database design. The modular architecture allows for easy extension and maintenance, making it suitable for further development into a production-grade hospital management solution.
