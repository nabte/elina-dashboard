// main.js - Lógica de la página de autenticación
// auth.js se carga como script tag en auth.html antes de este archivo

const initAuthParams = () => {
    console.log('[main.js] 🚀 Inicializando lógica de autenticación...');

    // --- Referencias ---
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const panelLogin = document.getElementById('login-panel');
    const panelRegister = document.getElementById('register-panel');
    const tabIndicator = document.getElementById('tab-indicator');
    const authTitle = document.getElementById('auth-title');
    if (authTitle) {
        // SEÑAL VISUAL DE DEPURACIÓN: Borde magenta = main.js cargó
        authTitle.style.borderLeft = "5px solid #ff00ff";
        authTitle.style.paddingLeft = "10px";
        console.log('[main.js] 🟣 Señal visual aplicada al título.');
    }
    const authSubtitle = document.getElementById('auth-subtitle');

    // --- Check for Password Reset Token ---
    const resetPasswordPanel = document.getElementById('reset-password-panel');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const resetSuccessMessage = document.getElementById('reset-success-message');

    // Check if URL has recovery token
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
        console.log('[Auth] Recovery token detected, showing reset password panel');

        // Parse hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && resetPasswordPanel) {
            // Hide all panels
            if (panelLogin) panelLogin.classList.add('hidden-panel');
            if (panelRegister) panelRegister.classList.add('hidden-panel');

            // Show reset password panel
            resetPasswordPanel.classList.remove('hidden-panel');
            resetPasswordPanel.classList.add('active-panel');

            // Update title
            if (authTitle) authTitle.textContent = 'Restablecer Contraseña';
            if (authSubtitle) authSubtitle.textContent = 'Ingresa tu nueva contraseña';

            // Set session with recovery token
            (async () => {
                try {
                    const { error } = await window.auth.sb.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (error) {
                        console.error('[Auth] Error setting recovery session:', error);
                        alert('El enlace de recuperación ha expirado. Por favor solicita uno nuevo.');
                        window.location.href = '/auth.html';
                    }
                } catch (err) {
                    console.error('[Auth] Error configuring recovery session:', err);
                }
            })();
        }
    }

    // Handle reset password form submission
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorMessage = document.getElementById('error-message');
            const errorText = document.getElementById('error-text');
            const button = resetPasswordForm.querySelector('button[type="submit"]');
            const buttonText = button.querySelector('.button-text');
            const spinner = button.querySelector('.loading-spinner');

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                if (errorMessage && errorText) {
                    errorText.textContent = 'Las contraseñas no coinciden';
                    errorMessage.classList.remove('hidden');
                }
                return;
            }

            // Validate password strength
            if (newPassword.length < 8) {
                if (errorMessage && errorText) {
                    errorText.textContent = 'La contraseña debe tener al menos 8 caracteres';
                    errorMessage.classList.remove('hidden');
                }
                return;
            }

            // Show loading
            button.disabled = true;
            spinner.classList.remove('hidden');
            buttonText.textContent = 'Actualizando...';
            if (errorMessage) errorMessage.classList.add('hidden');

            try {
                const { error } = await window.auth.sb.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;

                // Show success message
                resetPasswordForm.classList.add('hidden');
                resetSuccessMessage.classList.remove('hidden');

                // Initialize icons
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons({ root: resetSuccessMessage });
                }

                // Clear hash from URL
                window.history.replaceState(null, '', '/auth.html');
            } catch (error) {
                console.error('[Auth] Error updating password:', error);
                if (errorMessage && errorText) {
                    errorText.textContent = 'Error al actualizar la contraseña. Intenta nuevamente.';
                    errorMessage.classList.remove('hidden');
                }

                // Restore button
                button.disabled = false;
                spinner.classList.add('hidden');
                buttonText.textContent = 'Actualizar Contraseña';
            }
        });
    }

    // --- Tab Switching Logic ---
    function switchTab(mode) {
        if (mode === 'login') {
            // UI State
            tabLogin.classList.add('text-slate-700');
            tabLogin.classList.remove('text-slate-500');
            tabRegister.classList.add('text-slate-500');
            tabRegister.classList.remove('text-slate-700');

            // Indicator Animation (Left)
            tabIndicator.style.transform = 'translateX(0)';

            // Panel Visibility
            panelLogin.classList.remove('hidden-panel');
            panelLogin.classList.add('active-panel');
            panelRegister.classList.add('hidden-panel');
            panelRegister.classList.remove('active-panel');

            // Text Updates
            authTitle.textContent = 'Te damos la bienvenida';
            authSubtitle.textContent = 'Ingresa a tu cuenta para gestionar tu IA';
        } else {
            // UI State
            tabLogin.classList.add('text-slate-500');
            tabLogin.classList.remove('text-slate-700');
            tabRegister.classList.add('text-slate-700');
            tabRegister.classList.remove('text-slate-500');

            // Indicator Animation (Right)
            tabIndicator.style.transform = 'translateX(100%) translateX(8px)';

            // Panel Visibility
            panelRegister.classList.remove('hidden-panel');
            panelRegister.classList.add('active-panel');
            panelLogin.classList.add('hidden-panel');
            panelLogin.classList.remove('active-panel');

            // Text Updates
            authTitle.textContent = 'Crear una cuenta';
            authSubtitle.textContent = 'Prueba gratis por 7 días, sin compromiso';
        }
    }

    // Verificar que los elementos existan antes de agregar listeners
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => switchTab('login'));
        tabRegister.addEventListener('click', () => switchTab('register'));

        // Handle initial tab from URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tab') === 'register') {
            switchTab('register');
        } else {
            switchTab('login');
        }
    } else {
        console.warn('[main.js] Elementos de tabs no encontrados - probablemente no estamos en auth.html');
    }

    // --- Google Buttons ---
    const googleLoginBtn = document.getElementById('google-login-btn');
    const googleSignupBtn = document.getElementById('google-signup-btn');

    if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => window.auth.handleGoogleLogin());
    if (googleSignupBtn) googleSignupBtn.addEventListener('click', () => window.auth.handleGoogleLogin());

    // --- Forms ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('[main.js] ✅ Login form found. Attaching listener.');
        loginForm.addEventListener('submit', (e) => {
            console.log('[main.js] 🖱️ Login form submitted.');
            if (window.auth) {
                window.auth.handleLogin(e);
            } else {
                console.error('[main.js] ❌ Fatal: window.auth is not defined!');
                alert('Error interno: El módulo de autenticación no se cargó.');
            }
        });
    } else {
        console.error('[main.js] ⚠️ Login form element not found in DOM.');
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', (e) => window.auth.handleRegister(e));

    // --- Forgot Password Panel ---
    const showForgotPasswordBtn = document.getElementById('show-forgot-password');
    const backToLoginBtn = document.getElementById('back-to-login');
    const forgotPasswordPanel = document.getElementById('forgot-password-panel');
    const loginPanel = document.getElementById('login-panel');
    const registerPanel = document.getElementById('register-panel');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotSuccessMessage = document.getElementById('forgot-success-message');

    if (showForgotPasswordBtn) {
        showForgotPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginPanel.classList.add('hidden-panel');
            loginPanel.classList.remove('active-panel');
            forgotPasswordPanel.classList.remove('hidden-panel');
            forgotPasswordPanel.classList.add('active-panel');

            // Ocultar error message si existe
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) errorMessage.classList.add('hidden');
        });
    }

    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordPanel.classList.add('hidden-panel');
            forgotPasswordPanel.classList.remove('active-panel');
            loginPanel.classList.remove('hidden-panel');
            loginPanel.classList.add('active-panel');

            // Reset forgot password form
            if (forgotPasswordForm) forgotPasswordForm.reset();
            if (forgotSuccessMessage) forgotSuccessMessage.classList.add('hidden');
            if (forgotPasswordForm) forgotPasswordForm.classList.remove('hidden');
        });
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('reset-email').value.trim();
            if (!email) return;

            const button = forgotPasswordForm.querySelector('button[type="submit"]');
            const buttonText = button.querySelector('.button-text');
            const spinner = button.querySelector('.loading-spinner');
            const errorMessage = document.getElementById('error-message');
            const errorText = document.getElementById('error-text');

            // Show loading
            button.disabled = true;
            spinner.classList.remove('hidden');
            buttonText.textContent = 'Enviando...';
            if (errorMessage) errorMessage.classList.add('hidden');

            try {
                const redirectUrl = `${window.location.origin}/auth.html`;
                const { error } = await window.auth.sb.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectUrl,
                });

                if (error) throw error;

                // Show success message
                forgotPasswordForm.classList.add('hidden');
                forgotSuccessMessage.classList.remove('hidden');

                // Initialize icons
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons({ root: forgotSuccessMessage });
                }
            } catch (error) {
                console.error('Error al enviar correo de recuperación:', error);
                if (errorMessage && errorText) {
                    errorText.textContent = error.message === 'User not found'
                        ? 'No encontramos una cuenta con ese correo electrónico.'
                        : 'Error al enviar el correo. Por favor intenta nuevamente.';
                    errorMessage.classList.remove('hidden');
                }

                // Restore button
                button.disabled = false;
                spinner.classList.add('hidden');
                buttonText.textContent = 'Enviar Enlace de Recuperación';
            }
        });
    }

    // --- Toggle Password ---
    document.getElementById('toggle-password')?.addEventListener('click', () => {
        const passwordInput = document.getElementById('register-password');
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        document.getElementById('eye-icon').classList.toggle('hidden', !isPassword);
        document.getElementById('eye-off-icon').classList.toggle('hidden', isPassword);
    });

    // --- Validation Logic ---
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const registerButton = document.querySelector('#register-form button[type="submit"]');

    const reqs = {
        length: document.getElementById('req-length'),
        case: document.getElementById('req-case'),
        number: document.getElementById('req-number'),
        symbol: document.getElementById('req-symbol')
    };

    function validateForm() {
        const value = passwordInput.value;
        const validations = {
            length: value.length >= 8,
            case: /[a-z]/.test(value) && /[A-Z]/.test(value),
            number: /\d/.test(value),
            symbol: /[!@#$%^&*(),.?":{}|<>]/.test(value)
        };

        const isNameValid = nameInput.value.trim().length > 2;
        const isEmailValid = /^\S+@\S+\.\S+$/.test(emailInput.value);

        // Phone validation
        let isPhoneValid = false;
        if (window.iti) {
            isPhoneValid = window.iti.isValidNumber();
        } else {
            isPhoneValid = document.querySelector("#register-phone").value.length > 9;
        }

        // Update UI for Password Requirements
        for (const key in validations) {
            const el = reqs[key];
            const dot = el.querySelector('.status-dot');
            if (validations[key]) {
                el.classList.remove('text-slate-400');
                el.classList.add('text-emerald-600', 'font-medium');
                dot.classList.remove('bg-slate-300');
                dot.classList.add('bg-emerald-500');
            } else {
                el.classList.add('text-slate-400');
                el.classList.remove('text-emerald-600', 'font-medium');
                dot.classList.add('bg-slate-300');
                dot.classList.remove('bg-emerald-500');
            }
        }

        // Enable Button
        const isPasswordValid = Object.values(validations).every(Boolean);
        registerButton.disabled = !(isPasswordValid && isNameValid && isEmailValid && isPhoneValid);
    }

    [nameInput, emailInput, passwordInput, document.querySelector("#register-phone")].forEach(input => {
        if (input) input.addEventListener('input', validateForm);
    });

    // --- Plugin Initialization ---
    const safeInitializePlugins = () => {
        if (typeof window.lucide !== 'undefined' && typeof window.intlTelInput !== 'undefined') {
            lucide.createIcons();
            const phoneInput = document.querySelector("#register-phone");

            // Fix: Destroy existing instance if re-initializing to prevent duplicates if any
            if (window.iti) window.iti.destroy();

            const iti = window.intlTelInput(phoneInput, {
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
                initialCountry: "mx",
                separateDialCode: true,
                preferredCountries: ["mx", "co", "ar", "cl", "pe", "es", "us"]
            });
            window.iti = iti;

            // Re-validate on country change
            phoneInput.addEventListener('countrychange', validateForm);

            // Trigger initial validation
            validateForm();
        } else {
            setTimeout(safeInitializePlugins, 50);
        }
    };
    safeInitializePlugins();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthParams);
} else {
    initAuthParams();
}