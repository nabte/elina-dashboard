// reset-password.js - Módulo para restablecer contraseña

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-password-form');
    const successMessage = document.getElementById('success-message');
    const resetPanel = document.getElementById('reset-password-panel');
    const invalidTokenMessage = document.getElementById('invalid-token-message');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitButton = document.getElementById('reset-submit-btn');
    const togglePasswordBtn = document.getElementById('toggle-password');

    if (!form) return;

    // Verificar si hay un token en la URL (puede venir en query params o hash)
    let accessToken = null;
    let refreshToken = null;
    let type = null;

    // Intentar obtener de query params primero
    const urlParams = new URLSearchParams(window.location.search);
    accessToken = urlParams.get('access_token');
    refreshToken = urlParams.get('refresh_token');
    type = urlParams.get('type');

    // Si no está en query params, intentar del hash (Supabase a veces usa hash)
    if (!accessToken && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
        type = hashParams.get('type');
    }

    // Si no hay token o no es de tipo 'recovery', mostrar error
    if (!accessToken || type !== 'recovery') {
        resetPanel.classList.add('hidden');
        invalidTokenMessage.classList.remove('hidden');
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({ root: invalidTokenMessage });
        }
        return;
    }

    // Configurar sesión con el token de recuperación
    (async () => {
        try {
            const { error } = await window.auth.sb.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Error al configurar sesión de recuperación:', error);
            resetPanel.classList.add('hidden');
            invalidTokenMessage.classList.remove('hidden');
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons({ root: invalidTokenMessage });
            }
            return;
        }
    })();

    // Toggle para mostrar/ocultar contraseña
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = newPasswordInput.type === 'password';
            newPasswordInput.type = isPassword ? 'text' : 'password';
            const eyeIcon = document.getElementById('eye-icon');
            const eyeOffIcon = document.getElementById('eye-off-icon');
            if (eyeIcon && eyeOffIcon) {
                eyeIcon.classList.toggle('hidden', !isPassword);
                eyeOffIcon.classList.toggle('hidden', isPassword);
            }
        });
    }

    // Validación de contraseña en tiempo real (reutilizar lógica de registro)
    if (newPasswordInput && typeof window.validatePassword === 'function') {
        newPasswordInput.addEventListener('input', () => {
            const isValid = window.validatePassword(newPasswordInput.value);
            submitButton.disabled = !isValid || newPasswordInput.value !== confirmPasswordInput.value;
        });
    } else {
        // Validación simple si no existe la función global
        newPasswordInput?.addEventListener('input', validatePasswordSimple);
        confirmPasswordInput?.addEventListener('input', validatePasswordSimple);
    }

    function validatePasswordSimple() {
        const password = newPasswordInput.value;
        const confirm = confirmPasswordInput.value;
        
        const hasLength = password.length >= 8;
        const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const passwordsMatch = password === confirm && password.length > 0;

        // Actualizar indicadores visuales
        updateRequirement('req-length', hasLength);
        updateRequirement('req-case', hasCase);
        updateRequirement('req-number', hasNumber);
        updateRequirement('req-symbol', hasSymbol);

        const isValid = hasLength && hasCase && hasNumber && hasSymbol && passwordsMatch;
        submitButton.disabled = !isValid;
    }

    function updateRequirement(reqId, isValid) {
        const reqEl = document.getElementById(reqId);
        if (!reqEl) return;
        const failIcon = reqEl.querySelector('.icon-fail');
        const successIcon = reqEl.querySelector('.icon-success');
        if (isValid) {
            reqEl.classList.remove('text-red-500');
            reqEl.classList.add('text-green-500');
            if (failIcon) failIcon.classList.add('hidden');
            if (successIcon) successIcon.classList.remove('hidden');
        } else {
            reqEl.classList.remove('text-green-500');
            reqEl.classList.add('text-red-500');
            if (failIcon) failIcon.classList.remove('hidden');
            if (successIcon) successIcon.classList.add('hidden');
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({ root: reqEl });
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {
            showError('Las contraseñas no coinciden');
            return;
        }

        const button = form.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('.button-text');
        const spinner = button.querySelector('.loading-spinner');
        
        // Mostrar loading
        button.disabled = true;
        spinner.classList.remove('hidden');
        buttonText.textContent = 'Actualizando...';
        hideError();

        try {
            const { error } = await window.auth.sb.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            // Mostrar mensaje de éxito
            resetPanel.classList.add('hidden');
            successMessage.classList.remove('hidden');
            
            // Inicializar iconos
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons({ root: successMessage });
            }

            // Redirigir después de 3 segundos
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            const friendlyMessage = error.message.includes('expired') || error.message.includes('invalid')
                ? 'Este enlace ha expirado o no es válido. Por favor, solicita un nuevo enlace de recuperación.'
                : 'Error al actualizar la contraseña. Por favor intenta nuevamente.';
            showError(friendlyMessage);
            
            // Restaurar botón
            button.disabled = false;
            spinner.classList.add('hidden');
            buttonText.textContent = 'Restablecer Contraseña';
        }
    });

    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({ root: errorMessage });
        }
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    // Inicializar iconos
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});

