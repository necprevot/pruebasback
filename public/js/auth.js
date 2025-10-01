/**
 * Sistema de Autenticación Cliente - SIMPLIFICADO
 * Versión consolidada sin duplicación
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================
const AUTH = {
  ENDPOINTS: {
    LOGIN: '/api/sessions/login',
    REGISTER: '/api/users/register',
    CURRENT: '/api/sessions/current',
    LOGOUT: '/api/sessions/logout',
    FORGOT_PASSWORD: '/api/sessions/forgot-password',
    RESET_PASSWORD: '/api/sessions/reset-password'
  },
  
  STORAGE: {
    TOKEN: 'bbfermentos_auth_token',
    USER: 'bbfermentos_user_data',
    REDIRECT: 'bbfermentos_redirect_after_login'
  }
};

// ==========================================
// GESTIÓN DE TOKENS Y STORAGE
// ==========================================
const Storage = {
  saveAuth(token, userData) {
    localStorage.setItem(AUTH.STORAGE.TOKEN, token);
    if (userData) {
      localStorage.setItem(AUTH.STORAGE.USER, JSON.stringify(userData));
    }
  },
  
  getToken() {
    return localStorage.getItem(AUTH.STORAGE.TOKEN);
  },
  
  getUser() {
    const userData = localStorage.getItem(AUTH.STORAGE.USER);
    return userData ? JSON.parse(userData) : null;
  },
  
  clear() {
    localStorage.removeItem(AUTH.STORAGE.TOKEN);
    localStorage.removeItem(AUTH.STORAGE.USER);
  },
  
  isAuthenticated() {
    return !!this.getToken();
  }
};

// ==========================================
// VALIDACIONES
// ==========================================
const Validators = {
  email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  passwordStrength(password) {
    if (password.length < 6) return { level: 'weak', message: 'Muy débil' };
    if (password.length < 8) return { level: 'fair', message: 'Regular' };
    
    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score >= 3) return { level: 'strong', message: 'Fuerte ✅' };
    if (score >= 2) return { level: 'medium', message: 'Buena' };
    return { level: 'fair', message: 'Regular' };
  }
};

// ==========================================
// UI HELPERS
// ==========================================
const UI = {
  showAlert(message, type = 'info', containerId = 'alertContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const classes = { success: 'alert-success', error: 'alert-danger', warning: 'alert-warning', info: 'alert-info' };
    
    container.innerHTML = `
      <div class="alert ${classes[type]}" style="margin-bottom: 15px;">
        ${icons[type]} ${message}
        <button onclick="this.parentElement.remove()" class="alert-close">&times;</button>
      </div>
    `;
    
    setTimeout(() => container.querySelector('.alert')?.remove(), 5000);
  },
  
  showFieldError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + 'Error');
    const field = document.getElementById(fieldId);
    
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    if (field) field.classList.add('error');
  },
  
  clearFieldError(fieldId) {
    const errorEl = document.getElementById(fieldId + 'Error');
    const field = document.getElementById(fieldId);
    
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    if (field) field.classList.remove('error');
  },
  
  clearAllErrors() {
    document.querySelectorAll('.field-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    document.querySelectorAll('.form-input').forEach(field => 
      field.classList.remove('error')
    );
  },
  
  setButtonLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    
    btn.disabled = loading;
    if (text) text.style.display = loading ? 'none' : 'inline';
    if (spinner) spinner.style.display = loading ? 'inline' : 'none';
  }
};

// ==========================================
// API CALLS
// ==========================================
const API = {
  async post(endpoint, data) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return { response, data: await response.json() };
  },
  
  async get(endpoint, token) {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return { response, data: await response.json() };
  }
};

// ==========================================
// AUTENTICACIÓN
// ==========================================
const Auth = {
  async login(email, password) {
    UI.clearAllErrors();
    UI.setButtonLoading('loginBtn', true);
    
    try {
      if (!Validators.email(email)) {
        UI.showFieldError('email', 'Email inválido');
        return;
      }
      
      const { response, data } = await API.post(AUTH.ENDPOINTS.LOGIN, { email, password });
      
      if (response.ok && data.status === 'success') {
        Storage.saveAuth(data.payload.token, data.payload.user);
        UI.showAlert('¡Login exitoso!', 'success');
        
        setTimeout(() => {
          const redirect = localStorage.getItem(AUTH.STORAGE.REDIRECT) || '/products';
          localStorage.removeItem(AUTH.STORAGE.REDIRECT);
          window.location.href = redirect;
        }, 1500);
      } else {
        UI.showAlert(data.message || 'Credenciales inválidas', 'error');
      }
    } catch (error) {
      UI.showAlert('Error de conexión', 'error');
    } finally {
      UI.setButtonLoading('loginBtn', false);
    }
  },
  
  async register(userData) {
    UI.clearAllErrors();
    UI.setButtonLoading('registerBtn', true);
    
    try {
      // Validaciones
      if (!Validators.email(userData.email)) {
        UI.showFieldError('email', 'Email inválido');
        return;
      }
      
      if (userData.password.length < 6) {
        UI.showFieldError('password', 'Mínimo 6 caracteres');
        return;
      }
      
      const { response, data } = await API.post(AUTH.ENDPOINTS.REGISTER, userData);
      
      if (response.ok && data.status === 'success') {
        UI.showAlert('¡Cuenta creada!', 'success');
        
        // Auto-login
        setTimeout(() => this.login(userData.email, userData.password), 1500);
      } else {
        UI.showAlert(data.message || 'Error al registrar', 'error');
      }
    } catch (error) {
      UI.showAlert('Error de conexión', 'error');
    } finally {
      UI.setButtonLoading('registerBtn', false);
    }
  },
  
  logout() {
    Storage.clear();
    UI.showAlert('Sesión cerrada', 'info');
    setTimeout(() => window.location.href = '/login', 1000);
  },
  
  updateUI() {
    const user = Storage.getUser();
    const isAuth = Storage.isAuthenticated();
    
    document.querySelectorAll('.auth-link').forEach(link => {
      const authRequired = link.dataset.authRequired === 'true';
      const roleRequired = link.dataset.roleRequired;
      
      if (authRequired) {
        if (isAuth && (!roleRequired || user?.role === roleRequired)) {
          link.style.display = 'inline';
          if (user && link.textContent.includes('Usuario')) {
            link.textContent = `👤 ${user.first_name}`;
          }
        } else {
          link.style.display = 'none';
        }
      } else {
        link.style.display = isAuth ? 'none' : 'inline';
      }
    });
  }
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Auto-inicializar formularios
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      await Auth.login(formData.get('email'), formData.get('password'));
    });
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      await Auth.register({
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        age: formData.get('age') ? parseInt(formData.get('age')) : undefined,
        password: formData.get('password')
      });
    });
  }
  
  Auth.updateUI();
});

// ==========================================
// API PÚBLICA
// ==========================================
window.BBAuth = {
  login: Auth.login,
  register: Auth.register,
  logout: Auth.logout,
  isAuthenticated: Storage.isAuthenticated,
  getUser: Storage.getUser,
  showAlert: UI.showAlert
};

console.log('🔐 Auth simplificado cargado');