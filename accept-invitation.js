// accept-invitation.js - Módulo para aceptar invitación y establecer contraseña

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('accept-invitation-form');
    const successMessage = document.getElementById('success-message');
    const acceptPanel = document.getElementById('accept-invitation-panel');
    const invalidTokenMessage = document.getElementById('invalid-token-message');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const fullNameInput = document.getElementById('full-name');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitButton = document.getElementById('accept-submit-btn');
    const togglePasswordBtn = document.getElementById('toggle-password');

    if (!form) return;

    // Verificar si hay un token en la URL (Supabase usa hash para tokens de seguridad)
    let accessToken = null;
    let refreshToken = null;
    let type = null;
    let invitationId = null;

    // Primero intentar obtener del hash (Supabase siempre usa hash para tokens)
    if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
        type = hashParams.get('type');
        
        // Verificar si hay errores en el hash
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');
        
        if (error || errorCode) {
            console.error('[Accept Invitation] Error en la URL:', { error, errorCode, errorDescription });
            acceptPanel.classList.add('hidden');
            invalidTokenMessage.classList.remove('hidden');
            
            // Personalizar mensaje según el error
            const errorMsg = invalidTokenMessage.querySelector('p');
            if (errorMsg) {
                if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
                    errorMsg.textContent = 'Este enlace de invitación ha expirado. Por favor, contacta al administrador para una nueva invitación.';
                } else if (error === 'access_denied') {
                    errorMsg.textContent = 'Acceso denegado. Este enlace de invitación no es válido.';
                } else {
                    errorMsg.textContent = `Error: ${errorDescription || error || 'El enlace de invitación no es válido o ha expirado.'}`;
                }
            }
            
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons({ root: invalidTokenMessage });
            }
            return;
        }
    }

    // También obtener invitation de query params (lo agregamos nosotros)
    const urlParams = new URLSearchParams(window.location.search);
    invitationId = urlParams.get('invitation'); // ID de la invitación de nuestra tabla

    // Si no hay token en el hash, intentar de query params (fallback)
    if (!accessToken) {
        accessToken = urlParams.get('access_token');
        refreshToken = urlParams.get('refresh_token');
        type = urlParams.get('type');
    }

    // Si no hay token o no es de tipo 'invite', mostrar error
    if (!accessToken || type !== 'invite') {
        acceptPanel.classList.add('hidden');
        invalidTokenMessage.classList.remove('hidden');
        
        // Personalizar mensaje
        const errorMsg = invalidTokenMessage.querySelector('p');
        if (errorMsg && !accessToken) {
            errorMsg.textContent = 'No se encontró un token de invitación válido en la URL.';
        }
        
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({ root: invalidTokenMessage });
        }
        return;
    }

    // Configurar sesión con el token de invitación
    (async () => {
        try {
            console.log('[Accept Invitation] Configurando sesión con token...');
            const { error } = await window.auth.sb.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
            });

            if (error) {
                console.error('[Accept Invitation] Error al configurar sesión:', error);
                
                // Si el error es de token expirado o inválido, mostrar mensaje específico
                if (error.message?.includes('expired') || error.message?.includes('invalid') || error.message?.includes('expired')) {
                    acceptPanel.classList.add('hidden');
                    invalidTokenMessage.classList.remove('hidden');
                    const errorMsg = invalidTokenMessage.querySelector('p');
                    if (errorMsg) {
                        errorMsg.textContent = 'Este enlace de invitación ha expirado. Por favor, contacta al administrador para una nueva invitación.';
                    }
                    if (typeof lucide !== 'undefined' && lucide.createIcons) {
                        lucide.createIcons({ root: invalidTokenMessage });
                    }
                    return;
                }
                
                throw error;
            }

            // Obtener información del usuario para pre-llenar el email si es posible
            const { data: { user } } = await window.auth.sb.auth.getUser();
            if (user && user.email) {
                console.log('[Accept Invitation] Usuario autenticado:', user.email);
            }
        } catch (error) {
            console.error('[Accept Invitation] Error al configurar sesión de invitación:', error);
            acceptPanel.classList.add('hidden');
            invalidTokenMessage.classList.remove('hidden');
            
            // Personalizar mensaje de error
            const errorMsg = invalidTokenMessage.querySelector('p');
            if (errorMsg) {
                const errorMessage = error.message || 'Error desconocido';
                if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
                    errorMsg.textContent = 'Este enlace de invitación ha expirado o no es válido. Por favor, contacta al administrador para una nueva invitación.';
                } else {
                    errorMsg.textContent = `Error al procesar la invitación: ${errorMessage}`;
                }
            }
            
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

    // Validación de contraseña en tiempo real
    function validatePasswordSimple() {
        const password = newPasswordInput.value;
        const confirm = confirmPasswordInput.value;
        const name = fullNameInput.value.trim();
        
        const hasLength = password.length >= 8;
        const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const passwordsMatch = password === confirm && password.length > 0;
        const hasName = name.length >= 2;

        // Actualizar indicadores visuales
        updateRequirement('req-length', hasLength);
        updateRequirement('req-case', hasCase);
        updateRequirement('req-number', hasNumber);
        updateRequirement('req-symbol', hasSymbol);

        const isValid = hasLength && hasCase && hasNumber && hasSymbol && passwordsMatch && hasName;
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

    // Agregar listeners para validación en tiempo real
    newPasswordInput?.addEventListener('input', validatePasswordSimple);
    confirmPasswordInput?.addEventListener('input', validatePasswordSimple);
    fullNameInput?.addEventListener('input', validatePasswordSimple);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = fullNameInput.value.trim();
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!fullName || fullName.length < 2) {
            showError('Por favor ingresa tu nombre completo');
            return;
        }

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
        buttonText.textContent = 'Creando cuenta...';
        hideError();

        try {
            // 1. Actualizar la contraseña del usuario
            const { error: passwordError } = await window.auth.sb.auth.updateUser({
                password: newPassword
            });

            if (passwordError) throw passwordError;

            // 2. Actualizar el perfil con el nombre completo
            const { data: { user } } = await window.auth.sb.auth.getUser();
            if (user) {
                // Actualizar metadata del usuario
                const { error: metadataError } = await window.auth.sb.auth.updateUser({
                    data: {
                        full_name: fullName
                    }
                });

                if (metadataError) {
                    console.warn('Error al actualizar metadata, continuando:', metadataError);
                }

                // Actualizar el perfil en la tabla profiles
                const { error: profileError } = await window.auth.sb
                    .from('profiles')
                    .update({ full_name: fullName })
                    .eq('id', user.id);

                if (profileError) {
                    console.warn('Error al actualizar perfil, continuando:', profileError);
                }
            }

            // 3. Mostrar mensaje de éxito
            acceptPanel.classList.add('hidden');
            successMessage.classList.remove('hidden');
            
            // Inicializar iconos
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons({ root: successMessage });
            }

            // 4. Redirigir al dashboard con el parámetro de invitación
            const redirectUrl = invitationId 
                ? `/dashboard.html?invitation=${invitationId}`
                : '/dashboard.html';
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 2000);
        } catch (error) {
            console.error('Error al aceptar invitación:', error);
            const friendlyMessage = error.message.includes('expired') || error.message.includes('invalid')
                ? 'Este enlace ha expirado o no es válido. Por favor, contacta al administrador para una nueva invitación.'
                : error.message || 'Error al crear tu cuenta. Por favor intenta nuevamente.';
            showError(friendlyMessage);
            
            // Restaurar botón
            button.disabled = false;
            spinner.classList.add('hidden');
            buttonText.textContent = 'Aceptar Invitación';
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

