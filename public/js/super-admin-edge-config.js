// super-admin-edge-config.js
// Handles Edge Function configuration panel

let currentConfig = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    setupTabs();
    await loadConfig();
});

// Setup tab switching
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// Load configuration from backend
async function loadConfig() {
    try {
        showLoading(true);

        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) {
            showAlert('error', 'No estás autenticado. Por favor inicia sesión.');
            return;
        }

        const response = await fetch(`${window.supabase.supabaseUrl}/functions/v1/get-edge-config`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar configuración');
        }

        currentConfig = await response.json();
        populateForm(currentConfig);
        showLoading(false);
        document.getElementById('config-panel').style.display = 'block';

    } catch (error) {
        console.error('Error loading config:', error);
        showAlert('error', 'Error al cargar la configuración: ' + error.message);
        showLoading(false);
    }
}

// Populate form with current configuration
function populateForm(config) {
    // Prompts tab
    document.getElementById('base-prompt').value = config.base_prompt || '';
    document.getElementById('personality-context').value = config.personality_context || '';
    document.getElementById('placeholder-instructions').value = config.placeholder_instructions || '';
    document.getElementById('appointment-rules').value = config.appointment_rules || '';

    // Flow tab
    document.getElementById('enable-appointment').checked = config.enable_appointment_detection !== false;
    document.getElementById('enable-critical').checked = config.enable_critical_detection !== false;
    document.getElementById('enable-product').checked = config.enable_product_detection !== false;
    document.getElementById('enable-quote').checked = config.enable_quote_detection !== false;
    document.getElementById('enable-sentiment').checked = config.enable_sentiment_analysis !== false;
    document.getElementById('enable-preferences').checked = config.enable_user_preferences === true;

    // Params tab
    document.getElementById('llm-model').value = config.llm_model || 'gpt-5-nano-2025-08-07';
    document.getElementById('max-tokens').value = config.max_tokens || 2000;
    document.getElementById('temperature').value = config.temperature || 0.7;
    document.getElementById('inventory-mode').value = config.inventory_injection_mode || 'conditional';
}

// Save prompts
async function savePrompts() {
    const updates = {
        base_prompt: document.getElementById('base-prompt').value || null,
        personality_context: document.getElementById('personality-context').value || null,
        placeholder_instructions: document.getElementById('placeholder-instructions').value || null,
        appointment_rules: document.getElementById('appointment-rules').value || null
    };

    await saveConfig(updates, 'Prompts guardados correctamente');
}

// Save flow configuration
async function saveFlow() {
    const updates = {
        enable_appointment_detection: document.getElementById('enable-appointment').checked,
        enable_critical_detection: document.getElementById('enable-critical').checked,
        enable_product_detection: document.getElementById('enable-product').checked,
        enable_quote_detection: document.getElementById('enable-quote').checked,
        enable_sentiment_analysis: document.getElementById('enable-sentiment').checked,
        enable_user_preferences: document.getElementById('enable-preferences').checked
    };

    await saveConfig(updates, 'Configuración de flujo guardada correctamente');
}

// Save parameters
async function saveParams() {
    const updates = {
        llm_model: document.getElementById('llm-model').value,
        max_tokens: parseInt(document.getElementById('max-tokens').value),
        temperature: parseFloat(document.getElementById('temperature').value),
        inventory_injection_mode: document.getElementById('inventory-mode').value
    };

    await saveConfig(updates, 'Parámetros guardados correctamente');
}

// Generic save configuration function
async function saveConfig(updates, successMessage) {
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) {
            showAlert('error', 'No estás autenticado. Por favor inicia sesión.');
            return;
        }

        const response = await fetch(`${window.supabase.supabaseUrl}/functions/v1/update-edge-config`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Error al guardar configuración');
        }

        const result = await response.json();

        if (result.success) {
            showAlert('success', successMessage);
            // Reload config to reflect changes
            await loadConfig();
        } else {
            throw new Error('Error al guardar');
        }

    } catch (error) {
        console.error('Error saving config:', error);
        showAlert('error', 'Error al guardar: ' + error.message);
    }
}

// Restore default configuration
async function restoreDefaults() {
    if (!confirm('¿Estás seguro de que quieres restaurar los valores por defecto? Esto eliminará todos los prompts personalizados.')) {
        return;
    }

    const updates = {
        base_prompt: null,
        personality_context: null,
        placeholder_instructions: null,
        appointment_rules: null
    };

    await saveConfig(updates, 'Configuración restaurada a valores por defecto');
}

// Show/hide loading indicator
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Show alert message
function showAlert(type, message) {
    const alert = document.getElementById('alert');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    alert.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// Make functions globally available
window.savePrompts = savePrompts;
window.saveFlow = saveFlow;
window.saveParams = saveParams;
window.restoreDefaults = restoreDefaults;
