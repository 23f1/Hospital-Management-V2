// Vue Router Configuration for Hospital Management System

// Define Components
const Login = { template: '<login-component></login-component>' }
const Register = { template: '<register-component></register-component>' }
const AdminDash = { template: '<admin-dash></admin-dash>' }
const DoctorDash = { template: '<doctor-dash></doctor-dash>' }
const PatientDash = { template: '<patient-dash></patient-dash>' }

// Define Routes
const routes = [
  { 
    path: '/', 
    name: 'login',
    component: Login,
    meta: { requiresGuest: true }
  },
  { 
    path: '/register', 
    name: 'register',
    component: Register,
    meta: { requiresGuest: true }
  },
  { 
    path: '/admin', 
    name: 'admin',
    component: AdminDash, 
    meta: { requiresAuth: true, role: 'admin' } 
  },
  { 
    path: '/doctor', 
    name: 'doctor',
    component: DoctorDash, 
    meta: { requiresAuth: true, role: 'doctor' } 
  },
  { 
    path: '/patient', 
    name: 'patient',
    component: PatientDash, 
    meta: { requiresAuth: true, role: 'patient' } 
  },
]

// Create Router
const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes,
})

// Navigation Guards (Security Check)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('user_role');
  const isAuthenticated = !!token;

  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      // Not logged in, redirect to login
      next({ name: 'login' });
      return;
    }
    
    // Check role authorization
    if (to.meta.role && to.meta.role !== role) {
      alert("Access denied! You don't have permission to access this page.");
      // Redirect to appropriate dashboard based on user role
      if (role === 'admin') {
        next({ name: 'admin' });
      } else if (role === 'doctor') {
        next({ name: 'doctor' });
      } else if (role === 'patient') {
        next({ name: 'patient' });
      } else {
        next({ name: 'login' });
      }
      return;
    }
  }
  
  // Check if route is for guests only (login, register)
  if (to.meta.requiresGuest && isAuthenticated) {
    // Already logged in, redirect to appropriate dashboard
    if (role === 'admin') {
      next({ name: 'admin' });
    } else if (role === 'doctor') {
      next({ name: 'doctor' });
    } else if (role === 'patient') {
      next({ name: 'patient' });
    } else {
      next();
    }
    return;
  }

  // All checks passed, proceed
  next();
});

// Handle browser back/forward button for logout
window.addEventListener('storage', (e) => {
  if (e.key === 'auth_token' && e.newValue === null) {
    // User logged out in another tab
    router.push({ name: 'login' });
  }
});