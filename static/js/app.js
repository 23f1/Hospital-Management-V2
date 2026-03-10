// Vue.js 3 Application for Hospital Management System
const { createApp } = Vue;

console.log('Vue loaded:', Vue);
console.log('Creating Vue app...');

// Create Vue app
const app = createApp({
    data() {
        console.log('Vue app data() called');
        return {
            user: null,
            isAuthenticated: false,
            isLoading: false
        }
    },
    async mounted() {
        console.log('Vue app mounted!');
        // Check if user is already logged in
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.isAuthenticated = true;
        }
        
        // Hide loading after Vue is mounted
        this.isLoading = false;
    }
});

// --- COMPONENT: LOGIN ---
app.component('login-component', {
    template: `
    <div class="container d-flex justify-content-center align-items-center vh-100">
        <div class="card p-4 shadow" style="width: 400px;">
            <h3 class="text-center mb-3">Hospital Management System</h3>
            <h5 class="text-center text-muted mb-4">Login</h5>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            
            <form @submit.prevent="login">
                <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input v-model="form.email" type="email" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input v-model="form.password" type="password" class="form-control" required>
                </div>
                
                <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                    {{ loading ? 'Logging in...' : 'Login' }}
                </button>
            </form>
            
            <div class="mt-3 text-center">
                <small>New Patient? <router-link to="/register">Create Account</router-link></small>
            </div>
            
            <div class="mt-4 p-3 bg-light rounded">
                <small class="text-muted">
                    <strong>Demo Credentials:</strong><br>
                    Admin: admin@hms.com / admin123
                </small>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            form: { email: '', password: '' },
            error: null,
            loading: false
        }
    },
    methods: {
        async login() {
            this.loading = true;
            this.error = null;
            
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    // Store auth data
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_role', data.role);
                    localStorage.setItem('user_email', data.email);
                    localStorage.setItem('user_name', data.name);
                    
                    // Redirect based on role
                    if (data.role === 'admin') {
                        this.$router.push('/admin');
                    } else if (data.role === 'doctor') {
                        this.$router.push('/doctor');
                    } else {
                        this.$router.push('/patient');
                    }
                } else {
                    this.error = data.message;
                }
            } catch (e) {
                this.error = "Login failed. Please try again.";
            } finally {
                this.loading = false;
            }
        }
    }
});

// --- COMPONENT: REGISTER ---
app.component('register-component', {
    template: `
    <div class="container d-flex justify-content-center align-items-center vh-100">
        <div class="card p-4 shadow" style="width: 450px;">
            <h3 class="text-center mb-3">Patient Registration</h3>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div v-if="success" class="alert alert-success">{{ success }}</div>
            
            <form @submit.prevent="register">
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <label class="form-label">Full Name *</label>
                        <input v-model="form.name" type="text" class="form-control" required>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Email *</label>
                    <input v-model="form.email" type="email" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Password *</label>
                    <input v-model="form.password" type="password" class="form-control" required minlength="6">
                </div>
                <div class="mb-3">
                    <label class="form-label">Phone Number</label>
                    <input v-model="form.phone" type="text" class="form-control">
                </div>
                <div class="mb-3">
                    <label class="form-label">Address</label>
                    <textarea v-model="form.address" class="form-control" rows="2"></textarea>
                </div>
                
                <button type="submit" class="btn btn-success w-100" :disabled="loading">
                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                    {{ loading ? 'Creating Account...' : 'Sign Up' }}
                </button>
            </form>
            
            <div class="mt-3 text-center">
                <small>Already have an account? <router-link to="/">Login here</router-link></small>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            form: { name: '', email: '', password: '', phone: '', address: '' },
            error: null,
            success: null,
            loading: false
        }
    },
    methods: {
        async register() {
            this.loading = true;
            this.error = null;
            this.success = null;
            
            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    this.success = data.message;
                    this.form = { name: '', email: '', password: '', phone: '', address: '' };
                    // Auto redirect after 3 seconds
                    setTimeout(() => this.$router.push('/'), 3000);
                } else {
                    this.error = data.message;
                }
            } catch (e) {
                this.error = "Registration failed. Please try again.";
            } finally {
                this.loading = false;
            }
        }
    }
});

