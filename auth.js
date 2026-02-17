// auth.js - Módulo de Autenticación (Refactorizado)
const SB_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co'; // URL de tu proyecto Supabase
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';
const FUNCTIONS_BASE_URL = `${SB_URL}/functions/v1`;

function createSupabaseClient() {
  let impersonatedUserInfo = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
  let superadminSessionRaw = localStorage.getItem('superadmin_session_tokens');
  const authPaths = new Set(['/', '/index', '/index.html', '/auth.html', '/forgot-password.html', '/reset-password.html']);
  const currentPath = (() => {
    const rawPath = window.location.pathname || '/';
    const [pathOnly] = rawPath.split('?');
    const trimmed = pathOnly.replace(/\/+$/, '') || '/';
    return trimmed === '' ? '/' : trimmed;
  })();
  const onAuthPage = authPaths.has(currentPath);
  let options = {};
  let superadminTokens = null;

  if (superadminSessionRaw) {
    try {
      superadminTokens = JSON.parse(superadminSessionRaw);
    } catch (err) {
      console.warn('[auth] Tokens de superadmin corruptos. Se eliminan.', err);
      localStorage.removeItem('superadmin_session_tokens');
    }
  }

  if (impersonatedUserInfo && (!superadminTokens || !superadminTokens.access_token || !superadminTokens.refresh_token || onAuthPage)) {
    localStorage.removeItem('impersonated_user_info');
    impersonatedUserInfo = null;
  }

  if (onAuthPage && superadminSessionRaw) {
    localStorage.removeItem('superadmin_session_tokens');
    superadminSessionRaw = null;
    superadminTokens = null;
  }

  if (!onAuthPage && impersonatedUserInfo && superadminTokens?.access_token && superadminTokens?.refresh_token) {
    console.log(`Modo suplantación activo. Actuando como: ${impersonatedUserInfo.id}`);
    options = {
      global: {
        headers: {
          'X-Impersonated-User-ID': impersonatedUserInfo.id
        }
      }
    };
  }

  return window.supabase.createClient(SB_URL, SB_KEY, options);
}



