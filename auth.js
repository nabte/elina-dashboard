// auth.js - Módulo de Autenticación (Refactorizado)
const SB_URL = 'https://mytvwfbijlgbihlegmfg.supabase.co'; // URL de tu proyecto Supabase
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE';
const FUNCTIONS_BASE_URL = `${SB_URL}/functions/v1`;

function createSupabaseClient() {
  let impersonatedUserInfo = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
  let superadminSessionRaw = localStorage.getItem('superadmin_session_tokens');
  const authPaths = new Set(['/', '/index', '/index.html', '/forgot-password.html', '/reset-password.html']);
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



// Función segura para iniciar cliente
function tryCreateClient() {
  if (!window.supabase) {
    console.error('❌ Supabase SDK no cargó. Verifica tu conexión o el CDN.');
    alert('Error Crítico: No se pudo conectar con el servicio de base de datos (Supabase SDK missing).');
    return null;
  }
  return createSupabaseClient();
}

window.auth = {
  sb: tryCreateClient(),
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

    // DEFINICIÓN CRÍTICA: Qué páginas son de "Acceso Público" (Login/Register/Landing)
    // Si estás aquí y tienes sesión, te mandamos al dashboard.
    const currentPath = window.location.pathname;
    const isPublicPage =
      currentPath === '/' ||
      currentPath.endsWith('/index.html') ||
      currentPath.endsWith('/auth.html') ||
      currentPath.endsWith('/auth'); // Importante incluir todas las versiones

    // CASO 1: Usuario YA tiene sesión y está en página pública -> IR AL DASHBOARD
    if (session && isPublicPage) {
      console.log('[Auth] Usuario autenticado en página pública. Redirigiendo al dashboard...');

      // Verificación de perfil simplificada y robusta
      this.sb.from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (data?.role === 'superadmin') {
            window.location.href = '/dashboard.html';
          } else {
            // Para todos los demás, también al dashboard
            window.location.href = '/dashboard.html';
          }
        })
        .catch(() => window.location.href = '/dashboard.html'); // Fallback seguro
      return;
    }

    // CASO 2: Usuario NO tiene sesión (aparentemente) y NO está en página pública -> VERIFICAR ANTES DE ECHAR
    if (!session && !isPublicPage) {
      // NO REDIRIGIR AÚN. Preguntar a Supabase si realmente no hay sesión.
      // Esto evita el "parpadeo" o "kick" cuando la sesión carga un milisegundo tarde.
      this.sb.auth.getSession().then(({ data }) => {
        if (!data.session) {
          // Confirmado: No hay sesión. Ahora sí, fuera.
          console.warn('[Auth] Acceso denegado a ruta protegida. Redirigiendo a home.');
          window.location.href = '/';
        } else {
          // Falsa alarma: La sesión sí existía. Recuperamos el estado.
          console.log('[Auth] Sesión recuperada. Cancelando redirección.');
          this.session = data.session;
          document.dispatchEvent(new CustomEvent('auth:ready', { detail: { session: data.session } }));
        }
      }).catch((err) => {
        console.error('[Auth] Error verificando sesión:', err);
        window.location.href = '/';
      });
      return;
    }

    // Dispara un evento personalizado cuando la sesión está lista
    document.dispatchEvent(new CustomEvent('auth:ready', { detail: { session } }));
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

      // NOTA: El perfil y la suscripción se crean desde n8n (webhook volution-instance-create)
      // No creamos nada aquí, solo esperamos a que n8n lo haga

      if (data.user) {
        // Llamada al webhook de n8n para crear la instancia
        try {
          const n8nWebhookUrl = 'https://n8n-n8n.mcjhhb.easypanel.host/webhook/volution-instance-create';
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: name,
              email: email,
              telefono_admin: phone,
              Passwr: password // Nota: Enviar la contraseña así no es ideal, pero sigue el flujo de n8n.
            })
          });
        } catch (n8nError) {
          console.error("Error al llamar al webhook de n8n, pero el registro de usuario continuó:", n8nError);
          // No se detiene el flujo, pero se registra el error.
        }

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

// ==========================================
// IMPERSONATION TIMEOUT & AUDIT
// ==========================================

/**
 * Finaliza la impersonación actual y registra en auditoría
 */
async function endImpersonation() {
  try {
    const impersonatedInfo = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');
    const logId = impersonatedInfo?.logId;

    // Llamar a edge function para registrar ended_at
    if (logId && window.auth?.invokeFunction) {
      try {
        await window.auth.invokeFunction('end-impersonation', { body: { logId } });
        console.log('[Impersonation] Log finalizado:', logId);
      } catch (err) {
        console.warn('[Impersonation] Error al finalizar log:', err);
      }
    }

    // Restaurar sesión de superadmin
    const superadminTokens = JSON.parse(localStorage.getItem('superadmin_session_tokens') || 'null');
    if (superadminTokens?.access_token && superadminTokens?.refresh_token) {
      await window.auth.sb.auth.setSession({
        access_token: superadminTokens.access_token,
        refresh_token: superadminTokens.refresh_token
      });
    }

    // Limpiar localStorage
    localStorage.removeItem('impersonated_user_info');
    localStorage.removeItem('impersonation_timeout_id');

    // Redirigir a superadmin
    window.location.href = '/superadmin.html';
  } catch (error) {
    console.error('[Impersonation] Error al terminar impersonación:', error);
    // Forzar limpieza en caso de error
    localStorage.removeItem('impersonated_user_info');
    localStorage.removeItem('superadmin_session_tokens');
    localStorage.removeItem('impersonation_timeout_id');
    window.location.href = '/';
  }
}

/**
 * Verifica el timeout de impersonación y lo termina automáticamente si expiró
 */
function checkImpersonationTimeout() {
  const impersonatedInfo = JSON.parse(localStorage.getItem('impersonated_user_info') || 'null');

  if (!impersonatedInfo || !impersonatedInfo.startedAt) {
    return; // No hay impersonación activa
  }

  const startedAt = new Date(impersonatedInfo.startedAt);
  const now = new Date();
  const elapsedMinutes = (now - startedAt) / (1000 * 60);
  const timeoutMinutes = impersonatedInfo.timeoutMinutes || 30;

  if (elapsedMinutes >= timeoutMinutes) {
    console.log('[Impersonation] Timeout alcanzado, finalizando impersonación...');
    window.showToast?.('Sesión de impersonación expirada. Regresando a superadmin...', 'warning');
    setTimeout(() => endImpersonation(), 2000);
    return true; // Timeout alcanzado
  }

  // Calcular tiempo restante y mostrar warning si quedan menos de 5 minutos
  const remainingMinutes = timeoutMinutes - elapsedMinutes;
  if (remainingMinutes <= 5 && remainingMinutes > 4.5) {
    window.showToast?.(`⏰ La sesión de impersonación expirará en ${Math.ceil(remainingMinutes)} minutos`, 'warning', 5000);
  }

  return false; // Aún válido
}

// Exponer función globalmente para poder llamarla desde el banner
window.endImpersonation = endImpersonation;

// Verificar timeout cada minuto si hay impersonación activa
if (JSON.parse(localStorage.getItem('impersonated_user_info') || 'null')) {
  // Verificar inmediatamente al cargar
  checkImpersonationTimeout();

  // Verificar cada minuto
  setInterval(checkImpersonationTimeout, 60000);
}