// --- COMPONENT: ADMIN DASHBOARD ---
app.component('admin-dash', {
    template: `
    <div>
        <nav class="navbar navbar-dark bg-dark p-3">
            <div class="container-fluid">
                <span class="navbar-brand mb-0 h1">
                    <i class="fas fa-hospital"></i> Admin Dashboard
                </span>
                <div>
                    <span class="text-light me-3">Welcome, Admin</span>
                    <button @click="logout" class="btn btn-outline-light btn-sm">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        </nav>

        <div class="container-fluid mt-4">
            <!-- Statistics Cards -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4>{{ stats.doctors || 0 }}</h4>
                                    <p class="mb-0">Doctors</p>
                                </div>
                                <i class="fas fa-user-md fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4>{{ stats.patients || 0 }}</h4>
                                    <p class="mb-0">Patients</p>
                                </div>
                                <i class="fas fa-users fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-dark">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4>{{ stats.appointments || 0 }}</h4>
                                    <p class="mb-0">Total Appointments</p>
                                </div>
                                <i class="fas fa-calendar fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4>{{ stats.upcoming_appointments || 0 }}</h4>
                                    <p class="mb-0">Upcoming</p>
                                </div>
                                <i class="fas fa-clock fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <ul class="nav nav-tabs" role="tablist">
                <li class="nav-item">
                    <a class="nav-link" :class="{active: activeTab === 'doctors'}" 
                       @click.prevent="activeTab = 'doctors'">
                        <i class="fas fa-user-md"></i> Doctor Management
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" :class="{active: activeTab === 'patients'}" 
                       @click.prevent="activeTab = 'patients'">
                        <i class="fas fa-users"></i> Patient Management
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" :class="{active: activeTab === 'appointments'}" 
                       @click.prevent="activeTab = 'appointments'">
                        <i class="fas fa-calendar"></i> Appointments
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" :class="{active: activeTab === 'departments'}" 
                       @click.prevent="activeTab = 'departments'">
                        <i class="fas fa-building"></i> Departments
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" :class="{active: activeTab === 'tasks'}" 
                       @click.prevent="activeTab = 'tasks'">
                        <i class="fas fa-cogs"></i> Background Tasks
                    </a>
                </li>
            </ul>

            <!-- Tab Content -->
            <div class="tab-content mt-4">
                <!-- Doctor Management Tab -->
                <div v-if="activeTab === 'doctors'" class="tab-pane active">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header bg-primary text-white">
                                    <h5><i class="fas fa-plus"></i> Add New Doctor</h5>
                                </div>
                                <div class="card-body">
                                    <form @submit.prevent="addDoctor">
                                        <div class="mb-3">
                                            <label class="form-label">Full Name *</label>
                                            <input v-model="doctorForm.name" class="form-control" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Email *</label>
                                            <input v-model="doctorForm.email" type="email" class="form-control" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Password *</label>
                                            <input v-model="doctorForm.password" type="password" class="form-control" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Department *</label>
                                            <select v-model="doctorForm.department_id" class="form-control" required>
                                                <option value="">Select Department</option>
                                                <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                                                    {{ dept.name }}
                                                </option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Specialization *</label>
                                            <input v-model="doctorForm.specialization" class="form-control" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Experience (Years) *</label>
                                            <input v-model="doctorForm.experience_years" type="number" class="form-control" required min="0">
                                        </div>
                                        <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                            Add Doctor
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <div class="row">
                                        <div class="col">
                                            <h5><i class="fas fa-list"></i> Doctors Directory</h5>
                                        </div>
                                        <div class="col-auto">
                                            <input v-model="searchDoctors" class="form-control" placeholder="Search doctors...">
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Specialization</th>
                                                    <th>Experience</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="doctor in filteredDoctors" :key="doctor.id">
                                                    <td>{{ doctor.name }}</td>
                                                    <td>{{ doctor.email }}</td>
                                                    <td>{{ doctor.specialization }}</td>
                                                    <td>{{ doctor.experience_years }} years</td>
                                                    <td>
                                                        <span class="badge" :class="doctor.available_today ? 'bg-success' : 'bg-secondary'">
                                                            {{ doctor.available_today ? 'Available' : 'Off Duty' }}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button class="btn btn-sm btn-outline-primary me-1" 
                                                                @click="editDoctor(doctor)">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-danger" 
                                                                @click="deleteDoctor(doctor.id)">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Other tabs will be implemented similarly -->
                <div v-if="activeTab === 'patients'" class="['tab-pane', { active: activeTab === 'patients', show: activeTab === 'patients' }]">
                    <div class="card">
                        <div class="card-header">
                            <div class="row">
                                <div class="col">
                                    <h5><i class="fas fa-users"></i> Patient Directory</h5>
                                </div>
                                <div class="col-auto">
                                    <input v-model="searchPatients" class="form-control" placeholder="Search patients...">
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div v-if="loadingPatients" class="text-center">
                                <div class="spinner-border" role="status"></div>
                                <p>Loading patients...</p>
                            </div>
                            <div v-else>
                                <div v-if="filteredPatients.length === 0" class="text-center text-muted">
                                    <i class="fas fa-users fa-3x mb-3"></i>
                                    <p>No patients found</p>
                                </div>
                                <div v-else class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Phone</th>
                                                <th>Date of Birth</th>
                                                <th>Total Appointments</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="patient in filteredPatients" :key="patient.id">
                                                <td>{{ patient.name }}</td>
                                                <td>{{ patient.email }}</td>
                                                <td>{{ patient.phone || 'N/A' }}</td>
                                                <td>{{ patient.dob ? formatDate(patient.dob) : 'N/A' }}</td>
                                                <td>{{ patient.total_appointments || 0 }}</td>
                                                <td>
                                                    <button @click="viewPatientDetails(patient)" class="btn btn-sm btn-outline-info me-2">
                                                        <i class="fas fa-eye"></i> View
                                                    </button>
                                                    <button @click="deletePatient(patient.id)" class="btn btn-sm btn-outline-danger">
                                                        <i class="fas fa-trash"></i> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="activeTab === 'appointments'" class="['tab-pane', { active: activeTab === 'appointments', show: activeTab === 'appointments' }]">
                    <div class="card">
                        <div class="card-header">
                            <div class="row">
                                <div class="col">
                                    <h5><i class="fas fa-calendar"></i> Appointments Management</h5>
                                </div>
                                <div class="col-auto">
                                    <input v-model="searchAppointments" class="form-control" placeholder="Search appointments...">
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div v-if="loadingAppointments" class="text-center">
                                <div class="spinner-border" role="status"></div>
                                <p>Loading appointments...</p>
                            </div>
                            <div v-else>
                                <div v-if="filteredAppointments.length === 0" class="text-center text-muted">
                                    <i class="fas fa-calendar fa-3x mb-3"></i>
                                    <p>No appointments found</p>
                                </div>
                                <div v-else class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Patient</th>
                                                <th>Doctor</th>
                                                <th>Date & Time</th>
                                                <th>Status</th>
                                                <th>Department</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="appointment in filteredAppointments" :key="appointment.id">
                                                <td>{{ appointment.patient_name }}</td>
                                                <td>{{ appointment.doctor_name }}</td>
                                                <td>{{ formatDateTime(appointment.date_time) }}</td>
                                                <td>
                                                    <span :class="getStatusBadgeClass(appointment.status)">{{ appointment.status }}</span>
                                                </td>
                                                <td>{{ appointment.department_name }}</td>
                                                <td>
                                                    <button @click="updateAppointmentStatus(appointment, 'Completed')" 
                                                            v-if="appointment.status === 'Booked'" 
                                                            class="btn btn-sm btn-success me-1">
                                                        <i class="fas fa-check"></i> Complete
                                                    </button>
                                                    <button @click="updateAppointmentStatus(appointment, 'Cancelled')" 
                                                            v-if="appointment.status === 'Booked'" 
                                                            class="btn btn-sm btn-danger">
                                                        <i class="fas fa-times"></i> Cancel
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="activeTab === 'departments'" class="['tab-pane', { active: activeTab === 'departments', show: activeTab === 'departments' }]">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header bg-info text-white">
                                    <h5><i class="fas fa-plus"></i> Add New Department</h5>
                                </div>
                                <div class="card-body">
                                    <form @submit.prevent="addDepartment">
                                        <div class="mb-3">
                                            <label class="form-label">Department Name *</label>
                                            <input v-model="departmentForm.name" class="form-control" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Description *</label>
                                            <textarea v-model="departmentForm.description" class="form-control" rows="3" required></textarea>
                                        </div>
                                        <button type="submit" class="btn btn-info w-100" :disabled="loading">
                                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                            Add Department
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h5><i class="fas fa-building"></i> Departments Directory</h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div v-for="dept in departments" :key="dept.id" class="col-md-6 mb-3">
                                            <div class="card border-left-info">
                                                <div class="card-body">
                                                    <h6 class="card-title">{{ dept.name }}</h6>
                                                    <p class="card-text text-muted small">{{ dept.description }}</p>
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <small class="text-muted">{{ dept.doctor_count || 0 }} doctors</small>
                                                        <button @click="deleteDepartment(dept.id)" class="btn btn-sm btn-outline-danger">
                                                            <i class="fas fa-trash"></i> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Background Tasks Tab -->
                <div v-if="activeTab === 'tasks'" class="['tab-pane', { active: activeTab === 'tasks', show: activeTab === 'tasks' }]">
                    <div class="row">
                        <div class="col-md-12">
                            <div class="card">
                                <div class="card-header bg-warning">
                                    <h5><i class="fas fa-cogs"></i> Background Task Management</h5>
                                </div>
                                <div class="card-body">
                                    <p class="text-muted">
                                        Manually trigger background tasks for testing and demonstration purposes. 
                                        In production, these tasks run automatically on scheduled intervals.
                                    </p>
                                    
                                    <div class="row">
                                        <!-- Daily Appointment Reminders -->
                                        <div class="col-md-4 mb-3">
                                            <div class="card border-info">
                                                <div class="card-body">
                                                    <h6 class="card-title">
                                                        <i class="fas fa-bell"></i> Daily Appointment Reminders
                                                    </h6>
                                                    <p class="card-text small">
                                                        Send reminder emails to patients with appointments tomorrow.
                                                        <strong>Scheduled:</strong> Daily at 8:00 AM
                                                    </p>
                                                    <button @click="triggerDailyReminders" class="btn btn-info btn-sm" :disabled="runningDailyReminders">
                                                        <span v-if="runningDailyReminders" class="spinner-border spinner-border-sm me-2"></span>
                                                        <i v-else class="fas fa-play me-2"></i>
                                                        {{ runningDailyReminders ? 'Running...' : 'Trigger Now' }}
                                                    </button>
                                                    <div v-if="dailyReminderMessage" class="alert alert-info mt-2 small">
                                                        {{ dailyReminderMessage }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Monthly Doctor Reports -->
                                        <div class="col-md-4 mb-3">
                                            <div class="card border-success">
                                                <div class="card-body">
                                                    <h6 class="card-title">
                                                        <i class="fas fa-chart-bar"></i> Monthly Doctor Reports
                                                    </h6>
                                                    <p class="card-text small">
                                                        Generate activity reports for all doctors.
                                                        <strong>Scheduled:</strong> 1st of every month at 9:00 AM
                                                    </p>
                                                    <button @click="triggerMonthlyReports" class="btn btn-success btn-sm" :disabled="runningMonthlyReports">
                                                        <span v-if="runningMonthlyReports" class="spinner-border spinner-border-sm me-2"></span>
                                                        <i v-else class="fas fa-play me-2"></i>
                                                        {{ runningMonthlyReports ? 'Generating...' : 'Generate Now' }}
                                                    </button>
                                                    <div v-if="monthlyReportMessage" class="alert alert-success mt-2 small">
                                                        {{ monthlyReportMessage }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Task Status Monitor -->
                                        <div class="col-md-4 mb-3">
                                            <div class="card border-secondary">
                                                <div class="card-body">
                                                    <h6 class="card-title">
                                                        <i class="fas fa-monitor-heart-rate"></i> Task Monitor
                                                    </h6>
                                                    <p class="card-text small">
                                                        Check Celery worker status and running tasks.
                                                    </p>
                                                    <button @click="checkTaskStatus" class="btn btn-secondary btn-sm" :disabled="checkingStatus">
                                                        <span v-if="checkingStatus" class="spinner-border spinner-border-sm me-2"></span>
                                                        <i v-else class="fas fa-refresh me-2"></i>
                                                        {{ checkingStatus ? 'Checking...' : 'Check Status' }}
                                                    </button>
                                                    <div v-if="taskStatusMessage" class="mt-2 small">
                                                        <div :class="taskStatusClass">{{ taskStatusMessage }}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mt-4">
                                        <div class="col-12">
                                            <div class="card">
                                                <div class="card-header">
                                                    <h6><i class="fas fa-info-circle"></i> Background Task Information</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div class="row">
                                                        <div class="col-md-6">
                                                            <h6>Automated Scheduling:</h6>
                                                            <ul class="list-unstyled">
                                                                <li><strong>Daily Reminders:</strong> 8:00 AM every day</li>
                                                                <li><strong>Monthly Reports:</strong> 9:00 AM on 1st of month</li>
                                                                <li><strong>CSV Exports:</strong> User-triggered via patient dashboard</li>
                                                            </ul>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <h6>Requirements:</h6>
                                                            <ul class="list-unstyled">
                                                                <li><i class="fas fa-check text-success"></i> Redis/Memurai running</li>
                                                                <li><i class="fas fa-check text-success"></i> Celery worker active</li>
                                                                <li><i class="fas fa-info-circle text-info"></i> Celery beat for scheduling (optional)</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Patient Details Modal -->
        <div class="modal fade" id="patientDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Patient Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" v-if="selectedPatient">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Personal Information</h6>
                                <table class="table table-sm">
                                    <tbody>
                                        <tr><td><strong>Name:</strong></td><td>{{ selectedPatient.name }}</td></tr>
                                        <tr><td><strong>Email:</strong></td><td>{{ selectedPatient.email }}</td></tr>
                                        <tr><td><strong>Phone:</strong></td><td>{{ selectedPatient.phone || 'N/A' }}</td></tr>
                                        <tr><td><strong>Date of Birth:</strong></td><td>{{ formatDate(selectedPatient.dob) }}</td></tr>
                                        <tr><td><strong>Address:</strong></td><td>{{ selectedPatient.address || 'N/A' }}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6>Medical Summary</h6>
                                <table class="table table-sm">
                                    <tbody>
                                        <tr><td><strong>Total Appointments:</strong></td><td>{{ selectedPatient.total_appointments || 0 }}</td></tr>
                                        <tr><td><strong>Last Appointment:</strong></td><td>{{ formatDate(selectedPatient.last_appointment) }}</td></tr>
                                        <tr><td><strong>Member Since:</strong></td><td>{{ formatDate(selectedPatient.joined_date) }}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            activeTab: 'doctors',
            stats: {},
            doctors: [],
            departments: [],
            patients: [],
            appointments: [],
            searchDoctors: '',
            searchPatients: '',
            searchAppointments: '',
            loadingPatients: false,
            loadingAppointments: false,
            selectedPatient: null,
            userName: localStorage.getItem('user_name') || 'Admin',
            loading: false,
            doctorForm: {
                name: '', 
                email: '', 
                password: '', 
                department_id: '', 
                specialization: '', 
                experience_years: 0
            },
            departmentForm: {
                name: '',
                description: ''
            },
            // Background Tasks
            runningDailyReminders: false,
            runningMonthlyReports: false,
            checkingStatus: false,
            dailyReminderMessage: '',
            monthlyReportMessage: '',
            taskStatusMessage: '',
            taskStatusClass: ''
        }
    },
    async mounted() {
        console.log('Admin dashboard mounted!');
        console.log('Fetching admin data...');
        await this.fetchStats();
        await this.fetchDoctors();
        await this.fetchDepartments();
        await this.fetchPatients();
        await this.fetchAppointments();
        console.log('Admin data fetched. Stats:', this.stats, 'Doctors:', this.doctors.length, 'Patients:', this.patients.length);
    },
    computed: {
        filteredDoctors() {
            if (!this.searchDoctors) return this.doctors;
            return this.doctors.filter(doctor => 
                doctor.name.toLowerCase().includes(this.searchDoctors.toLowerCase()) ||
                doctor.specialization.toLowerCase().includes(this.searchDoctors.toLowerCase())
            );
        },
        filteredAppointments() {
            if (!this.appointments || !Array.isArray(this.appointments)) {
                return [];
            }
            if (!this.searchAppointments) return this.appointments;
            return this.appointments.filter(appointment => {
                if (!appointment || !appointment.patient_name || !appointment.doctor_name) {
                    return false;
                }
                return appointment.patient_name.toLowerCase().includes(this.searchAppointments.toLowerCase()) ||
                       appointment.doctor_name.toLowerCase().includes(this.searchAppointments.toLowerCase());
            });
        },
        filteredPatients() {
            console.log('Computing filteredPatients...');
            console.log('this.patients:', this.patients);
            console.log('Array.isArray(this.patients):', Array.isArray(this.patients));
            console.log('this.searchPatients:', this.searchPatients);
            
            if (!this.patients || !Array.isArray(this.patients)) {
                console.log('Patients is not valid array, returning empty');
                return [];
            }
            if (!this.searchPatients) {
                console.log('No search term, returning all patients:', this.patients.length);
                return this.patients;
            }
            const filtered = this.patients.filter(patient => {
                if (!patient) return false;
                const name = patient.name || '';
                const email = patient.email || '';
                return name.toLowerCase().includes(this.searchPatients.toLowerCase()) ||
                       email.toLowerCase().includes(this.searchPatients.toLowerCase());
            });
            console.log('Filtered patients:', filtered.length);
            return filtered;
        }
    },
    methods: {
        getAuthHeader() {
            return { 
                'Authentication-Token': localStorage.getItem('auth_token'),
                'Content-Type': 'application/json' 
            };
        },
        async fetchStats() {
            try {
                const res = await fetch('/api/dashboard-stats', { headers: this.getAuthHeader() });
                if (res.ok) this.stats = await res.json();
            } catch (e) {
                console.error('Error fetching stats:', e);
            }
        },
        async fetchDoctors() {
            try {
                const res = await fetch('/api/doctors', { headers: this.getAuthHeader() });
                if (res.ok) this.doctors = await res.json();
            } catch (e) {
                console.error('Error fetching doctors:', e);
            }
        },
        async fetchDepartments() {
            try {
                const res = await fetch('/api/departments');
                if (res.ok) this.departments = await res.json();
            } catch (e) {
                console.error('Error fetching departments:', e);
            }
        },
        async fetchPatients() {
            this.loadingPatients = true;
            console.log('Fetching patients...'); // Debug log
            try {
                const res = await fetch('/api/patients', { headers: this.getAuthHeader() });
                console.log('Patients API response status:', res.status); // Debug log
                if (res.ok) {
                    const patientsData = await res.json();
                    console.log('Raw patients data:', patientsData); // Debug log
                    // Force reactivity by creating a new array
                    this.patients = [...patientsData];
                    console.log('Patients array set:', this.patients); // Debug log
                    console.log('Patients length:', this.patients.length); // Debug log
                } else {
                    console.error('Failed to fetch patients:', res.status, res.statusText);
                }
            } catch (e) {
                console.error('Error fetching patients:', e);
            } finally {
                this.loadingPatients = false;
            }
        },
        async deletePatient(patientId) {
            if (!confirm('Are you sure you want to delete this patient?')) return;
            
            try {
                const res = await fetch(`/api/patients/${patientId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeader()
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    alert('Patient deleted successfully!');
                    await this.fetchPatients();
                    await this.fetchStats();
                } else {
                    alert(data.message || 'Failed to delete patient');
                }
            } catch (e) {
                console.error('Error deleting patient:', e);
                alert('Error deleting patient. Please try again.');
            }
        },
        viewPatientDetails(patient) {
            this.selectedPatient = patient;
            const modal = new bootstrap.Modal(document.getElementById('patientDetailsModal'));
            modal.show();
        },
        async fetchAppointments() {
            this.loadingAppointments = true;
            try {
                const res = await fetch('/api/appointments', { headers: this.getAuthHeader() });
                if (res.ok) {
                    this.appointments = await res.json();
                }
            } catch (e) {
                console.error('Error fetching appointments:', e);
            } finally {
                this.loadingAppointments = false;
            }
        },
        async updateAppointmentStatus(appointment, status) {
            try {
                const res = await fetch(`/api/appointments/${appointment.id}`, {
                    method: 'PUT',
                    headers: this.getAuthHeader(),
                    body: JSON.stringify({ status: status })
                });
                
                if (res.ok) {
                    alert(`Appointment ${status.toLowerCase()} successfully!`);
                    await this.fetchAppointments();
                    await this.fetchStats();
                } else {
                    const data = await res.json();
                    alert(data.message || 'Failed to update appointment');
                }
            } catch (e) {
                console.error('Error updating appointment:', e);
                alert('Error updating appointment. Please try again.');
            }
        },
        async addDepartment() {
            this.loading = true;
            try {
                const res = await fetch('/api/departments', {
                    method: 'POST',
                    headers: this.getAuthHeader(),
                    body: JSON.stringify(this.departmentForm)
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    alert('Department added successfully!');
                    this.departmentForm = { name: '', description: '' };
                    await this.fetchDepartments();
                } else {
                    alert(data.message || 'Failed to add department');
                }
            } catch (e) {
                console.error('Error adding department:', e);
                alert('Error adding department. Please try again.');
            } finally {
                this.loading = false;
            }
        },
        async deleteDepartment(departmentId) {
            if (!confirm('Are you sure you want to delete this department?')) return;
            
            try {
                const res = await fetch(`/api/departments/${departmentId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeader()
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    alert('Department deleted successfully!');
                    await this.fetchDepartments();
                } else {
                    alert(data.message || 'Failed to delete department');
                }
            } catch (e) {
                console.error('Error deleting department:', e);
                alert('Error deleting department. Please try again.');
            }
        },
        formatDateTime(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleString();
        },
        getStatusBadgeClass(status) {
            switch(status) {
                case 'Booked': return 'badge bg-primary';
                case 'Completed': return 'badge bg-success';
                case 'Cancelled': return 'badge bg-danger';
                case 'No-Show': return 'badge bg-warning';
                default: return 'badge bg-secondary';
            }
        },
        formatDate(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString();
        },
        async addDoctor() {
            this.loading = true;
            try {
                const res = await fetch('/api/doctors', {
                    method: 'POST',
                    headers: this.getAuthHeader(),
                    body: JSON.stringify(this.doctorForm)
                });
                const data = await res.json();
                
                if (res.ok) {
                    alert(data.message);
                    await this.fetchDoctors();
                    await this.fetchStats();
                    this.doctorForm = {
                        name: '', email: '', password: '', department_id: '', 
                        specialization: '', experience_years: 0
                    };
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (e) {
                alert('Error adding doctor');
                console.error(e);
            } finally {
                this.loading = false;
            }
        },
        editDoctor(doctor) {
            // Implement edit functionality
            console.log('Edit doctor:', doctor);
        },
        async deleteDoctor(doctorId) {
            if (!confirm('Are you sure you want to deactivate this doctor?')) return;
            
            try {
                const res = await fetch(`/api/doctors/${doctorId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeader()
                });
                const data = await res.json();
                
                if (res.ok) {
                    alert(data.message);
                    await this.fetchDoctors();
                    await this.fetchStats();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (e) {
                alert('Error deleting doctor');
                console.error(e);
            }
        },
        async triggerDailyReminders() {
            this.runningDailyReminders = true;
            this.dailyReminderMessage = '';
            
            try {
                const res = await fetch('/api/tasks/daily-reminders', {
                    method: 'POST',
                    headers: this.getAuthHeader()
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    this.dailyReminderMessage = `✅ ${data.message} (Task ID: ${data.task_id})`;
                } else {
                    this.dailyReminderMessage = `❌ ${data.message}`;
                }
            } catch (e) {
                this.dailyReminderMessage = '❌ Error connecting to task queue. Please check Celery worker.';
                console.error('Error triggering daily reminders:', e);
            } finally {
                this.runningDailyReminders = false;
            }
        },
        async triggerMonthlyReports() {
            this.runningMonthlyReports = true;
            this.monthlyReportMessage = '';
            
            try {
                const res = await fetch('/api/tasks/monthly-reports', {
                    method: 'POST', 
                    headers: this.getAuthHeader()
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    this.monthlyReportMessage = `✅ ${data.message} (Task ID: ${data.task_id})`;
                } else {
                    this.monthlyReportMessage = `❌ ${data.message}`;
                }
            } catch (e) {
                this.monthlyReportMessage = '❌ Error connecting to task queue. Please check Celery worker.';
                console.error('Error triggering monthly reports:', e);
            } finally {
                this.runningMonthlyReports = false;
            }
        },
        async checkTaskStatus() {
            this.checkingStatus = true;
            this.taskStatusMessage = '';
            this.taskStatusClass = '';
            
            try {
                const res = await fetch('/api/tasks/status', {
                    headers: this.getAuthHeader()
                });
                
                const data = await res.json();
                
                if (res.ok && data.redis_connected) {
                    this.taskStatusMessage = `✅ ${data.message}`;
                    this.taskStatusClass = 'alert alert-success';
                } else {
                    this.taskStatusMessage = `⚠️ ${data.message}`;
                    this.taskStatusClass = 'alert alert-warning';
                }
            } catch (e) {
                this.taskStatusMessage = '❌ Unable to connect to task queue. Please check Celery worker and Redis.';
                this.taskStatusClass = 'alert alert-danger';
                console.error('Error checking task status:', e);
            } finally {
                this.checkingStatus = false;
            }
        },
        logout() {
            localStorage.clear();
            this.$router.push('/');
        }
    }
});

// --- COMPONENT: DOCTOR DASHBOARD ---
app.component('doctor-dash', {
    template: `
    <div>
        <nav class="navbar navbar-dark bg-success p-3">
            <div class="container-fluid">
                <span class="navbar-brand mb-0 h1">
                    <i class="fas fa-stethoscope"></i> Doctor Dashboard
                </span>
                <div>
                    <span class="text-light me-3">Dr. {{ userName }}</span>
                    <button @click="logout" class="btn btn-outline-light btn-sm">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        </nav>

        <div class="container-fluid mt-4">
            <!-- Doctor Dashboard Content -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <h4>{{ dashboardStats.today_appointments || 0 }}</h4>
                            <p>Today's Appointments</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-warning text-dark">
                        <div class="card-body">
                            <h4>{{ dashboardStats.week_appointments || 0 }}</h4>
                            <p>This Week's Appointments</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <h4>{{ dashboardStats.total_patients || 0 }}</h4>
                            <p>Total Patients</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="row align-items-center">
                        <div class="col">
                            <h5 class="mb-0"><i class="fas fa-calendar"></i> My Appointments</h5>
                        </div>
                        <div class="col-auto">
                            <select v-model="statusFilter" @change="fetchAppointments" class="form-select form-select-sm" style="width: auto; display: inline-block;">
                                <option value="">All Statuses</option>
                                <option value="Booked">Booked</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div v-if="loadingAppointments" class="text-center py-4">
                        <div class="spinner-border" role="status"></div>
                        <p class="mt-2">Loading appointments...</p>
                    </div>
                    <div v-else-if="appointments.length === 0" class="text-center text-muted py-4">
                        <i class="fas fa-calendar-times fa-3x mb-3"></i>
                        <p>No appointments found.</p>
                    </div>
                    <div v-else class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                    <th>Diagnosis</th>
                                    <th>Prescription</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="apt in appointments" :key="apt.id">
                                    <td>{{ apt.patient_name }}</td>
                                    <td>{{ formatDateTime(apt.date_time) }}</td>
                                    <td>
                                        <span :class="getStatusBadge(apt.status)">{{ apt.status }}</span>
                                    </td>
                                    <td>{{ apt.diagnosis || '-' }}</td>
                                    <td>{{ apt.prescription || '-' }}</td>
                                    <td>
                                        <button v-if="apt.status === 'Booked'" @click="openTreatmentModal(apt)" class="btn btn-sm btn-outline-success me-1" title="Complete & add treatment">
                                            <i class="fas fa-notes-medical"></i> Treat
                                        </button>
                                        <button v-if="apt.status === 'Booked'" @click="cancelAppointment(apt)" class="btn btn-sm btn-outline-danger" title="Cancel appointment">
                                            <i class="fas fa-times"></i>
                                        </button>
                                        <span v-if="apt.status !== 'Booked'" class="text-muted small">No actions</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Treatment Modal -->
        <div class="modal fade" id="treatmentModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title"><i class="fas fa-notes-medical"></i> Complete Appointment</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" v-if="selectedAppointment">
                        <p><strong>Patient:</strong> {{ selectedAppointment.patient_name }}</p>
                        <p><strong>Date:</strong> {{ formatDateTime(selectedAppointment.date_time) }}</p>
                        <form @submit.prevent="completeTreatment">
                            <div class="mb-3">
                                <label class="form-label">Diagnosis</label>
                                <textarea v-model="treatmentForm.diagnosis" class="form-control" rows="2" placeholder="Enter diagnosis"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Prescription</label>
                                <textarea v-model="treatmentForm.prescription" class="form-control" rows="2" placeholder="Enter prescription"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Notes</label>
                                <textarea v-model="treatmentForm.notes" class="form-control" rows="2" placeholder="Additional notes"></textarea>
                            </div>
                            <div class="d-flex justify-content-end">
                                <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-success" :disabled="submittingTreatment">
                                    <span v-if="submittingTreatment" class="spinner-border spinner-border-sm me-2"></span>
                                    {{ submittingTreatment ? 'Saving...' : 'Complete Appointment' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            dashboardStats: {},
            userName: localStorage.getItem('user_name') || 'Doctor',
            appointments: [],
            loadingAppointments: false,
            statusFilter: '',
            selectedAppointment: null,
            submittingTreatment: false,
            treatmentForm: {
                diagnosis: '',
                prescription: '',
                notes: ''
            }
        }
    },
    async mounted() {
        await this.fetchDashboardStats();
        await this.fetchAppointments();
    },
    methods: {
        getAuthHeader() {
            return { 
                'Authentication-Token': localStorage.getItem('auth_token'),
                'Content-Type': 'application/json' 
            };
        },
        async fetchDashboardStats() {
            try {
                const res = await fetch('/api/doctor/dashboard', { headers: this.getAuthHeader() });
                if (res.ok) this.dashboardStats = await res.json();
            } catch (e) {
                console.error('Error fetching dashboard stats:', e);
            }
        },
        async fetchAppointments() {
            this.loadingAppointments = true;
            try {
                let url = '/api/appointments';
                if (this.statusFilter) url += '?status=' + encodeURIComponent(this.statusFilter);
                const res = await fetch(url, { headers: this.getAuthHeader() });
                if (res.ok) {
                    this.appointments = await res.json();
                }
            } catch (e) {
                console.error('Error fetching appointments:', e);
            } finally {
                this.loadingAppointments = false;
            }
        },
        formatDateTime(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleString();
        },
        getStatusBadge(status) {
            switch (status) {
                case 'Booked': return 'badge bg-primary';
                case 'Completed': return 'badge bg-success';
                case 'Cancelled': return 'badge bg-danger';
                default: return 'badge bg-secondary';
            }
        },
        openTreatmentModal(appointment) {
            this.selectedAppointment = appointment;
            this.treatmentForm = { diagnosis: appointment.diagnosis || '', prescription: appointment.prescription || '', notes: appointment.notes || '' };
            const modal = new bootstrap.Modal(document.getElementById('treatmentModal'));
            modal.show();
        },
        async completeTreatment() {
            this.submittingTreatment = true;
            try {
                const res = await fetch(`/api/appointments/${this.selectedAppointment.id}`, {
                    method: 'PUT',
                    headers: this.getAuthHeader(),
                    body: JSON.stringify({
                        status: 'Completed',
                        diagnosis: this.treatmentForm.diagnosis,
                        prescription: this.treatmentForm.prescription,
                        notes: this.treatmentForm.notes
                    })
                });
                if (res.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('treatmentModal')).hide();
                    await this.fetchAppointments();
                    await this.fetchDashboardStats();
                    alert('Appointment completed successfully!');
                } else {
                    const data = await res.json();
                    alert(data.message || 'Error completing appointment');
                }
            } catch (e) {
                console.error('Error completing appointment:', e);
                alert('Error completing appointment. Please try again.');
            } finally {
                this.submittingTreatment = false;
            }
        },
        async cancelAppointment(appointment) {
            if (!confirm(`Cancel appointment for ${appointment.patient_name}?`)) return;
            try {
                const res = await fetch(`/api/appointments/${appointment.id}`, {
                    method: 'PUT',
                    headers: this.getAuthHeader(),
                    body: JSON.stringify({ status: 'Cancelled' })
                });
                if (res.ok) {
                    await this.fetchAppointments();
                    await this.fetchDashboardStats();
                } else {
                    const data = await res.json();
                    alert(data.message || 'Error cancelling appointment');
                }
            } catch (e) {
                console.error('Error cancelling appointment:', e);
                alert('Error cancelling appointment. Please try again.');
            }
        },
        logout() {
            localStorage.clear();
            this.$router.push('/');
        }
    }
});

// --- COMPONENT: PATIENT DASHBOARD ---
app.component('patient-dash', {
    template: `
    <div>
        <nav class="navbar navbar-dark bg-info p-3">
            <div class="container-fluid">
                <span class="navbar-brand mb-0 h1">
                    <i class="fas fa-user"></i> Patient Portal
                </span>
                <div>
                    <span class="text-light me-3">{{ userName }}</span>
                    <button @click="logout" class="btn btn-outline-light btn-sm">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        </nav>

        <div class="container-fluid mt-4">
            <!-- Patient Dashboard Content -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <h4>{{ dashboardStats.upcoming_appointments || 0 }}</h4>
                            <p>Upcoming Appointments</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <h4>{{ dashboardStats.completed_appointments || 0 }}</h4>
                            <p>Completed Appointments</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Treatment History Section -->
            <div class="card mb-4">
                <div class="card-header">
                    <div class="row">
                        <div class="col">
                            <h5><i class="fas fa-file-medical"></i> Treatment History</h5>
                        </div>
                        <div class="col-auto">
                            <button @click="exportTreatmentHistory" class="btn btn-success btn-sm" :disabled="exportingCSV">
                                <span v-if="exportingCSV" class="spinner-border spinner-border-sm me-2"></span>
                                <i v-else class="fas fa-download me-2"></i>
                                {{ exportingCSV ? 'Exporting...' : 'Export to CSV' }}
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <p class="text-muted">
                        Export your complete treatment history including appointments, diagnoses, prescriptions, and notes.
                        The export will be generated in the background and you'll be notified when ready.
                    </p>
                    <div v-if="exportMessage" class="alert alert-info mt-3">
                        {{ exportMessage }}
                    </div>
                </div>
            </div>

            <!-- Available Departments -->
            <div class="card">
                <div class="card-header">
                    <h5><i class="fas fa-hospital"></i> Available Departments</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div v-for="dept in departments" :key="dept.id" class="col-md-4 mb-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6>{{ dept.name }}</h6>
                                    <p class="text-muted small">{{ dept.description }}</p>
                                    <button @click="viewDoctors(dept.id, dept.name)" class="btn btn-sm btn-outline-primary">
                                        View Doctors
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Doctors Modal -->
            <div class="modal fade" id="doctorsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Doctors in {{ selectedDepartment }}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div v-if="loadingDoctors" class="text-center">
                                <div class="spinner-border" role="status"></div>
                                <p>Loading doctors...</p>
                            </div>
                            <div v-else>
                                <div v-if="departmentDoctors.length === 0" class="text-center text-muted">
                                    <p>No doctors available in this department.</p>
                                </div>
                                <div v-else class="row">
                                    <div v-for="doctor in departmentDoctors" :key="doctor.id" class="col-md-6 mb-3">
                                        <div class="card">
                                            <div class="card-body">
                                                <h6>{{ doctor.name }}</h6>
                                                <p class="text-muted small">{{ doctor.specialization }}</p>
                                                <p class="small"><strong>Experience:</strong> {{ doctor.experience_years }} years</p>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <span :class="doctor.available_today ? 'badge bg-success' : 'badge bg-secondary'">
                                                        {{ doctor.available_today ? 'Available Today' : 'Not Available' }}
                                                    </span>
                                                    <button 
                                                        @click="bookAppointment(doctor)"
                                                        :disabled="!doctor.available_today"
                                                        class="btn btn-sm btn-primary">
                                                        Book Appointment
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Book Appointment Modal -->
            <div class="modal fade" id="bookingModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Book Appointment with {{ selectedDoctor?.name }}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="submitAppointment">
                                <div class="mb-3">
                                    <label class="form-label">Date & Time</label>
                                    <input v-model="appointmentForm.datetime" type="datetime-local" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Reason for Visit</label>
                                    <textarea v-model="appointmentForm.reason" class="form-control" rows="3" placeholder="Describe your symptoms or reason for the appointment"></textarea>
                                </div>
                                <div class="d-flex justify-content-end">
                                    <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary" :disabled="bookingAppointment">
                                        <span v-if="bookingAppointment" class="spinner-border spinner-border-sm me-2"></span>
                                        {{ bookingAppointment ? 'Booking...' : 'Book Appointment' }}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            dashboardStats: {},
            departments: [],
            userName: localStorage.getItem('user_name') || 'Patient',
            selectedDepartment: '',
            departmentDoctors: [],
            loadingDoctors: false,
            selectedDoctor: null,
            appointmentForm: {
                datetime: '',
                reason: ''
            },
            bookingAppointment: false,
            exportingCSV: false,
            exportMessage: ''
        }
    },
    async mounted() {
        await this.fetchDashboardStats();
    },
    methods: {
        getAuthHeader() {
            return { 
                'Authentication-Token': localStorage.getItem('auth_token'),
                'Content-Type': 'application/json' 
            };
        },
        async fetchDashboardStats() {
            try {
                const res = await fetch('/api/patient/dashboard', { headers: this.getAuthHeader() });
                if (res.ok) {
                    const data = await res.json();
                    this.dashboardStats = data;
                    this.departments = data.departments || [];
                }
            } catch (e) {
                console.error('Error fetching dashboard stats:', e);
            }
        },
        async viewDoctors(departmentId, departmentName) {
            this.selectedDepartment = departmentName;
            this.loadingDoctors = true;
            this.departmentDoctors = [];
            
            try {
                const res = await fetch(`/api/doctors?department=${departmentId}`, { 
                    headers: this.getAuthHeader() 
                });
                if (res.ok) {
                    const data = await res.json();
                    this.departmentDoctors = data;
                } else {
                    console.error('Failed to fetch doctors');
                }
            } catch (e) {
                console.error('Error fetching doctors:', e);
            } finally {
                this.loadingDoctors = false;
            }
            
            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('doctorsModal'));
            modal.show();
        },
        bookAppointment(doctor) {
            this.selectedDoctor = doctor;
            this.appointmentForm = {
                datetime: '',
                reason: ''
            };
            
            // Hide doctors modal and show booking modal
            const doctorsModal = bootstrap.Modal.getInstance(document.getElementById('doctorsModal'));
            if (doctorsModal) doctorsModal.hide();
            
            setTimeout(() => {
                const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
                bookingModal.show();
            }, 300);
        },
        async submitAppointment() {
            if (!this.selectedDoctor || !this.appointmentForm.datetime) return;
            
            this.bookingAppointment = true;
            
            try {
                const res = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: this.getAuthHeader(),
                    body: JSON.stringify({
                        doctor_id: this.selectedDoctor.id,
                        date_time: this.appointmentForm.datetime,
                        reason: this.appointmentForm.reason
                    })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    alert('Appointment booked successfully!');
                    
                    // Hide modal and refresh dashboard
                    const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
                    if (modal) modal.hide();
                    
                    await this.fetchDashboardStats();
                } else {
                    alert(data.message || 'Failed to book appointment');
                }
            } catch (e) {
                console.error('Error booking appointment:', e);
                alert('Error booking appointment. Please try again.');
            } finally {
                this.bookingAppointment = false;
            }
        },
        async exportTreatmentHistory() {
            this.exportingCSV = true;
            this.exportMessage = '';
            
            try {
                const res = await fetch('/api/patient/export-csv', {
                    method: 'POST',
                    headers: this.getAuthHeader()
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    // For synchronous export (current implementation)
                    if (data.data) {
                        // Convert array data to CSV and download
                        this.downloadCSV(data.data);
                        this.exportMessage = data.message;
                    } else {
                        // For async Celery export (future enhancement)
                        this.exportMessage = 'Export started! You will be notified when ready.';
                    }
                } else {
                    alert(data.message || 'Failed to export treatment history');
                }
            } catch (e) {
                console.error('Error exporting treatment history:', e);
                alert('Error exporting data. Please try again.');
            } finally {
                this.exportingCSV = false;
            }
        },
        downloadCSV(csvData) {
            // Convert array to CSV string
            const csvString = csvData.map(row => 
                row.map(cell => `"${cell}"`).join(',')
            ).join('\n');
            
            // Create blob and download
            const blob = new Blob([csvString], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `treatment_history_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },
        logout() {
            localStorage.clear();
            this.$router.push('/');
        }
    }
});

// Use the router defined in router.js and mount the app
console.log('About to mount Vue app...');
console.log('Router:', router);
app.use(router);
console.log('Router attached to app');
const mountedApp = app.mount('#app');
console.log('Vue app mounted:', mountedApp);