window.auth = {
  sb: createSupabaseClient(), // CORRECCIÓN: Usar la función createSupabaseClient
  session: null,
  /**
   * Invoca una Edge Function evitando encabezados de suplantacion.
   * Replica la forma { data, error } de supabase-js.
   */
  async invokeFunction(functionName, { method = 'POST', body, headers = {}, signal } = {}) {
    const requestHeaders = {
      Accept: 'application/json',
      apikey: SB_KEY,
      ...headers,
    };

    let requestBody;
    if (body !== undefined) {
      if (body instanceof FormData || body instanceof Blob) {
        requestBody = body;
      } else if (typeof body === 'string') {
        requestBody = body;
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
      } else {
        requestBody = JSON.stringify(body);
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    const { data: sessionData, error: sessionError } = await this.sb.auth.getSession();
    if (sessionError) {
      console.error('[invokeFunction] Error obteniendo la sesion actual:', sessionError);
    }

    const accessToken = sessionData?.session?.access_token;
    if (accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
      method,
      headers: requestHeaders,
      body: method === 'GET' || method === 'HEAD' ? undefined : requestBody,
      signal,
    });

    const rawText = await response.text();
    let parsedBody = null;
    if (rawText) {
      try {
        parsedBody = JSON.parse(rawText);
      } catch {
        parsedBody = rawText;
      }
    }

    if (!response.ok) {
      const message =
        (parsedBody && typeof parsedBody === 'object'
          ? parsedBody.error || parsedBody.message
          : null) || `Function ${functionName} respondio con estado ${response.status}`;

      return {
        data: null,
        error: {
          message,
          status: response.status,
          details: parsedBody,
        },
      };
    }

    return { data: parsedBody, error: null };
  },

  // --- MANEJO DE SESIÓN ---
  handleAuthStateChange(event, session) {
    this.session = session;
    const path = window.location.pathname;

    // Páginas públicas de autenticación/landing donde si hay sesión, debemos sacar al usuario
    const isPublicAuthPage = path === '/' || path.endsWith('/index.html') || path.endsWith('/auth.html') || path.endsWith('/auth');

    // Solo redirigir si es necesario
    if (session && isPublicAuthPage) {
      console.log('[Auth] Usuario autenticado en página pública. Redirigiendo a dashboard...');
      // Primero verificar si es superadmin
      this.sb.from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        .then(({ data: profileData, error: profileError }) => {
          // Si es superadmin, redirigir a dashboard (no a company-admin)
          if (profileData && profileData.role === 'superadmin') {
            window.location.href = '/dashboard.html';
            return;
          }

          // Si no es superadmin, verificar rol de equipo
          this.sb.rpc('get_user_team_info')
            .then(({ data, error }) => {
              if (error) {
                console.warn('Error fetching team info (usuario nuevo o sin equipo):', error.message);
                // Delay para asegurar persistencia
                setTimeout(() => window.location.href = '/dashboard.html', 500);
                return;
              }

              // La función devuelve user_role, no role
              const userRole = data?.user_role || data?.role;

              // Solo redirigir a company-admin si es admin de empresa Y el archivo existe
              // Por ahora, redirigir siempre a dashboard para evitar 404
              if (data && userRole === 'admin') {
                console.log('Usuario es admin de empresa, pero redirigiendo a dashboard por seguridad');
                setTimeout(() => window.location.href = '/dashboard.html', 500);
              } else {
                setTimeout(() => window.location.href = '/dashboard.html', 500);
              }
            })
            .catch((err) => {
              console.warn('No se pudo obtener info del equipo (probablemente usuario nuevo):', err.message);
              setTimeout(() => window.location.href = '/dashboard.html', 500);
            });
        })
        .catch((err) => {
          console.error('Error checking profile:', err);
          setTimeout(() => window.location.href = '/dashboard.html', 500);
        });
      return;
    }
    // --- LÓGICA DE RUTAS PROTEGIDAS ---
    const protectedRoutes = ['/dashboard.html', '/dashboard', '/settings.html', '/settings', '/chats.html', '/chats', '/appointments.html', '/appointments'];
    const isProtectedRoute = protectedRoutes.some(r => path.endsWith(r));

    // Si no hay sesión Y estamos en una ruta protegida
    if (!session && isProtectedRoute) {
      console.log('[Auth] Ruta protegida sin sesión visible. Verificando persistencia...');
      // Intento final para recuperar la sesión antes de expulsar
      this.sb.auth.getSession().then(({ data }) => {
        if (!data.session) {
          console.warn('[Auth] No active session found on protected page. Redirecting to home.');
          window.location.href = '/';
        } else {
          console.log('[Auth] Session recovered manually after event miss.');
          // Si la recuperamos, actualizamos el estado local
          this.session = data.session;
          document.dispatchEvent(new CustomEvent('auth:ready', { detail: { session: data.session } }));
          this.checkAndTriggerOnboarding(data.session.user);
        }
      }).catch(err => {
        console.error('[Auth] Error verifying session:', err);
        window.location.href = '/';
      });
      return;
    }

    // Dispara un evento personalizado cuando la sesión está lista
    document.dispatchEvent(new CustomEvent('auth:ready', { detail: { session } }));

    // Verificar si el usuario necesita onboarding (solo si no estamos en dashboard y acabamos de loguearnos)
    if (session && !onAuthPage) {
      this.checkAndTriggerOnboarding(session.user);
    }
  },

  onboardingInProgress: new Set(), // Track ongoing onboarding by user ID

  async checkAndTriggerOnboarding(user) {
    try {
      // Prevenir ejecuciones duplicadas para el mismo usuario
      if (this.onboardingInProgress.has(user.id)) {
        console.log('[Onboarding Check] Already in progress for user:', user.id);
        return;
      }

      // Verificar si el perfil ya tiene un slug generado (indicador de que el onboarding basico paso)
      const { data: profile, error } = await this.sb
        .from('profiles')
        .select('slug, evolution_instance_name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('[Onboarding Check] Error fetching profile:', error);
        return;
      }

      // Si no tiene instancia, intentamos correr el onboarding
      if (!profile.evolution_instance_name) {
        console.log('[Onboarding Check] User missing instance. Triggering onboarding...');

        // Marcar como en progreso
        this.onboardingInProgress.add(user.id);

        try {
          // Pasar solo el nombre base. La edge function generará el ID único.
          const baseName = user.user_metadata?.full_name || user.email.split('@')[0];

          await this.triggerOnboarding({
            name: baseName,
            email: user.email,
            phone: user.user_metadata?.phone || '' // OAuth might not provide phone
          });
        } finally {
          // Remover del set después de completar (éxito o error)
          this.onboardingInProgress.delete(user.id);
        }
      }
    } catch (err) {
      console.error('[Onboarding Check] Failed:', err);
      this.onboardingInProgress.delete(user.id);
    }
  },

  async triggerOnboarding({ name, email, phone }) {
    try {
      console.log('[Onboarding] Triggering for:', email);
      const { data, error } = await this.invokeFunction('onboarding-evolution', {
        body: {
          nombre: name,
          email: email,
          telefono_admin: phone
        }
      });

      if (error) {
        console.error('[Onboarding Error]', error);
        window.showToast('Error configurando tu cuenta. Contacta soporte.', 'error');
      } else {
        console.log('[Onboarding Success]', data);
        window.showToast('¡Cuenta configurada correctamente!', 'success');
        // Opcional: Recargar o redirigir para refrescar datos
      }
    } catch (err) {
      console.error('[Onboarding Exception]', err);
    }
  },

  getSession() {
    return this.session;
  },

  // --- ACCIONES DE FORMULARIO ---
  async handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;

    this.setLoadingState(form, true, 'Verificando...');

    try {
      if (!email || !password) throw new Error('Credenciales incompletas');

      const { error } = await this.sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // La redirección la maneja onAuthStateChange
    } catch (error) {
      const friendlyMessage = error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message;
      this.setLoadingState(form, false, 'Iniciar Sesión', friendlyMessage);
    }
  },

  async handleGoogleLogin() {
    try {
      const { error } = await this.sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth.html`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('[Google Login Error]', error);
      const errorContainer = document.getElementById('error-message');
      const errorTextEl = document.getElementById('error-text');
      if (errorContainer && errorTextEl) {
        errorTextEl.textContent = 'Error iniciando sesión con Google: ' + error.message;
        errorContainer.style.display = 'flex';
      }
    }
  },

  async handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const email = document.getElementById('register-email')?.value;
    const password = document.getElementById('register-password')?.value;
    const name = document.getElementById('register-name')?.value;
    const phone = window.iti ? window.iti.getNumber() : document.getElementById('register-phone')?.value; // Obtener número internacional

    this.setLoadingState(form, true, 'Creando...');

    try {
      if (!email || !password || !name || !phone) throw new Error('Todos los campos son obligatorios.');

      const { data, error } = await this.sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
          }
        }
      });

      if (error) throw error;

      // NOTA: El onboarding se ejecuta automáticamente desde onAuthStateChange
      // para evitar llamadas duplicadas. No llamar aquí.

      if (data.user) {
        console.log('[Register] Usuario creado. El onboarding se ejecutará automáticamente.');

        // Ocultar formulario y mostrar mensaje de éxito
        form.style.display = 'none';
        const successMessage = document.getElementById('register-success-message');
        successMessage.classList.remove('hidden');
        lucide.createIcons({ nodes: [successMessage.querySelector('i')] });

      }

    } catch (error) {
      this.setLoadingState(form, false, 'Crear Cuenta', error.message);
    }
  },

  async handleLogout() {
    try {
      await this.sb.auth.signOut();
    } catch (error) {
      console.error('[Logout Error]', error);
    }
  },

  // --- HELPERS DE UI ---
  setLoadingState(form, isLoading, buttonText, errorMessage = null) {
    const button = form.querySelector('button[type="submit"]');
    const textSpan = button.querySelector('.button-text');
    const spinner = button.querySelector('.loading-spinner');
    const errorContainer = document.getElementById('error-message');
    const errorTextEl = document.getElementById('error-text');

    if (isLoading) {
      button.disabled = true;
      spinner.classList.remove('hidden');
      textSpan.textContent = buttonText;
      errorContainer.style.display = 'none';
    } else {
      button.disabled = false;
      spinner.classList.add('hidden');
      textSpan.textContent = buttonText;

      if (errorMessage) {
        errorTextEl.textContent = errorMessage;
        errorContainer.style.display = 'flex';
        console.error('[Auth Error]', errorMessage);
      } else {
        errorContainer.style.display = 'none';
      }
    }
  }
};

// --- INICIALIZACIÓN ---
// Escucha los cambios de estado de autenticación para manejar las redirecciones.
window.auth.sb.auth.onAuthStateChange((event, session) => {
  window.auth.handleAuthStateChange(event, session);
});

// --- FUNCIONES GLOBALES REUTILIZABLES ---

/**
 * Obtiene el ID del usuario actual de forma segura
 * @returns {Promise<string|null>} El ID del usuario o null si no está disponible
 */
window.getUserId = async () => {
  try {
    // Intentar obtener de la sesión en caché
    if (window.auth?.getSession) {
      const session = window.auth.getSession();
      if (session?.user?.id) return session.user.id;
    }

    // Intentar obtener de appInstance
    if (window.appInstance?.user?.id) {
      return window.appInstance.user.id;
    }

    // Intentar obtener de localStorage (impersonación)
    const impersonatedUser = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
    if (impersonatedUser?.id) return impersonatedUser.id;

    // Intentar obtener de Supabase directamente
    if (window.auth?.sb) {
      const { data: sessionData, error } = await window.auth.sb.auth.getSession();
      if (!error && sessionData?.session?.user?.id) {
        return sessionData.session.user.id;
      }
    }

    return null;
  } catch (error) {
    console.error('[getUserId] Error al obtener ID de usuario:', error);
    return null;
  }
};

/**
 * Obtiene el email del usuario actual de forma segura
 * @returns {Promise<string|null>} El email del usuario o null si no está disponible
 */
window.getUserEmail = async () => {
  try {
    // Intentar obtener de la sesión en caché
    if (window.auth?.getSession) {
      const session = window.auth.getSession();
      if (session?.user?.email) return session.user.email;
    }

    // Intentar obtener de appInstance
    if (window.appInstance?.user?.email) {
      return window.appInstance.user.email;
    }

    // Intentar obtener de localStorage (impersonación)
    const impersonatedUser = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
    if (impersonatedUser?.email) return impersonatedUser.email;

    // Intentar obtener de Supabase directamente
    if (window.auth?.sb) {
      const { data: sessionData, error } = await window.auth.sb.auth.getSession();
      if (!error && sessionData?.session?.user?.email) {
        return sessionData.session.user.email;
      }
    }

    return null;
  } catch (error) {
    console.error('[getUserEmail] Error al obtener email de usuario:', error);
    return null;
  }
};

/**
 * Función auxiliar para asignar valores a elementos del DOM de forma segura
 * @param {string} id - ID del elemento
 * @param {any} value - Valor a asignar
 * @param {boolean} isCheckbox - Si es un checkbox
 */
window.setValue = (id, value, isCheckbox = false) => {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`[setValue] Elemento no encontrado: ${id}`);
    return;
  }
  if (isCheckbox) {
    element.checked = value;
  } else {
    element.value = value || '';
  }
};

// --- SISTEMA DE NOTIFICACIONES TOAST (GLOBAL) ---
let toastTimeout;

/**
 * Muestra una notificación toast.
 * @param {string} message - El mensaje a mostrar.
 * @param {'success' | 'error' | 'info'} type - El tipo de notificación.
 * @param {number} duration - Duración en milisegundos.
 */
window.showToast = (message, type = 'success', duration = 5000) => {
  const toast = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  if (!toast || !toastMessage || !toastIcon) return;

  if (toastTimeout) clearTimeout(toastTimeout); // CORRECCIÓN: Limpiar el timeout existente

  toastMessage.textContent = message;
  toast.classList.remove('bg-green-500', 'bg-red-500', 'bg-blue-500');
  toast.classList.remove('translate-y-[150%]'); // Asegurarse de que no esté oculto por la animación

  if (type === 'success') {
    toast.classList.add('bg-green-500');
    toastIcon.setAttribute('data-lucide', 'check-circle');
  } else if (type === 'error') {
    toast.classList.add('bg-red-500');
    toastIcon.setAttribute('data-lucide', 'alert-circle');
  } else {
    toast.classList.add('bg-blue-500');
    toastIcon.setAttribute('data-lucide', 'info');
  }
  lucide.createIcons(); // Re-renderizar iconos para el toast

  toast.classList.remove('hidden'); // Mostrar el toast
  toast.classList.remove('translate-x-[120%]'); // Asegurarse de que no esté oculto por la animación
  toastTimeout = setTimeout(() => toast.classList.add('translate-x-[120%]'), duration); // Ocultar después de la duración
};
