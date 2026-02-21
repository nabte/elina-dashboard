// forgot-password.js - Módulo para recuperar contraseña

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const successMessage = document.getElementById('success-message');
    const requestPanel = document.getElementById('request-reset-panel');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('reset-email')?.value.trim();
        if (!email) {
            showError('Por favor ingresa tu correo electrónico');
            return;
        }

        const button = form.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('.button-text');
        const spinner = button.querySelector('.loading-spinner');
        
        // Mostrar loading
        button.disabled = true;
        spinner.classList.remove('hidden');
        buttonText.textContent = 'Enviando...';
        hideError();

        try {
            // Usar el origen actual para que funcione en desarrollo y producción
            const redirectUrl = `${window.location.origin}/reset-password.html`;

            const { error } = await window.auth.sb.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;

            // Mostrar mensaje de éxito
            requestPanel.classList.add('hidden');
            successMessage.classList.remove('hidden');
            
            // Inicializar iconos
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons({ root: successMessage });
            }
        } catch (error) {
            console.error('Error al enviar correo de recuperación:', error);
            const friendlyMessage = error.message === 'User not found' 
                ? 'No encontramos una cuenta con ese correo electrónico.'
                : 'Error al enviar el correo. Por favor intenta nuevamente.';
            showError(friendlyMessage);
            
            // Restaurar botón
            button.disabled = false;
            spinner.classList.add('hidden');
            buttonText.textContent = 'Enviar Enlace de Recuperación';
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

