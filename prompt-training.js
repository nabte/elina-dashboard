let currentPrompt = '';
let chatHistory = [];
let systemCapabilities = {};

// 🔄 NEW: Variables para persistencia de sesiones
let currentSessionId = null;  // UUID de la sesión actual
let loadedSessions = [];      // Lista de sesiones previas

// Lista de palabras clave para detectar límites del sistema
const limitKeywords = [
    /puedes borrar/i, /eliminar mensaje/i, /crear grupo/i, /campaña/i,
    /difundir/i, /masivo/i, /descargar reporte/i, /ver mis contactos/i,
    /editar contacto/i, /bloquear/i, /reportar/i, /spam/i
];

// Listener para activación de paneles
document.addEventListener('panel:activated', async (event) => {
    const { panelId, tabId, skipRender } = event.detail;

    if (skipRender) {
        //         console.log('[Prompt Training] Skipping render (internal event)');
        return;
    }

    // Si el panelId es prompt-training...
    if (panelId === 'prompt-training') {
        //         console.log('[Prompt Training] Panel activado, inicializando modo prompt...');
        await initPromptTraining('prompt', tabId);
    } else if (panelId === 'ai-memory') {
        //         console.log('[Prompt Training] Panel ai-memory activado, inicializando modo memory...');
        await initPromptTraining('memory', tabId);
    } else if (panelId === 'ai-flows') {
        //         console.log('[Prompt Training] Panel ai-flows activado...');
        await initPromptTraining('flows', tabId);
    }
});

async function initPromptTraining(mode = 'prompt', initialTabId = null) {
    const userId = await window.getUserId();
    if (!userId) {
        console.error('[Prompt Training] No user ID found');
        return;
    }

    const containerId = mode === 'memory' ? 'ai-memory-content' : (mode === 'flows' ? 'ai-flows-content' : 'prompt-training-content');
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`[Prompt Training] Container #${containerId} not found`);
        return;
    }

    // Renderizar UI según el modo
    if (mode === 'memory') {
        //         console.log('[Prompt Training] Rendering AI Memory UI');
        renderAiMemoryUI(container, initialTabId);
        await syncBusinessData(userId);
    } else if (mode === 'flows') {
        //         console.log('[Prompt Training] Rendering AI Flows UI');
        renderAiFlowsUI(container);
    } else {
        //         console.log('[Prompt Training] Rendering Prompt Editor UI');
        renderPromptEditorUI(container);
        await loadCurrentPrompt(userId);
        await loadSimulationSessions(userId);  // 🔄 NUEVO: cargar sesiones previas
        await loadOrCreateSession(userId);     // 🔄 NUEVO: cargar o crear sesión actual
        await loadSystemCapabilities();
        setupSimulationChatListeners(container);
    }
}

// Helper to render top-level tabs - DEPRECATED: Using global app.js group tabs
// function renderIAMindTabs(container, activeTab) { ... }

window.switchIAMindTab = async function (target) {
    // Redirect to global switchPanel for consistency
    const targetPanelId = target === 'memory' ? 'ai-memory' : 'prompt-training';
    if (window.app && window.app.switchPanel) {
        window.app.switchPanel(targetPanelId, { groupId: 'ai-behavior', tabId: targetPanelId });
    } else {
        // Fallback if app is not yet initialized
        const promptParent = document.getElementById('prompt-training');
        const memoryParent = document.getElementById('ai-memory');
        if (target === 'prompt') {
            if (promptParent) promptParent.style.display = 'block';
            if (memoryParent) memoryParent.style.display = 'none';
        } else {
            if (promptParent) promptParent.style.display = 'none';
            if (memoryParent) memoryParent.style.display = 'block';
        }
    }
}

function setupSimulationChatListeners(container) {
    // Escuchar Enter en el input
    const input = container.querySelector('#simulation-message-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.sendSimulationMessage();
            }
        });
    }

    // Botón Restaurar
    const restartBtn = container.querySelector('#restart-simulation-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', async () => {
            // 🔄 NUEVO: Usar función de nueva sesión
            if (!confirm('¿Iniciar nueva sesión? La sesión actual se guardará automáticamente.')) {
                return;
            }

            await startNewSession();
        });
    }
}

async function syncBusinessData(userId) {
    try {
        const { data, error } = await window.auth.sb
            .from('profiles')
            .select('company_description, website, business_address, business_phone')
            .eq('id', userId)
            .single();

        if (error) throw error;
        if (!data) return;

        const updateField = (id, val, placeholder = 'Sin definir') => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'brain-company-description') {
                    el.textContent = val || 'Aún no le has dicho a Elina de qué trata tu negocio. Ve a Configuración para completar esta información.';
                    if (!val) el.classList.add('text-slate-400');
                    else el.classList.remove('text-slate-400');
                } else {
                    el.textContent = val || placeholder;
                    if (!val) el.classList.add('text-slate-400');
                    else el.classList.remove('text-slate-400');
                }
            }
        };

        updateField('brain-company-description', data.company_description);
        updateField('brain-website', data.website, 'Sin sitio web');
        updateField('brain-address', data.business_address, 'No configurada');
        updateField('brain-phone', data.business_phone, 'No configurado');

        // Mock para la UI ya que la columna no existe en DB aún
        if (typeof data.business_type !== 'undefined') {
            let bType = 'Ambos';
            if (data.business_type === 'ecommerce') bType = 'E-commerce';
            if (data.business_type === 'services') bType = 'Servicios';
            const typeEl = document.getElementById('brain-business-type');
            if (typeEl) typeEl.textContent = bType;
        } else {
            const typeEl = document.getElementById('brain-business-type');
            if (typeEl) typeEl.textContent = 'No definido (Default)';
        }

        if (window.lucide) lucide.createIcons();

    } catch (err) {
        console.warn('[Prompt Training] Error syncing business data:', err);
    }
}

async function loadCurrentPrompt(userId) {
    try {
        const { data, error } = await window.auth.sb
            .from('prompts')
            .select('prompt_content, prompt_draft')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        currentPrompt = data?.prompt_content || '';
        // Cargar borrador si existe, si no el oficial
        const initialEditorContent = data?.prompt_draft || currentPrompt;

        const editor = document.getElementById('prompt-editor');
        if (editor) {
            editor.value = initialEditorContent;

            // 📊 NUEVO: Actualizar contador de caracteres
            updateCharacterCount();

            // 📊 NUEVO: Listener para actualizar contador en tiempo real
            editor.addEventListener('input', updateCharacterCount);
        }

        // Mostrar status si cargamos un borrador
        if (data?.prompt_draft) {
            const statusEl = document.getElementById('auto-save-status');
            if (statusEl) {
                statusEl.innerHTML = `<i data-lucide="info" class="w-3 h-3 text-blue-500"></i> Borrador cargado`;
                if (window.lucide) lucide.createIcons({ props: { element: statusEl } });
            }
        }

        await updatePromptVersionIndicator(userId);

        // Iniciar auto-guardado cada 5 min
        startAutoSave(userId);

    } catch (error) {
        console.error('[Prompt Training] Error al cargar prompt:', error);
        currentPrompt = '';
    }
}

/**
 * 📊 Actualiza el contador de caracteres del prompt del usuario
 */
function updateCharacterCount() {
    const editor = document.getElementById('prompt-editor');
    const counter = document.getElementById('prompt-char-count');

    if (!editor || !counter) return;

    const charCount = editor.value.length;
    const HARD_MAX = 2500; // 🔒 Límite DURO del prompt de usuario (bloqueado por maxlength)

    // Actualizar texto del contador
    counter.textContent = `${charCount} / 2,500 caracteres`;

    // Cambiar color según el límite
    if (charCount >= HARD_MAX) {
        counter.className = 'font-mono font-bold text-red-600';
        counter.textContent = `🔒 ${charCount} / 2,500 (MÁXIMO ALCANZADO)`;
    } else if (charCount > HARD_MAX * 0.9) { // > 2250
        counter.className = 'font-mono font-medium text-red-500';
        counter.textContent = `⚠️ ${charCount} / 2,500 (quedan ${HARD_MAX - charCount})`;
    } else if (charCount > HARD_MAX * 0.7) { // > 1750
        counter.className = 'font-mono font-medium text-amber-600';
        counter.textContent = `⚠️ ${charCount} / 2,500 (cerca del límite)`;
    } else if (charCount > HARD_MAX * 0.5) { // > 1250
        counter.className = 'font-mono font-medium text-blue-600';
        counter.textContent = `${charCount} / 2,500`;
    } else {
        counter.className = 'font-mono font-medium text-slate-600';
        counter.textContent = `${charCount} / 2,500 caracteres`;
    }
}

let autoSaveInterval = null;
function startAutoSave(userId) {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(async () => {
        const editor = document.getElementById('prompt-editor');
        if (!editor) return;
        const content = editor.value.trim();
        if (!content) return;

        try {
            await window.auth.sb.from('prompts').upsert({
                user_id: userId,
                prompt_draft: content,
                draft_updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

            // Actualizar UI del auto-guardado
            const statusEl = document.getElementById('auto-save-status');
            if (statusEl) {
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                statusEl.innerHTML = `<i data-lucide="check-circle" class="w-3 h-3 text-green-500"></i> Borrador guardado ${now}`;
                if (window.lucide) lucide.createIcons({ props: { element: statusEl } });
            }
        } catch (err) {
            console.error('[Prompt Training] Auto-save error:', err);
        }
    }, 5 * 60 * 1000);
}

async function updatePromptVersionIndicator(userId) {
    try {
        const { data: versionData, error } = await window.auth.sb
            .rpc('get_current_prompt_version', { p_user_id: userId });

        if (error) {
            // Si la función no existe aún, no mostrar error
            if (error.code !== '42883') { // 42883 = function does not exist
                console.warn('[Prompt Training] No se pudo obtener versión del prompt:', error);
            }
            return;
        }

        // Actualizar indicador en prompt-training si existe
        const versionIndicator = document.getElementById('prompt-training-version-indicator');
        if (versionIndicator && versionData && versionData.length > 0) {
            const version = versionData[0];
            versionIndicator.textContent = `v${version.version_number}`;
            versionIndicator.title = `Versión ${version.version_number} - ${new Date(version.created_at).toLocaleDateString()}`;
        }
    } catch (err) {
        console.warn('[Prompt Training] Error al actualizar indicador de versión:', err);
    }
}

async function loadSystemCapabilities() {
    // Documentación de capacidades del sistema Elina V4
    systemCapabilities = {
        modifiableWithPrompt: [
            'Personalidad y Tono',
            'Información del Negocio',
            'Reglas de Respuesta',
            'Formato de Presentación',
            'Contexto de Ventas',
            'Prioridades'
        ],
        systemCapabilities: [
            { name: 'Memoria Corto Plazo', modifiable: false, description: 'Ventana de 10 mensajes por sesión' },
            { name: 'Memoria Largo Plazo (RAG)', modifiable: false, description: 'Embeddings de mensajes anteriores, threshold 0.7, máx 3 mensajes' },
            { name: 'Transcripción de Audio', modifiable: false, description: 'Whisper de OpenAI' },
            { name: 'Descripción de Imágenes', modifiable: false, description: 'GPT-4o-mini analiza imágenes enviadas' },
            { name: 'Envío de Imágenes', modifiable: 'parcial', description: 'Puede enviar imágenes de productos' },
            { name: 'Envío de Videos', modifiable: 'parcial', description: 'Puede enviar videos' },
            { name: 'Envío de Audio', modifiable: true, description: 'Tag [AUDIO] para responder con voz' },
            { name: 'Búsqueda de Productos', modifiable: 'parcial', description: 'Herramienta ver_productos con búsqueda híbrida' },
            { name: 'Placeholders de Productos', modifiable: false, description: '[PRODUCT_NAME:ID], [PRODUCT_PRICE:ID], etc.' },
            { name: 'Generación de Cotizaciones', modifiable: false, description: 'PDF automático con 3+ productos o solicitud explícita' },
            { name: 'Promos Inteligentes', modifiable: false, description: 'Inyecta promociones activas al contexto' },
            { name: 'Detección de Críticos', modifiable: false, description: 'Detecta intenciones de compra urgente, quejas' },
            { name: 'Sistema de Citas', modifiable: false, description: 'Detecta intención, muestra slots disponibles' },
            { name: 'Pausar Seguimientos', modifiable: false, description: 'Pausa automática cuando cliente responde' },
            { name: 'Labels/Etiquetas', modifiable: false, description: 'Asignación automática de etiquetas' }
        ]
    };
}

function injectPromptStyles() {
    if (!document.getElementById('prompt-training-styles')) {
        const style = document.createElement('style');
        style.id = 'prompt-training-styles';
        style.textContent = `
            .prompt-training-container {
                animation: fadeIn 0.3s ease-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Dark theme for simulator section */
            .simulator-dark-theme {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
            }
            
            .simulator-dark-theme h3 {
                color: #f1f5f9;
            }
            
            .simulator-dark-theme label {
                color: #cbd5e1;
            }
            
            /* Chat container with fixed height */
            .simulator-chat-container {
                height: 520px;
                display: flex;
                flex-direction: column;
            }
            
            #simulation-chat-messages { 
                scroll-behavior: smooth;
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                background: #1e293b;
                border-radius: 8px;
            }
            
            /* Custom scrollbar for dark theme */
            #simulation-chat-messages::-webkit-scrollbar { 
                width: 8px; 
            }
            #simulation-chat-messages::-webkit-scrollbar-thumb { 
                background: #475569; 
                border-radius: 10px; 
            }
            #simulation-chat-messages::-webkit-scrollbar-thumb:hover { 
                background: #64748b; 
            }
            #simulation-chat-messages::-webkit-scrollbar-track { 
                background: #0f172a; 
                border-radius: 10px;
            }
            
            /* Message bubbles */
            .message-bubble-user {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border-radius: 16px 16px 4px 16px;
                padding: 12px 16px;
                max-width: 80%;
                box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
            }
            
            .message-bubble-assistant {
                background: #ffffff;
                color: #1e293b;
                border-radius: 16px 16px 16px 4px;
                padding: 12px 16px;
                max-width: 80%;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            
            /* Media rendering */
            .message-media-image {
                max-width: 100%;
                max-height: 300px;
                border-radius: 8px;
                margin-top: 8px;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .message-media-image:hover {
                transform: scale(1.02);
            }
            
            .message-media-video {
                max-width: 100%;
                max-height: 400px;
                border-radius: 8px;
                margin-top: 8px;
            }
            
            .message-media-link {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background: #f1f5f9;
                border-radius: 8px;
                margin-top: 8px;
                text-decoration: none;
                color: #0f172a;
                font-size: 0.875rem;
                transition: background 0.2s;
            }
            
            .message-media-link:hover {
                background: #e2e8f0;
            }
            
            .typing-indicator {
                display: flex;
                gap: 4px;
                padding: 12px 16px;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 16px 16px 16px 4px;
                width: fit-content;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .typing-indicator span {
                width: 6px;
                height: 6px;
                background: #94a3b8;
                border-radius: 50%;
                animation: bounce 1.4s infinite ease-in-out both;
            }
            .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
            .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
            @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

function renderPromptEditorUI(container) {
    injectPromptStyles();

    container.innerHTML = `
        <div class="space-y-6 prompt-training-container lg:h-full lg:flex lg:flex-col pb-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:flex-1 lg:min-h-0">
                <!-- Panel izquierdo: Editor de Prompt -->
                <div class="flex flex-col bg-white rounded-xl shadow-lg p-6 border border-slate-100 overflow-hidden h-full min-h-[600px] lg:min-h-0">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <h3 class="text-xl font-bold">Entrenamiento Prompt</h3>
                            <span id="prompt-training-version-indicator" 
                                  class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200"
                                  title="Versión actual">...</span>
                        </div>
                        <div id="auto-save-status" class="text-xs text-slate-400 italic"></div>
                    </div>
                    
                    <div class="flex-1 flex flex-col gap-4 min-h-0">
                        <div class="flex flex-col flex-1 min-h-0 bg-slate-50 rounded-lg border border-slate-200 p-2 overflow-hidden">
                            <!-- Barra de Acciones - Interna para no estorbar el texto -->
                            <div class="flex items-center justify-end gap-2 mb-2 p-1.5 bg-white rounded-md border border-slate-100 shadow-sm shrink-0">
                                <button onclick="resetPrompt()" class="p-2 text-slate-400 hover:text-slate-600 transition-all" title="Restaurar original">
                                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                                </button>
                                <div class="h-4 w-[1px] bg-slate-200 mx-1"></div>
                                <button onclick="saveDraftManual()" class="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-bold text-[11px] transition-all whitespace-nowrap">
                                    GUARDAR BORRADOR
                                </button>
                                <button onclick="savePrompt()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-bold text-[11px] transition-all whitespace-nowrap">
                                    PUBLICAR OFICIAL
                                </button>
                            </div>

                            <textarea id="prompt-editor"
                                maxlength="2500"
                                class="flex-1 w-full bg-slate-50 p-4 font-mono text-sm outline-none resize-none transition-all scroll-smooth"
                                placeholder="Escribe aquí las instrucciones para tu IA... (máximo 2,500 caracteres)"></textarea>

                            <!-- Contador de Caracteres -->
                            <div class="flex items-center justify-between px-4 py-2 bg-slate-100 border-t border-slate-200 text-xs shrink-0">
                                <span class="text-slate-500">Tamaño del prompt</span>
                                <span id="prompt-char-count" class="font-mono font-medium text-slate-600">0 caracteres</span>
                            </div>
                        </div>

                        <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 shrink-0 shadow-inner">
                            <label class="block text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                <i data-lucide="sparkles" class="w-4 h-4 text-blue-600"></i>
                                Mejorar con IA
                            </label>
                            <div class="flex gap-2 mb-3">
                                <input type="text" id="improvement-input"
                                    class="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                                    placeholder="Ej: 'Haz que sea más amable'...">
                                <button id="improve-prompt-btn" onclick="improvePromptWithAI()"
                                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-[11px] transition-all flex items-center gap-2 whitespace-nowrap shadow-md active:scale-95">
                                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                                    MEJORAR
                                </button>
                                <button onclick="document.getElementById('example-file-input').click()"
                                    class="p-2 text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-all shadow-sm" title="Subir ejemplo">
                                    <i data-lucide="paperclip" class="w-4 h-4"></i>
                                </button>
                            </div>
                            <!-- 🧠 Análisis Automático -->
                            <div class="border-t border-blue-200 pt-3">
                                <button onclick="analyzeAndImprovePrompt()"
                                    class="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 font-bold text-[11px] transition-all flex items-center justify-center gap-2 shadow-md active:scale-95">
                                    <i data-lucide="brain" class="w-4 h-4"></i>
                                    ANALIZAR EJEMPLOS Y MEJORAR PROMPT
                                </button>
                                <p class="text-xs text-blue-700 mt-2 text-center">Usa tus ejemplos guardados (👍👎) para optimizar automáticamente</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Panel derecho: Chat de Simulación -->
                <div class="flex flex-col simulator-dark-theme p-6 overflow-hidden h-full min-h-[600px] lg:min-h-0">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <h3 class="text-xl font-bold flex items-center gap-2 text-white">
                                Simulador de Chat
                                <span class="px-2 py-0.5 bg-green-500 bg-opacity-20 text-green-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-500 border-opacity-30">Sandbox</span>
                            </h3>
                            <!-- 📋 Dropdown de Sesiones -->
                            <div class="relative">
                                <button id="sessions-dropdown-btn" onclick="toggleSessionsDropdown()"
                                    class="flex items-center gap-2 px-3 py-1.5 bg-slate-700 bg-opacity-60 text-slate-300 hover:bg-slate-600 rounded-lg transition-all text-sm border border-slate-600">
                                    <i data-lucide="folder-open" class="w-4 h-4"></i>
                                    <span id="current-session-name" class="max-w-32 truncate">Sesión actual</span>
                                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                                </button>
                                <!-- Dropdown Menu -->
                                <div id="sessions-dropdown" class="hidden absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50">
                                    <div class="p-3 border-b border-slate-700">
                                        <button onclick="startNewSession()" class="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium">
                                            <i data-lucide="plus-circle" class="w-4 h-4"></i>
                                            Nueva Sesión
                                        </button>
                                    </div>
                                    <div id="sessions-list" class="p-2">
                                        <!-- Sesiones se renderizarán aquí -->
                                        <div class="text-center text-slate-500 text-sm py-8">
                                            <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 opacity-30"></i>
                                            <p>No hay sesiones anteriores</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button id="restart-simulation-btn" class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all" title="Reiniciar chat">
                            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <div class="simulator-chat-container">
                        <div id="simulation-chat-messages" class="flex flex-col flex-1 overflow-y-auto pr-2 scroll-smooth">
                            <div class="text-center text-slate-400 py-12">
                                <i data-lucide="message-square" class="w-16 h-16 mx-auto mb-4 opacity-10"></i>
                                <p class="text-lg font-medium opacity-50">Prueba tu nuevo prompt aquí</p>
                                <p class="text-sm opacity-30 mt-1">Escribe un mensaje para comenzar la simulación</p>
                            </div>
                        </div>

                        <div id="limit-alert" class="hidden mb-4 p-4 bg-amber-900 bg-opacity-20 border border-amber-500 border-opacity-30 rounded-xl flex gap-3 shadow-lg">
                            <i data-lucide="alert-triangle" class="w-6 h-6 text-amber-400 shrink-0"></i>
                            <div>
                                <p class="text-sm font-bold text-amber-300">Límite detectado</p>
                                <p class="text-xs text-amber-400 mt-1">Has solicitado una función que requiere programación personalizada.</p>
                                <button onclick="sendSuggestionToDeveloper()" class="mt-2 text-xs font-bold text-amber-300 hover:underline flex items-center gap-1">
                                    Notificar al desarrollador <i data-lucide="chevron-right" class="w-3 h-3"></i>
                                </button>
                            </div>
                        </div>

                        <div class="flex gap-2 mt-4 p-1 bg-slate-800 bg-opacity-40 rounded-2xl border border-slate-700 border-opacity-50">
                            <input type="text" id="simulation-message-input" 
                                class="flex-1 px-5 py-4 bg-transparent outline-none text-sm text-white placeholder-slate-500"
                                placeholder="Escribe un mensaje de prueba...">
                            <button onclick="window.sendSimulationMessage()" 
                                class="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-xl transition-all active:scale-95 group">
                                <i data-lucide="send" class="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <input type="file" id="example-file-input" class="hidden" accept="image/*,.txt,.pdf">
    `;

    if (window.lucide) lucide.createIcons();

    // Listener para subir archivo
    const fileInput = container.querySelector('#example-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleExampleUpload(e.target.files[0]);
        });
    }

    // renderIAMindTabs(container, 'prompt'); // REMOVED: Managed by app.js group tabs
}

function renderAiMemoryUI(container, initialTabId = null) {
    injectPromptStyles();

    container.innerHTML = `
        <div class="space-y-6 prompt-training-container">
            <!-- Título y Header de Sección -->
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Memoria del Negocio</h2>
                    <p class="text-slate-500">Lo que Elina sabe sobre tu empresa y cómo debe comportarse.</p>
                </div>
                <!-- Action Buttons if needed -->
            </div>

            <!-- Tabs de Navegación -->
            <div class="group-tabs-container mb-6 border-b border-slate-200">
                <nav class="flex gap-6" aria-label="Tabs">
                    <button class="group-tab active py-4 px-1 border-b-2 border-blue-600 font-medium text-blue-600 text-sm focus:outline-none"
                        data-target="memory-profile">
                        Perfil del Negocio
                    </button>
                    <button class="group-tab py-4 px-1 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300 text-sm focus:outline-none"
                        data-target="memory-reminders">
                        Recordatorios Asistente
                    </button>
                    <button class="group-tab py-4 px-1 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300 text-sm focus:outline-none"
                        data-target="memory-faqs">
                        FAQs Automáticas
                    </button>
                </nav>
            </div>

            <!-- Contenido: Perfil del Negocio -->
            <div id="memory-profile" class="tab-content block">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Resumen de Identidad -->
                    <div class="lg:col-span-2 space-y-6">
                        <div class="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
                            <div class="p-6">
                                <div class="flex justify-between items-center mb-4">
                                     <h3 class="text-lg font-bold flex items-center gap-2">
                                        <i data-lucide="building-2" class="w-5 h-5 text-blue-500"></i>
                                        Perfil del Negocio
                                    </h3>
                                    <button onclick="window.location.hash = '#settings'" class="text-xs px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1 font-medium transition-all">
                                        <i data-lucide="settings" class="w-3.5 h-3.5"></i>
                                        Editar
                                    </button>
                                </div>
                                <div class="space-y-6">
                                    <div>
                                        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Descripción de la Empresa</label>
                                        <p id="brain-company-description" class="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[80px]">Cargando...</p>
                                    </div>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Sitio Web</label>
                                            <div class="flex items-center gap-2 text-slate-700">
                                                <i data-lucide="globe" class="w-4 h-4 text-slate-400"></i>
                                                <span id="brain-website">...</span>
                                            </div>
                                        </div>
                                        <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tipo de Negocio</label>
                                            <div class="flex items-center gap-2 text-slate-700">
                                                <i data-lucide="tag" class="w-4 h-4 text-slate-400"></i>
                                                <span id="brain-business-type">...</span>
                                            </div>
                                        </div>
                                        <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Dirección</label>
                                            <div class="flex items-center gap-2 text-slate-700">
                                                <i data-lucide="map-pin" class="w-4 h-4 text-slate-400"></i>
                                                <span id="brain-address">...</span>
                                            </div>
                                        </div>
                                        <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Teléfono Público</label>
                                            <div class="flex items-center gap-2 text-slate-700">
                                                <i data-lucide="phone" class="w-4 h-4 text-slate-400"></i>
                                                <span id="brain-phone">...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Datos para el entrenamiento RAG -->
                        <div class="bg-white rounded-xl shadow-md border border-slate-100 p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold flex items-center gap-2">
                                    <i data-lucide="brain" class="w-5 h-5 text-purple-500"></i>
                                    Conocimiento Extendido (RAG)
                                </h3>
                                <div class="flex gap-2">
                                    <button onclick="window.openPasteKnowledgeModal()" class="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2 text-sm font-bold shadow-md shadow-pink-200 transition-all transform hover:-translate-y-0.5">
                                        <i data-lucide="plus-circle" class="w-4 h-4"></i>
                                        Crear Conocimiento
                                    </button>
                                </div>
                            </div>
                            <p class="text-sm text-slate-500 mb-4">Documentos y manuales que Elina consulta cuando no sabe la respuesta.</p>
                            
                            <div id="knowledge-files-list" class="space-y-3">
                                <div class="text-center py-8 text-slate-400">
                                    <i data-lucide="loader" class="w-8 h-8 mx-auto mb-2 animate-spin"></i>
                                    <p class="text-sm">Cargando archivos...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sidebar & Chat -->
                    <div class="space-y-6">
                        <div id="assistant-chat-container"></div>
                        <img src="x" style="display:none" onerror="setTimeout(() => { if(window.renderAssistantChatUI) window.renderAssistantChatUI('assistant-chat-container'); if(window.loadKnowledgeFiles) window.loadKnowledgeFiles(); }, 500); this.remove()">
                        
                        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white border border-slate-700">
                            <!-- Capabilities content (kept same) -->
                            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                                <i data-lucide="zap" class="w-5 h-5 text-amber-400"></i>
                                Capacidades Base
                            </h3>
                            <p class="text-sm text-slate-300 mb-4">Funciones programadas que Elina ya conoce y no necesitas explicarle en el prompt:</p>
                            
                            <div class="space-y-3" id="system-capabilities-list">
                                <!-- Capabilities items (simplified for brevity in replacement, ideally keep all) -->
                                <div class="flex items-start gap-3">
                                    <div class="w-5 h-5 bg-white/10 rounded flex items-center justify-center mt-0.5 shrink-0">
                                        <i data-lucide="check" class="w-3 h-3 text-amber-400"></i>
                                    </div>
                                    <div><p class="text-xs font-bold text-slate-100">Gestión de Citas</p></div>
                                </div>
                                <div class="flex items-start gap-3">
                                    <div class="w-5 h-5 bg-white/10 rounded flex items-center justify-center mt-0.5 shrink-0">
                                        <i data-lucide="check" class="w-3 h-3 text-amber-400"></i>
                                    </div>
                                    <div><p class="text-xs font-bold text-slate-100">Cotizaciones PDF</p></div>
                                </div>
                                 <div class="flex items-start gap-3">
                                    <div class="w-5 h-5 bg-white/10 rounded flex items-center justify-center mt-0.5 shrink-0">
                                        <i data-lucide="check" class="w-3 h-3 text-amber-400"></i>
                                    </div>
                                    <div><p class="text-xs font-bold text-slate-100">Voz y Audio</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            
            <!-- Contenido: Recordatorios Asistente -->
            <div id="memory-reminders" class="tab-content hidden h-full">
                <div id="personal-tasks-wrapper" class="h-full">
                    <!-- Loaded dynamically via personal-tasks.js -->
                    <div class="text-center py-12">
                        <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4"></i>
                        <p class="text-slate-500">Cargando recordatorios...</p>
                    </div>
                </div>
            </div>

            <!-- Contenido: FAQs Automáticas -->
            <div id="memory-faqs" class="tab-content hidden h-full">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Generador -->
                    <div class="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden h-fit">
                        <div class="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
                            <h3 class="text-lg font-bold flex items-center gap-2">
                                <i data-lucide="sparkles" class="w-5 h-5"></i> Generador Automático
                            </h3>
                            <p class="text-violet-100 text-xs mt-1">La IA extraerá preguntas y respuestas de tu texto.</p>
                        </div>
                        <div class="p-6 space-y-4">
                            <textarea id="raw-faq-text" rows="6" class="w-full rounded-xl border-slate-200 bg-slate-50 focus:border-violet-500 focus:ring-violet-500 text-slate-700 placeholder:text-slate-400 p-4 text-sm" placeholder="Ej: Somos una pizzería fundada en 1990. Nuestro horario es de 1pm a 11pm. Ofrecemos peperoni, hawaiana y vegetariana..."></textarea>
                            <div class="flex justify-end">
                                <button id="btn-generate-faqs" onclick="window.generateFaqs()" class="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-violet-200 flex items-center gap-2 text-sm">
                                    <i data-lucide="wand-2" class="w-4 h-4"></i>
                                    <span>Generar FAQs</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Lista de FAQs -->
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <h3 class="font-bold text-slate-800">Tus FAQs Activas</h3>
                            <div class="flex gap-2">
                                <button onclick="window.openFaqBulkEditModal()" class="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    <i data-lucide="table-2" class="w-3 h-3"></i> Edición Masiva
                                </button>
                                <button onclick="window.exportFaqsCsv()" class="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    <i data-lucide="download" class="w-3 h-3"></i> Exportar
                                </button>
                                <button onclick="document.getElementById('faq-csv-upload').click()" class="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    <i data-lucide="upload" class="w-3 h-3"></i> Importar CSV
                                </button>
                                <input type="file" id="faq-csv-upload" class="hidden" accept=".csv" onchange="window.importFaqsCsv(this.files[0])">
                                <button onclick="window.openFaqModal()" class="text-xs bg-violet-600 border border-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    <i data-lucide="plus" class="w-3 h-3"></i> Manual
                                </button>
                            </div>
                        </div>
                        <div id="faq-list-container" class="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            <div class="text-center py-12 text-slate-400">
                                <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto mb-2"></i>
                                <p class="text-sm">Cargando...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Tab Switching Logic (Moved out of innerHTML)
    const tabs = container.querySelectorAll('.group-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 1. Update Tab Styles
            tabs.forEach(t => {
                t.classList.remove('active', 'border-blue-600', 'text-blue-600');
                t.classList.add('border-transparent', 'text-slate-500');
            });
            tab.classList.add('active', 'border-blue-600', 'text-blue-600');
            tab.classList.remove('border-transparent', 'text-slate-500');

            // 2. Show/Hide Content
            const targetId = tab.dataset.target;
            const contentSections = container.querySelectorAll('.tab-content');
            contentSections.forEach(section => section.classList.add('hidden'));

            const targetSection = container.querySelector(`#${targetId}`);
            if (targetSection) targetSection.classList.remove('hidden');

            // 3. Load Dynamic Content if needed
            if (targetId === 'memory-reminders') {
                if (window.renderPersonalTasks) {
                    window.renderPersonalTasks('personal-tasks-wrapper');
                }
            } else if (targetId === 'memory-workflows') {
                if (window.initFlowBuilder) {
                    window.initFlowBuilder('memory-workflows-list-container');
                } else {
                    import('./flow-builder-v3.js').then(module => {
                        window.initFlowBuilder = module.initFlowBuilder;
                        module.initFlowBuilder('memory-workflows-list-container');
                    });
                }
            } else if (targetId === 'memory-faqs') {
                if (window.loadFaqsList) {
                    window.loadFaqsList();
                }
            }
        });
    });

    // Default Load handling
    if (initialTabId) {
        const targetTab = container.querySelector(`.group-tab[data-target="${initialTabId}"]`);
        if (targetTab) targetTab.click();
    }
}

function renderAiFlowsUI(container) {
    container.innerHTML = `
        <div class="space-y-6 prompt-training-container">
            <div>
                <h2 class="text-2xl font-bold text-slate-800">Flujos Personalizados</h2>
                <p class="text-slate-500">Configura respuestas paso a paso y reglas de precios inteligentes.</p>
            </div>

            <div class="bg-white rounded-xl shadow-md border border-slate-100 flex flex-col overflow-hidden min-h-[600px]">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 class="font-bold text-lg text-slate-800">Tus Flujos Activos</h3>
                        <p class="text-sm text-slate-500">Define cómo Elina debe guiar a tus clientes.</p>
                    </div>
                    <button onclick="window.openFlowEditor()" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm shadow-sm transition-all active:scale-95">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        Crear Nuevo
                    </button>
                </div>
                <div id="ai-flows-list-container" class="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    <div class="text-center py-12 text-slate-400">
                         <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto mb-2"></i>
                         Cargando motor de flujos...
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Cargar flow-builder V3 (con AI/Exact mode, placeholders documentados, simulador)
    if (window.initFlowBuilder) {
        window.initFlowBuilder('ai-flows-list-container');
    } else {
        import('./flow-builder-v3.js').then(module => {
            window.initFlowBuilder = module.initFlowBuilder;
            module.initFlowBuilder('ai-flows-list-container');
        });
    }
}

// Function loadWorkflowsConfig and editWorkflowsJson removed (replaced by flow-builder.js)



async function improvePromptWithAI() {
    const improvementText = document.getElementById('improvement-input').value.trim();
    const currentPromptText = document.getElementById('prompt-editor').value;
    const btn = document.getElementById('improve-prompt-btn');

    if (!improvementText) {
        window.showToast?.('Por favor, describe cómo quieres mejorar el prompt', 'error');
        return;
    }

    if (!currentPromptText) {
        window.showToast?.('No hay un prompt para mejorar', 'error');
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Mejorando...';
            if (window.lucide) lucide.createIcons({ props: { element: btn } });
        }

        window.showToast?.('Mejorando prompt con IA...', 'info');

        const { data, error } = await window.auth.invokeFunction('openai-proxy', {
            body: {
                prompt: `Prompt actual (${currentPromptText.length} caracteres):\n\n${currentPromptText}\n\nInstrucciones de mejora: ${improvementText}\n\n⚠️ IMPORTANTE: El prompt mejorado NO DEBE exceder 2,500 caracteres (límite del sistema para el prompt de usuario).\n\nMejora el prompt siguiendo estas instrucciones. Devuelve SOLO el prompt mejorado, sin explicaciones adicionales.`,
                systemInstruction: 'Eres un experto en optimización de prompts para asistentes de IA conversacionales. Tu tarea es mejorar prompts basándote en las instrucciones del usuario, manteniendo la esencia original, mejorando la claridad, efectividad y estructura. Los prompts deben ser específicos, accionables y optimizados para agentes de IA que responden mensajes de WhatsApp.\n\n🔒 RESTRICCIÓN CRÍTICA: El prompt del usuario NUNCA debe exceder 2,500 caracteres. Si el prompt actual está cerca del límite, prioriza ser conciso y eliminar redundancias en lugar de agregar contenido.',
                model: 'gpt-4o-mini'
            }
        });

        if (error) throw new Error(error.message);

        const improvedPrompt = data?.content || '';

        if (improvedPrompt) {
            document.getElementById('prompt-editor').value = improvedPrompt;
            window.showToast?.('Prompt mejorado exitosamente', 'success');
            document.getElementById('improvement-input').value = '';
        } else {
            throw new Error('No se recibió una respuesta válida');
        }
    } catch (error) {
        console.error('[Prompt Training] Error al mejorar prompt:', error);
        window.showToast?.(`Error al mejorar el prompt: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i> Generar con IA';
            if (window.lucide) lucide.createIcons({ props: { element: btn } });
        }
    }
}

async function handleExampleUpload(file) {
    try {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                window.showToast?.('Imagen procesada. Usa el campo de mejora para describir qué quieres cambiar.', 'info');
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'text/plain') {
            const text = await file.text();
            document.getElementById('improvement-input').value = `Ejemplo de texto:\n\n${text}\n\nQuiero que el prompt haga que la IA responda de forma similar a este ejemplo.`;
            window.showToast?.('Ejemplo de texto cargado', 'success');
        } else {
            window.showToast?.('Formato de archivo no soportado. Usa imágenes o archivos de texto.', 'error');
        }
    } catch (error) {
        console.error('[Prompt Training] Error al procesar archivo:', error);
        window.showToast?.('Error al procesar el archivo', 'error');
    }
}

async function savePrompt() {
    const userId = await window.getUserId();
    if (!userId) return;

    const editorContent = document.getElementById('prompt-editor').value.trim();
    if (!editorContent) {
        window.showToast?.('El prompt no puede estar vacío', 'error');
        return;
    }

    if (!confirm('¿PUBLICAR COMO OFICIAL? Esto actualizará la versión que ven tus clientes.')) return;

    try {
        // 1. Guardar como OFICIAL y limpiar borrador
        const { error: promptError } = await window.auth.sb
            .from('prompts')
            .upsert({
                user_id: userId,
                prompt_content: editorContent,
                prompt_draft: null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (promptError) throw promptError;

        // 2. Crear nueva versión
        await window.auth.sb.rpc('create_prompt_version', {
            p_user_id: userId,
            p_prompt_content: editorContent,
            p_change_reason: 'Publicado desde entrenamiento'
        });

        currentPrompt = editorContent;
        window.showToast?.('Prompt publicado exitosamente', 'success');
        await updatePromptVersionIndicator(userId);
    } catch (error) {
        console.error('[Prompt Training] Error publicando:', error);
        window.showToast?.('Error al publicar oficial', 'error');
    }
}

async function saveDraftManual(silent = false) {
    const userId = await window.getUserId();
    if (!userId) return;
    const content = document.getElementById('prompt-editor').value.trim();
    try {
        const { error } = await window.auth.sb.from('prompts').upsert({
            user_id: userId,
            prompt_draft: content,
            prompt_content: currentPrompt || '',
            draft_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        if (error) throw error;

        if (!silent) {
            window.showToast?.('Borrador guardado', 'success');
        }

        const statusEl = document.getElementById('auto-save-status');
        if (statusEl) {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            statusEl.innerHTML = `<i data-lucide="check-circle" class="w-3 h-3 text-green-500"></i> Auto-guardado ${now}`;
            if (window.lucide) lucide.createIcons({ props: { element: statusEl } });
        }
    } catch (err) {
        console.error('[Prompt Training] Error en auto-save:', err);
        if (!silent) {
            window.showToast?.('Error guardando borrador', 'error');
        }
    }
}

async function resetPrompt() {
    if (confirm('¿Restaurar desde versión OFICIAL? Se perderán tus cambios actuales.')) {
        document.getElementById('prompt-editor').value = currentPrompt;
        window.showToast?.('Editor restaurado', 'info');
    }
}

window.sendSimulationMessage = async function () {
    const input = document.getElementById('simulation-message-input');
    const message = input.value.trim();

    if (!message) return;

    // 🔄 NUEVO: Generar ID único para el mensaje del usuario
    const userMsgId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Agregar mensaje del usuario al chat
    addMessageToChat('user', message, userMsgId);
    chatHistory.push({ id: userMsgId, role: 'user', content: message });
    input.value = '';

    // 🔄 NUEVO: Guardar mensaje de usuario en BD
    await saveMessageToDB(currentSessionId, 'user', message, userMsgId);

    // Ocultar alerta de límite
    document.getElementById('limit-alert')?.classList.add('hidden');

    // Detectar si hay límites
    const hasLimit = limitKeywords.some(keyword => keyword.test(message));

    if (hasLimit) {
        document.getElementById('limit-alert')?.classList.remove('hidden');
        const limitResponse = '⚠️ Lo siento, esta solicitud requiere desarrollo adicional. El sistema actual no puede realizar esta acción solo modificando el prompt.';
        const aiMsgId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        addMessageToChat('assistant', limitResponse, aiMsgId);
        chatHistory.push({ id: aiMsgId, role: 'assistant', content: limitResponse });

        // 🔄 NUEVO: Guardar respuesta de límite en BD
        await saveMessageToDB(currentSessionId, 'assistant', limitResponse, aiMsgId);
        return;
    }

    try {
        showTypingIndicator();
        const response = await simulateAIResponse(message);
        removeTypingIndicator();

        // 🔄 NUEVO: Generar ID único para respuesta de IA
        const aiMsgId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        addMessageToChat('assistant', response, aiMsgId);
        chatHistory.push({ id: aiMsgId, role: 'assistant', content: response });

        // 🔄 NUEVO: Guardar respuesta de IA en BD
        await saveMessageToDB(currentSessionId, 'assistant', response, aiMsgId);

    } catch (error) {
        removeTypingIndicator();
        console.error('[Prompt Training] Error al simular respuesta:', error);
        const errorMsg = '❌ Error al generar respuesta. Verifica tu configuración.';
        const errorMsgId = `ai_error_${Date.now()}`;
        addMessageToChat('assistant', errorMsg, errorMsgId);
        chatHistory.push({ id: errorMsgId, role: 'assistant', content: errorMsg });

        // 🔄 NUEVO: Guardar mensaje de error en BD
        await saveMessageToDB(currentSessionId, 'assistant', errorMsg, errorMsgId);
    }
};

function showTypingIndicator() {
    const messagesContainer = document.getElementById('simulation-chat-messages');
    if (!messagesContainer) return;

    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator-container';
    typingDiv.className = 'flex justify-start mb-4';
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    document.getElementById('typing-indicator-container')?.remove();
}

async function simulateAIResponse(userMessage) {
    try {
        const userId = await window.getUserId();
        if (!userId) throw new Error('No user ID found');

        const editorContent = document.getElementById('prompt-editor')?.value?.trim();

        // Generate or retrieve session ID for this simulation session
        let sessionId = sessionStorage.getItem('simulation_session_id');
        if (!sessionId) {
            sessionId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('simulation_session_id', sessionId);
        }

        console.log('[Simulador] Llamando a process-chat-message en modo simulación...');

        // Call Supabase Edge Function instead of n8n webhook
        const { data: responseData, error: functionError } = await window.auth.invokeFunction('process-chat-message', {
            body: {
                // Simulation mode parameters
                isSimulation: true,
                user_id: userId, // <--- EXPLICIT USER ID for profile lookup
                draft_prompt: editorContent,
                session_id: sessionId,

                // Minimal required data structure (mimicking WhatsApp webhook)
                instance: 'simulator',
                data: {
                    key: {
                        remoteJid: `simulator_${userId}@s.whatsapp.net`,
                        id: `sim_msg_${Date.now()}`,
                        fromMe: false
                    },
                    message: {
                        conversation: userMessage
                    },
                    pushName: 'Simulador'
                }
            }
        });

        if (functionError) throw functionError;
        console.log('[Simulador] Respuesta recibida:', responseData);

        // Extract response from Edge Function response structure
        let aiResponse = responseData?.data?.generated_response ||
            responseData?.data?.output ||
            responseData?.response ||
            '⚠️ Sin respuesta generada.';

        // Handle media responses
        const mediaType = responseData?.data?.media_type;
        const mediaUrl = responseData?.data?.media_url;

        if (mediaType === 'image' && mediaUrl) {
            aiResponse += `\n\n🖼️ [Imagen generada](${mediaUrl})`;
        } else if (mediaType === 'video' && mediaUrl) {
            aiResponse += `\n\n🎥 [Video generado](${mediaUrl})`;
        } else if (mediaType === 'audio' && mediaUrl) {
            aiResponse += `\n\n🔊 [Audio generado](${mediaUrl})`;
        }

        // Handle quote PDFs
        if (responseData?.data?.quote_generated && responseData?.data?.pdf_url) {
            aiResponse += `\n\n📄 [Cotización Generada](${responseData.data.pdf_url})`;
        }

        return aiResponse;
    } catch (error) {
        console.error('[Prompt Training] Error en simulación:', error);
        throw error;
    }
}

function addMessageToChat(role, content, messageId = null, feedback = null) {
    const messagesContainer = document.getElementById('simulation-chat-messages');
    if (!messagesContainer) return;

    const emptyMessage = messagesContainer.querySelector('.text-center');
    if (emptyMessage) emptyMessage.remove();

    const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 🔄 MODIFICADO: No agregar a chatHistory si ya está (evitar duplicados al cargar desde BD)
    if (!chatHistory.find(m => m.id === msgId)) {
        chatHistory.push({ id: msgId, role, content, timestamp: new Date(), feedback });
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-3`;
    messageDiv.setAttribute('data-message-id', msgId);

    // Parse content for media links
    let textContent = content;
    let mediaHTML = '';

    // Check for image links (🖼️ [Imagen generada](url))
    const imageMatch = content.match(/🖼️\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (imageMatch) {
        const imageUrl = imageMatch[2];
        textContent = content.replace(imageMatch[0], '').trim();
        mediaHTML += `<img src="${imageUrl}" class="message-media-image" alt="Imagen generada" onclick="window.open('${imageUrl}', '_blank')">`;
    }

    // Check for video links (🎥 [Video generado](url))
    const videoMatch = content.match(/🎥\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (videoMatch) {
        const videoUrl = videoMatch[2];
        textContent = content.replace(videoMatch[0], '').trim();
        mediaHTML += `<video src="${videoUrl}" class="message-media-video" controls></video>`;
    }

    // Check for audio links (🔊 [Audio generado](url))
    const audioMatch = content.match(/🔊\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (audioMatch) {
        const audioUrl = audioMatch[2];
        textContent = content.replace(audioMatch[0], '').trim();
        mediaHTML += `<audio src="${audioUrl}" controls class="w-full mt-2"></audio>`;
    }

    // Check for PDF links (📄 [Cotización Generada](url))
    const pdfMatch = content.match(/📄\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (pdfMatch) {
        const pdfUrl = pdfMatch[2];
        const pdfLabel = pdfMatch[1];
        textContent = content.replace(pdfMatch[0], '').trim();
        mediaHTML += `<a href="${pdfUrl}" target="_blank" class="message-media-link">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            ${pdfLabel}
        </a>`;
    }

    if (role === 'assistant') {
        messageDiv.innerHTML = `
            <div class="message-bubble-assistant">
                <p class="text-sm whitespace-pre-wrap">${escapeHtml(textContent)}</p>
                ${mediaHTML}
                <div class="flex gap-2 mt-2 transition-all">
                    <button class="save-example-btn text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 flex items-center gap-1"
                        data-message-id="${msgId}" data-is-good="true">
                        <i data-lucide="thumbs-up" class="w-3 h-3"></i> Guardar
                    </button>
                    <button class="save-example-btn text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 flex items-center gap-1"
                        data-message-id="${msgId}" data-is-good="false">
                        <i data-lucide="thumbs-down" class="w-3 h-3"></i> No me gusta
                    </button>
                </div>
                <span class="saved-badge hidden text-xs text-green-600 font-semibold mt-1">✓ Guardado como ejemplo</span>
            </div>
        `;

        if (window.lucide) setTimeout(() => lucide.createIcons(), 50);

        messageDiv.querySelectorAll('.save-example-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const isGood = btn.getAttribute('data-is-good') === 'true';
                await saveTrainingExample(msgId, isGood);
            });
        });
    } else {
        messageDiv.innerHTML = `
            <div class="message-bubble-user">
                <p class="text-sm whitespace-pre-wrap">${escapeHtml(textContent)}</p>
                ${mediaHTML}
            </div>
        `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Reinitialize lucide icons for media links
    if (window.lucide) setTimeout(() => lucide.createIcons(), 50);
}

async function saveTrainingExample(messageId, isGood) {
    try {
        const userId = await window.getUserId();
        if (!userId) return;

        const aiMessageIndex = chatHistory.findIndex(m => m.id === messageId && m.role === 'assistant');
        if (aiMessageIndex === -1) return;

        const aiMessage = chatHistory[aiMessageIndex];
        const userMessage = chatHistory[aiMessageIndex - 1];

        const { data: embeddingData } = await window.auth.invokeFunction('smart-embedding-router', {
            body: { text: userMessage.content, model: 'text-embedding-3-small' }
        });

        const embedding = embeddingData?.embedding || null;

        // 🔄 NUEVO: Guardar con simulation_session_id
        await window.auth.sb.from('training_examples').insert({
            user_id: userId,
            contact_id: `SIM${userId.slice(0, 8)}`,
            user_message: userMessage.content,
            ai_response: aiMessage.content,
            is_good_example: isGood,
            embedding: embedding,
            notes: isGood ? 'Ejemplo guardado desde simulación' : 'Ejemplo marcado como malo desde simulación',
            simulation_session_id: currentSessionId  // 🔄 NUEVO: vincular con sesión
        });

        // 🔄 NUEVO: Actualizar feedback en simulation_messages
        if (currentSessionId) {
            await window.auth.sb
                .from('simulation_messages')
                .update({ feedback: isGood ? 'good' : 'bad' })
                .eq('id', messageId);

            // 🔄 NUEVO: Incrementar contador en simulation_sessions
            const field = isGood ? 'good_examples_count' : 'bad_examples_count';
            await window.auth.sb.rpc('increment_session_counter', {
                p_session_id: currentSessionId,
                p_field: field
            });
        }

        const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageDiv) {
            messageDiv.querySelector('.saved-badge')?.classList.remove('hidden');
            messageDiv.querySelectorAll('.save-example-btn').forEach(btn => btn.style.display = 'none');
        }

        window.showToast?.(isGood ? 'Ejemplo guardado exitosamente' : 'Ejemplo marcado como malo', 'success');
    } catch (error) {
        console.error('[Prompt Training] Error al guardar ejemplo:', error);
    }
}

async function sendSuggestionToDeveloper() {
    const lastUserMessage = chatHistory.filter(m => m.role === 'user').pop()?.content || '';
    const conversationContext = chatHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

    try {
        const response = await fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/developer-suggestion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: await window.getUserId(),
                conversationContext,
                triggerMessage: lastUserMessage,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            window.showToast?.('Sugerencia enviada al desarrollador', 'success');
            document.getElementById('limit-alert')?.classList.add('hidden');
        }
    } catch (error) {
        console.error('[Prompt Training] Error al enviar sugerencia:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}




// ============================================
// ASSISTANT CHAT (IN-APP HELP & BUSINESS)
// ============================================

let assistantChatHistory = [];

async function loadAssistantHistory() {
    // In a real implementation, we would fetch from 'assistant_chat_history' table
    // For now, we start empty or from sessionStorage
    const saved = sessionStorage.getItem('assistant_chat_history');
    if (saved) {
        assistantChatHistory = JSON.parse(saved);
        renderAssistantChatHistory();
    }
}

function renderAssistantChatUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-0.5 shadow-sm">
                        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Elina" alt="Elina" class="w-full h-full rounded-full bg-white">
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-800">Chat con Elina</h3>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p class="text-xs text-slate-500">Responde sobre App y Negocio</p>
                        </div>
                    </div>
                </div>
                <button onclick="clearAssistantChat()" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Borrar historial">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>

            <div id="assistant-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
                <!-- Welcome Message -->
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                        <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
                    </div>
                    <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 max-w-[85%]">
                        <p class="text-sm text-slate-700">¡Hola! Soy Elina. Puedo ayudarte con:</p>
                        <ul class="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                            <li>Dudas sobre <b>cómo usar la plataforma</b>.</li>
                            <li>Preguntas sobre <b>tu negocio</b> (basado en tus documentos).</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="p-4 bg-white border-t border-slate-100">
                <form onsubmit="handleAssistantSubmit(event)" class="relative">
                    <input type="text" id="assistant-chat-input" 
                        class="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                        placeholder="Escribe tu pregunta aquí..."
                        autocomplete="off">
                    <button type="submit" class="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm">
                        <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </form>
                <div class="flex items-center justify-center gap-2 mt-2">
                    <span class="text-[10px] text-slate-400 flex items-center gap-1">
                        <i data-lucide="lock" class="w-3 h-3"></i> Privado y seguro
                    </span>
                    <span class="text-slate-300">•</span>
                    <span class="text-[10px] text-slate-400">Contexto híbrido activo</span>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
    loadAssistantHistory();
}

function renderAssistantChatHistory() {
    const container = document.getElementById('assistant-chat-messages');
    if (!container) return;

    // Clear except welcome message (first child)
    // Actually simpler to just clear and re-add welcome if empty, or append new ones
    // For now, let's just append saved messages

    assistantChatHistory.forEach(msg => {
        addMessageToAssistantUI(msg.role, msg.content, msg.sources, false);
    });

    container.scrollTop = container.scrollHeight;
}

function addMessageToAssistantUI(role, content, sources = null, save = true) {
    const container = document.getElementById('assistant-chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `flex items-start gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`; // User right, AI left

    if (role === 'assistant') {
        const sourcesHtml = sources && sources.length > 0
            ? `<div class="mt-2 pt-2 border-t border-slate-100">
                 <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Fuentes:</p>
                 <div class="flex flex-wrap gap-1">
                    ${sources.map(s => `<span class="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] border border-indigo-100 flex items-center gap-1"><i data-lucide="file-text" class="w-3 h-3"></i> ${s}</span>`).join('')}
                 </div>
               </div>`
            : '';

        div.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Elina" alt="Elina" class="w-full h-full rounded-full bg-white p-0.5">
            </div>
            <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 max-w-[85%] text-sm text-slate-700 leading-relaxed">
                ${formatMarkdown(content)}
                ${sourcesHtml}
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1 text-indigo-600 font-bold border border-indigo-200">
                TÚ
            </div>
            <div class="bg-indigo-600 p-3 rounded-2xl rounded-tr-sm shadow-md text-white max-w-[85%] text-sm leading-relaxed">
                ${formatMarkdown(content)}
            </div>
        `;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (window.lucide) lucide.createIcons();

    if (save) {
        assistantChatHistory.push({ role, content, sources });
        sessionStorage.setItem('assistant_chat_history', JSON.stringify(assistantChatHistory));
    }
}

async function handleAssistantSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('assistant-chat-input');
    const query = input.value.trim();
    if (!query) return;

    input.value = '';

    // Add user message
    addMessageToAssistantUI('user', query);

    // Show typing indicator
    const container = document.getElementById('assistant-chat-messages');
    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = typingId;
    typingDiv.className = 'flex items-start gap-3';
    typingDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Elina" alt="Elina" class="w-full h-full rounded-full bg-white p-0.5">
        </div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
            <div class="flex gap-1">
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
            </div>
        </div>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;

    try {
        const { data, error } = await window.auth.invokeFunction('assistant-chat', {
            body: {
                query: query,
                history: assistantChatHistory.slice(-5) // Send last 5 messages for context
            }
        });

        document.getElementById(typingId)?.remove();

        if (error) throw error;

        addMessageToAssistantUI('assistant', data.answer, data.sources);

    } catch (error) {
        console.error('[Assistant Chat] Error:', error);
        document.getElementById(typingId)?.remove();
        addMessageToAssistantUI('assistant', 'âš ï¸ Lo siento, tuve un problema al procesar tu pregunta. Por favor intenta de nuevo.');
    }
}

function clearAssistantChat() {
    if (!confirm('¿Borrar historial del chat?')) return;
    assistantChatHistory = [];
    sessionStorage.removeItem('assistant_chat_history');
    const container = document.getElementById('assistant-chat-messages');
    // Keep only first child (welcome)
    const welcome = container.firstElementChild;
    container.innerHTML = '';
    if (welcome) container.appendChild(welcome);
}

function formatMarkdown(text) {
    if (!text) return '';
    // Basic markdown formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 rounded text-pink-500 font-mono text-xs">$1</code>')
        .replace(/\n/g, '<br>');
}

// Global exposure
window.renderAssistantChatUI = renderAssistantChatUI;
window.handleAssistantSubmit = handleAssistantSubmit;
window.clearAssistantChat = clearAssistantChat;

// ==========================================
// FAQ MANAGEMENT LOGIC
// ==========================================

window.loadFaqsList = async function () {
    const container = document.getElementById('faq-list-container');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-12 text-slate-400">
            <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto mb-2"></i>
            <p class="text-sm">Cargando...</p>
        </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
        const userId = await window.getUserId();
        const { data, error } = await window.auth.sb
            .from('knowledge_files')
            .select('*')
            .eq('user_id', userId)
            .like('filename', 'faq_%') // Filter only FAQs
            .order('created_at', { ascending: false });

        if (error) throw error;

        // INJECT SELECTION HEADER (Ideally this should be in the static HTML, but we inject it here)
        let selectionHeader = document.getElementById('faq-selection-header');
        if (!selectionHeader) {
            selectionHeader = document.createElement('div');
            selectionHeader.id = 'faq-selection-header';
            selectionHeader.className = 'hidden flex justify-between items-center bg-slate-900 text-white p-3 rounded-xl mb-3 animate-in slide-in-from-top-2';
            selectionHeader.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="font-bold text-sm pl-2"><span id="faq-selected-count">0</span> seleccionadas</span>
                </div>
                <button id="faq-batch-delete-btn" class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-2">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Eliminar
                </button>
            `;
            // Insert before container
            container.parentNode.insertBefore(selectionHeader, container);

            // Attach listener
            selectionHeader.querySelector('#faq-batch-delete-btn').addEventListener('click', () => {
                const selected = Array.from(document.querySelectorAll('.faq-checkbox:checked')).map(cb => cb.value);
                window.deleteFaqBatch(selected);
            });
        }

        // Reset selection state
        selectionHeader.classList.add('hidden');
        const updateSelectionUI = () => {
            const checkedBoxes = document.querySelectorAll('.faq-checkbox:checked');
            const count = checkedBoxes.length;
            document.getElementById('faq-selected-count').textContent = count;
            if (count > 0) {
                selectionHeader.classList.remove('hidden');
            } else {
                selectionHeader.classList.add('hidden');
            }
        };

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <i data-lucide="message-square-dashed" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
                    <p class="text-sm">No hay FAQs generadas aún.</p>
                </div>
            `;
        } else {
            container.innerHTML = data.map(file => {
                const text = file.extracted_text || '';
                const pMatch = text.match(/P:\s*(.*?)(?=\nR:|$)/s);
                const rMatch = text.match(/R:\s*(.*)/s);
                const question = pMatch ? pMatch[1].trim() : (file.filename.replace('faq_', '').replace('.txt', '') || 'Pregunta sin título');
                const answer = rMatch ? rMatch[1].trim() : text;

                return `
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative pl-10">
                    <div class="absolute left-3 top-4 flex items-center">
                        <input type="checkbox" value="${file.id}" class="faq-checkbox w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer">
                    </div>
                    <div class="absolute top-2 right-2 flex gap-1">
                        <button onclick="window.deleteFaq('${file.id}')" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <h4 class="font-bold text-slate-800 pr-10 text-sm mb-1 line-clamp-2" title="${question}">${question}</h4>
                    <p class="text-slate-600 text-xs leading-relaxed line-clamp-3" title="${answer}">${answer}</p>
                    <div class="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                         <span class="text-[10px] text-slate-400">${new Date(file.created_at).toLocaleDateString()}</span>
                         <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Activo</span>
                    </div>
                </div>
                `;
            }).join('');

            // Add checkbox listeners
            container.querySelectorAll('.faq-checkbox').forEach(cb => {
                cb.addEventListener('change', updateSelectionUI);
            });
        }
        if (window.lucide) lucide.createIcons();

    } catch (err) {
        console.error('Error loading FAQs:', err);
        container.innerHTML = `<p class="text-red-500 text-xs text-center">Error al cargar FAQs</p>`;
    }
}

// Update single delete to use custom modal
window.deleteFaq = async function (fileId) {
    const confirmed = await window.openCustomConfirmModal('¿Estás seguro de eliminar esta pregunta frecuente?');
    if (!confirmed) return;

    try {
        const { error } = await window.auth.sb
            .from('knowledge_files')
            .delete()
            .eq('id', fileId);

        if (error) throw error;
        await window.loadFaqsList();

    } catch (err) {
        console.error('Error deleting FAQ:', err);
        window.showToast?.('Error al eliminar', 'error');
    }
}


window.generateFaqs = async function () {
    const textInput = document.getElementById('raw-faq-text');
    const btn = document.getElementById('btn-generate-faqs');

    const text = textInput.value.trim();
    if (!text || text.length < 50) {
        alert('Por favor escribe al menos 50 caracteres para generar FAQs útiles.');
        return;
    }

    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Generando...`;
    if (window.lucide) lucide.createIcons();

    try {
        const { data: { session } } = await window.auth.sb.auth.getSession();

        // Call the Edge Function directly via fetch to ensure we hit the custom route
        const sbUrl = window.auth.sb.supabaseUrl;
        const response = await fetch(`${sbUrl}/functions/v1/generate-faqs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
            },
            body: JSON.stringify({ rawText: text })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }

        const result = await response.json();

        // Success
        textInput.value = ''; // Clear input
        await window.loadFaqsList(); // Reload list

        // Simple visualization
        const successBadge = document.createElement('div');
        successBadge.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce transition-all duration-500';
        successBadge.innerHTML = `✅ ${result.count} FAQs generadas`;
        document.body.appendChild(successBadge);
        setTimeout(() => successBadge.remove(), 3000);

    } catch (err) {
        console.error('Error generating FAQs:', err);
        alert('Error al generar FAQs: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        if (window.lucide) lucide.createIcons();
    }
}



// Modal Logic
function injectFaqModal() {
    if (document.getElementById('faq-modal-overlay')) return;

    const modalHtml = `
    <div id="faq-modal-overlay" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden z-[100] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-95 opacity-0" id="faq-modal-content">
            <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-bold text-lg text-slate-800">Nueva Pregunta Frecuente</h3>
                <button onclick="window.closeFaqModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Pregunta (Trigger)</label>
                    <input type="text" id="manual-faq-question" class="w-full rounded-lg border-slate-300 focus:ring-violet-500 focus:border-violet-500 text-sm" placeholder="Ej: ¿Aceptan tarjeta?">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Respuesta IA</label>
                    <textarea id="manual-faq-answer" rows="4" class="w-full rounded-lg border-slate-300 focus:ring-violet-500 focus:border-violet-500 text-sm" placeholder="Ej: Sí, aceptamos todas las tarjetas y efectivo."></textarea>
                </div>
            </div>
            <div class="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                <button onclick="window.closeFaqModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                <button onclick="window.saveManualFaq()" class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold text-sm shadow-md">Guardar</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) lucide.createIcons();
}

window.openFaqModal = function () {
    injectFaqModal();
    const overlay = document.getElementById('faq-modal-overlay');
    const content = document.getElementById('faq-modal-content');

    overlay.classList.remove('hidden');
    // Simple checks for animation
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

window.closeFaqModal = function () {
    const overlay = document.getElementById('faq-modal-overlay');
    const content = document.getElementById('faq-modal-content');

    if (content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
    }

    setTimeout(() => {
        if (overlay) overlay.classList.add('hidden');
        document.getElementById('manual-faq-question').value = '';
        document.getElementById('manual-faq-answer').value = '';
    }, 200);
}

window.saveManualFaq = async function () {
    const qInput = document.getElementById('manual-faq-question');
    const aInput = document.getElementById('manual-faq-answer');

    const question = qInput ? qInput.value.trim() : '';
    const answer = aInput ? aInput.value.trim() : '';

    if (!question || !answer) {
        alert('Completa ambos campos');
        return;
    }

    const btn = document.querySelector('#faq-modal-content button.bg-violet-600');
    const originalContent = btn ? btn.innerHTML : 'Guardar';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Guardando...';
        if (window.lucide) lucide.createIcons();
    }

    try {
        const userId = await window.getUserId();

        // Use new direct endpoint for manual save
        const { data: { session } } = await window.auth.sb.auth.getSession();
        const sbUrl = window.auth.sb.supabaseUrl;

        const response = await fetch(`${sbUrl}/functions/v1/generate-faqs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
            },
            body: JSON.stringify({
                manual: true,
                question: question,
                answer: answer
            })
        });

        if (!response.ok) throw new Error(await response.text());

        window.closeFaqModal();
        await window.loadFaqsList();

        const successBadge = document.createElement('div');
        successBadge.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce transition-all duration-500';
        successBadge.innerHTML = `✅ FAQ Guardada`;
        document.body.appendChild(successBadge);
        setTimeout(() => successBadge.remove(), 3000);

    } catch (err) {
        console.error('Error saving FAQ:', err);
        alert('Error al guardar: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }
}





// ==========================================
// CUSTOM MODAL & BATCH DELETE LOGIC
// ==========================================

window.openCustomConfirmModal = function (message) {
    return new Promise((resolve) => {
        // Remove existing if any
        const existing = document.getElementById('custom-confirm-modal');
        if (existing) existing.remove();

        const modalHtml = `
        <div id="custom-confirm-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-95 transition-transform duration-300">
                <div class="p-6 text-center">
                    <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-triangle" class="w-7 h-7 text-red-600"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">¿Estás seguro?</h3>
                    <p class="text-slate-600 text-sm leading-relaxed">${message}</p>
                </div>
                <div class="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
                    <button id="custom-confirm-cancel" class="flex-1 py-2.5 text-slate-700 font-bold hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all">
                        Cancelar
                    </button>
                    <button id="custom-confirm-ok" class="flex-1 py-2.5 bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 rounded-xl transition-all">
                        Sí, eliminar
                    </button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (window.lucide) lucide.createIcons();

        const modal = document.getElementById('custom-confirm-modal');
        const container = modal.querySelector('div');

        // Animate in
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            container.classList.remove('scale-95');
            container.classList.add('scale-100');
        });

        const close = (result) => {
            modal.classList.add('opacity-0');
            container.classList.remove('scale-100');
            container.classList.add('scale-95');
            setTimeout(() => {
                modal.remove();
                resolve(result);
            }, 300);
        };

        document.getElementById('custom-confirm-cancel').onclick = () => close(false);
        document.getElementById('custom-confirm-ok').onclick = () => close(true);
    });
};

window.deleteFaqBatch = async function (ids) {
    if (!ids || ids.length === 0) return;

    const confirmed = await window.openCustomConfirmModal(`Se eliminarán permanentemente ${ids.length} preguntas frecuentes.`);
    if (!confirmed) return;

    try {
        const { error } = await window.auth.sb
            .from('knowledge_files')
            .delete()
            .in('id', ids);

        if (error) throw error;

        window.showToast?.(`${ids.length} FAQs eliminadas`, 'success');
        await window.loadFaqsList(); // Reload list

        // Hide selection header if it exists
        const header = document.getElementById('faq-selection-header');
        if (header) header.classList.add('hidden');

    } catch (err) {
        console.error('Error deleting batch:', err);
        window.showToast?.('Error al eliminar: ' + err.message, 'error');
    }
};

// ==========================================
// CSV IMPORT / EXPORT LOGIC
// ==========================================

window.exportFaqsCsv = async function () {
    try {
        const userId = await window.getUserId();
        const { data, error } = await window.auth.sb
            .from('knowledge_files')
            .select('extracted_text, filename')
            .eq('user_id', userId)
            .like('filename', 'faq_%');

        if (error) throw error;
        if (!data || data.length === 0) {
            window.showToast?.('No hay FAQs para exportar', 'info');
            return;
        }

        let csvContent = "Question,Answer\n";

        data.forEach(file => {
            const text = file.extracted_text || '';
            const pMatch = text.match(/P:\s*(.*?)(?=\nR:|$)/s);
            const rMatch = text.match(/R:\s*(.*)/s);

            let question = pMatch ? pMatch[1].trim() : (file.filename || 'Untitled');
            let answer = rMatch ? rMatch[1].trim() : text;

            // Escape quotes and wrap in quotes
            const escapeCsv = (str) => {
                if (!str) return '""';
                // Replace " with "" and wrap in "
                return '"' + str.replace(/"/g, '""') + '"';
            };

            csvContent += `${escapeCsv(question)},${escapeCsv(answer)}\n`;
        });

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "elina_faqs_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error('Error exporting CSV:', err);
        window.showToast?.('Error al exportar CSV', 'error');
    }
};

window.importFaqsCsv = async function (file) {
    if (!file) return;

    // Clear input so same file can be selected again
    const input = document.getElementById('faq-csv-upload');
    if (input) input.value = '';

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        window.showToast?.('Por favor sube un archivo CSV válido', 'error');
        return;
    }

    try {
        window.showToast?.('Procesando CSV...', 'info');
        const text = await file.text();
        const rows = parseCsv(text);

        if (rows.length === 0) {
            window.showToast?.('El archivo CSV parece vacío o mal formateado. Asegúrate de usar comillas para textos con comas.', 'error');
            console.log('Parsed rows:', rows);
            return;
        }

        // Validate headers roughly (optional, but good practice)
        // We assume headers might exist. If the first row looks like "Question,Answer", skip it.
        let dataRows = rows;
        if (rows.length > 0) {
            const h1 = rows[0][0]?.toLowerCase();
            const h2 = rows[0][1]?.toLowerCase();
            // Basic heuristic checking for header row
            if ((h1?.includes('question') || h1?.includes('pregunta')) && (h2?.includes('answer') || h2?.includes('respuesta'))) {
                dataRows = rows.slice(1);
            }
        }

        const faqs = dataRows.map(row => {
            if (row.length < 2) return null;
            return {
                question: row[0],
                answer: row[1]
            };
        }).filter(item => item && item.question && item.answer);

        if (faqs.length === 0) {
            window.showToast?.('No se encontraron preguntas válidas en el CSV', 'error');
            return;
        }

        window.showToast?.(`Subiendo ${faqs.length} FAQs...`, 'info');

        // Call Backend
        const { data: { session } } = await window.auth.sb.auth.getSession();
        const sbUrl = window.auth.sb.supabaseUrl;

        const response = await fetch(`${sbUrl}/functions/v1/generate-faqs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
            },
            body: JSON.stringify({
                type: 'csv_import',
                faqs: faqs
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const result = await response.json();

        window.showToast?.(`✅ ${result.count || faqs.length} FAQs importadas exitosamente`, 'success');
        await window.loadFaqsList();

    } catch (err) {
        console.error('Error importing CSV:', err);
        window.showToast?.('Error al importar: ' + err.message, 'error');
    }
};

// Simple CSV Parser handling quotes
function parseCsv(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuote = false;

    // Normalize newlines
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                currentCell += '"';
                i++; // Skip escape
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === ',' && !insideQuote) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if (char === '\n' && !insideQuote) {
            if (currentCell || currentRow.length > 0) {
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    // Push last cell/row
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    return rows;
}


// ==========================================
// BULK EDITOR MODAL
// ==========================================

window.openFaqBulkEditModal = async function () {
    // 1. Fetch FAQs
    window.showToast?.('Cargando editor masivo...', 'info');
    let faqs = [];
    try {
        const userId = await window.getUserId();
        const { data, error } = await window.auth.sb
            .from('knowledge_files')
            .select('*')
            .eq('user_id', userId)
            .like('filename', 'faq_%')
            .order('created_at', { ascending: false });

        if (error) throw error;
        faqs = data || [];

    } catch (err) {
        console.error('Error fetching FAQs for bulk edit:', err);
        window.showToast?.('Error al cargar FAQs', 'error');
        return;
    }

    // 2. Build Modal HTML
    const modalHtml = `
    <div id="faq-bulk-modal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <!-- Header -->
            <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                   <h3 class="font-bold text-xl text-slate-800 flex items-center gap-2">
                        <i data-lucide="table-2" class="w-5 h-5 text-violet-600"></i> 
                        Edición Masiva de FAQs
                   </h3>
                   <p class="text-xs text-slate-500">Edita todas tus preguntas en una sola vista. Los cambios regenerarán el conocimiento de la IA.</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">${faqs.length} preguntas</span>
                    <button onclick="document.getElementById('faq-bulk-modal').remove()" class="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
            
            <!-- Table Content -->
            <div class="flex-1 overflow-auto bg-slate-50 p-4">
                <table class="w-full border-collapse bg-white rounded-lg shadow-sm overflow-hidden text-sm">
                    <thead class="bg-slate-100 text-slate-500 font-bold uppercase text-xs sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th class="p-3 text-left w-1/3 border-b border-slate-200">Pregunta (Trigger)</th>
                            <th class="p-3 text-left w-1/2 border-b border-slate-200">Respuesta IA</th>
                            <th class="p-3 text-center w-20 border-b border-slate-200">Acción</th>
                        </tr>
                    </thead>
                    <tbody id="faq-bulk-tbody" class="divide-y divide-slate-100">
                        ${faqs.map(faq => {
        const text = faq.extracted_text || '';
        const pMatch = text.match(/P:\s*(.*?)(?=\nR:|$)/s);
        const rMatch = text.match(/R:\s*(.*)/s);
        const question = pMatch ? pMatch[1].trim() : (faq.filename.replace('faq_', '') || '');
        const answer = rMatch ? rMatch[1].trim() : text;

        return `
                            <tr class="hover:bg-slate-50 group transition-colors" data-id="${faq.id}">
                                <td class="p-2 align-top">
                                    <textarea class="faq-q-input w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-y min-h-[60px] text-slate-700 font-medium bg-transparent focus:bg-white transition-all" placeholder="Escribe la pregunta...">${escapeHtmlValue(question)}</textarea>
                                </td>
                                <td class="p-2 align-top">
                                    <textarea class="faq-a-input w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-y min-h-[60px] text-slate-600 bg-transparent focus:bg-white transition-all" placeholder="Escribe la respuesta...">${escapeHtmlValue(answer)}</textarea>
                                </td>
                                <td class="p-2 align-top text-center pt-4">
                                    <button onclick="this.closest('tr').classList.add('opacity-50', 'bg-red-50'); this.closest('tr').dataset.deleted = 'true'; this.disabled = true;" 
                                        class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Marcar para eliminar">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
                ${faqs.length === 0 ? '<div class="text-center py-10 text-slate-400">No hay FAQs para editar.</div>' : ''}
                
                <div class="mt-4 text-center">
                     <button onclick="addEmptyRow()" class="text-xs font-bold text-violet-600 hover:text-violet-700 hover:bg-violet-50 px-4 py-2 rounded-lg transition-colors border border-dashed border-violet-200">
                        + Agregar Fila
                     </button>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
                <div class="text-xs text-slate-400 italic">
                    <i data-lucide="info" class="w-3 h-3 inline mr-1"></i>
                    Los cambios se aplicarán al guardar. Las filas marcadas en rojo se eliminarán.
                </div>
                <div class="flex gap-3">
                    <button onclick="document.getElementById('faq-bulk-modal').remove()" class="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors">
                        Cancelar
                    </button>
                    <button onclick="window.saveBulkFaqs()" id="btn-save-bulk" class="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-200 transition-all active:scale-95 flex items-center gap-2">
                        <i data-lucide="save" class="w-4 h-4"></i>
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) lucide.createIcons();

    // Helper to escape HTML for input values
    function escapeHtmlValue(str) {
        return str.replace(/"/g, '&quot;');
    }

    // Add empty row helper
    window.addEmptyRow = function () {
        const tbody = document.getElementById('faq-bulk-tbody');
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 group transition-colors bg-violet-50/30';
        tr.dataset.new = 'true';
        tr.innerHTML = `
            <td class="p-2 align-top">
                <textarea class="faq-q-input w-full p-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-y min-h-[60px] text-slate-700 font-medium bg-white transition-all" placeholder="Nueva pregunta..."></textarea>
            </td>
            <td class="p-2 align-top">
                <textarea class="faq-a-input w-full p-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-y min-h-[60px] text-slate-600 bg-white transition-all" placeholder="Nueva respuesta..."></textarea>
            </td>
            <td class="p-2 align-top text-center pt-4">
                <button onclick="this.closest('tr').remove()" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar fila">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        tr.scrollIntoView({ behavior: 'smooth' });
        if (window.lucide) lucide.createIcons();
    };
};

window.saveBulkFaqs = async function () {
    const rows = Array.from(document.querySelectorAll('#faq-bulk-tbody tr'));
    const updates = [];
    const deletions = [];
    const newItems = [];

    rows.forEach(row => {
        const id = row.dataset.id;
        const isDeleted = row.dataset.deleted === 'true';
        const isNew = row.dataset.new === 'true';

        const qInput = row.querySelector('.faq-q-input');
        const aInput = row.querySelector('.faq-a-input');

        const question = qInput?.value.trim();
        const answer = aInput?.value.trim();

        if (isDeleted && id) {
            deletions.push(id);
        } else if (isNew) {
            if (question && answer) {
                newItems.push({ question, answer });
            }
        } else if (id && question && answer) {
            // Check if changed? For now, we update all or could rely on simple logic.
            // Let's Just push to updates. Optimization: check against original value if stored.
            // For robustness, we update all valid rows not deleted.
            updates.push({ id, question, answer });
        }
    });

    if (updates.length === 0 && deletions.length === 0 && newItems.length === 0) {
        window.showToast?.('No hay cambios para guardar', 'info');
        return;
    }

    if (!confirm(`Se actualizarán ${updates.length}, crearán ${newItems.length} y eliminarán ${deletions.length} preguntas. ¿Confirmar?`)) return;

    const btn = document.getElementById('btn-save-bulk');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Procesando...';
    if (window.lucide) lucide.createIcons();

    try {
        const { data: { session } } = await window.auth.sb.auth.getSession();
        const sbUrl = window.auth.sb.supabaseUrl;
        const promises = [];

        // 1. Handle Deletions
        if (deletions.length > 0) {
            promises.push(window.deleteFaqBatch(deletions));
        }

        // 2. Handle New Items (Reuse csv_import logic but via direct backend call)
        if (newItems.length > 0) {
            const p = fetch(`${sbUrl}/functions/v1/generate-faqs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
                },
                body: JSON.stringify({
                    type: 'csv_import', // Same logic as CSV import: creates new entries
                    faqs: newItems
                })
            }).then(r => r.json());
            promises.push(p);
        }

        // 3. Handle Updates (New Bulk Update Endpoint)
        if (updates.length > 0) {
            const p = fetch(`${sbUrl}/functions/v1/generate-faqs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || window.auth.sb.supabaseKey}`
                },
                body: JSON.stringify({
                    type: 'bulk_update',
                    updates: updates
                })
            }).then(r => r.json());
            promises.push(p);
        }

        await Promise.all(promises);

        window.showToast?.('Cambios guardados exitosamente', 'success');
        document.getElementById('faq-bulk-modal').remove();
        await window.loadFaqsList();

    } catch (err) {
        console.error('Error saving bulk faqs:', err);
        window.showToast?.('Error al guardar cambios: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            if (window.lucide) lucide.createIcons();
        }
    }
};

// ============================================
// 🔄 SIMULACIÓN: PERSISTENCIA DE SESIONES
// ============================================

/**
 * Carga la lista de sesiones anteriores del usuario
 */
async function loadSimulationSessions(userId) {
    try {
        const { data, error } = await window.auth.invokeFunction('get-simulation-sessions', {
            body: { limit: 10 }
        });

        if (!error && data?.sessions) {
            loadedSessions = data.sessions;
            console.log(`📋 [Simulación] Loaded ${loadedSessions.length} sessions`);
            renderSessionHistory(loadedSessions); // ✅ Renderizar sesiones en UI
        }
    } catch (error) {
        console.error('[Simulación] Error loading sessions:', error);
    }
}

/**
 * Renderiza la lista de sesiones en el dropdown
 */
function renderSessionHistory(sessions) {
    const sessionsList = document.getElementById('sessions-list');
    if (!sessionsList) return;

    if (!sessions || sessions.length === 0) {
        sessionsList.innerHTML = `
            <div class="text-center text-slate-500 text-sm py-8">
                <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 opacity-30"></i>
                <p>No hay sesiones anteriores</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    sessionsList.innerHTML = sessions.map(session => {
        const isActive = session.id === currentSessionId;
        const date = new Date(session.created_at).toLocaleString('es-MX', {
            dateStyle: 'short',
            timeStyle: 'short'
        });

        return `
            <div onclick="loadSession('${session.id}')"
                class="session-card p-3 rounded-lg cursor-pointer transition-all mb-2 ${isActive
                ? 'bg-blue-600 bg-opacity-20 border border-blue-500'
                : 'bg-slate-700 bg-opacity-30 hover:bg-slate-600 hover:bg-opacity-40 border border-transparent'
            }">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-white truncate">
                            ${isActive ? '🟢 ' : ''}${session.session_name || 'Sin nombre'}
                        </p>
                        <p class="text-xs text-slate-400 mt-0.5">${date}</p>
                    </div>
                    ${isActive ? '<span class="shrink-0 px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] font-bold">ACTIVA</span>' : ''}
                </div>
                <div class="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span class="flex items-center gap-1" title="Mensajes totales">
                        <i data-lucide="message-circle" class="w-3 h-3"></i>
                        ${session.total_messages || 0}
                    </span>
                    <span class="flex items-center gap-1 text-green-400" title="Respuestas buenas">
                        👍 ${session.good_examples_count || 0}
                    </span>
                    <span class="flex items-center gap-1 text-red-400" title="Respuestas malas">
                        👎 ${session.bad_examples_count || 0}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

/**
 * Toggle del dropdown de sesiones
 */
function toggleSessionsDropdown() {
    const dropdown = document.getElementById('sessions-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Cerrar dropdown cuando se hace click fuera
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('sessions-dropdown');
    const btn = document.getElementById('sessions-dropdown-btn');
    if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

/**
 * Carga una sesión específica
 */
async function loadSession(sessionId) {
    try {
        if (sessionId === currentSessionId) {
            console.log('[Simulación] Session already loaded');
            toggleSessionsDropdown();
            return;
        }

        // Cargar mensajes de la sesión
        const { data: messages, error } = await window.auth.sb
            .from('simulation_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Actualizar estado
        currentSessionId = sessionId;
        sessionStorage.setItem('current_simulation_session_id', sessionId);

        // Limpiar chat actual
        chatHistory = [];
        const messagesContainer = document.getElementById('simulation-chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }

        // Cargar mensajes
        if (messages && messages.length > 0) {
            chatHistory = messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                feedback: msg.feedback
            }));

            chatHistory.forEach(msg => {
                addMessageToChat(msg.role, msg.content, msg.id, msg.feedback);
            });
        } else {
            messagesContainer.innerHTML = `
                <div class="text-center text-slate-400 py-12">
                    <i data-lucide="message-square" class="w-16 h-16 mx-auto mb-4 opacity-10"></i>
                    <p class="text-lg font-medium opacity-50">Sesión vacía</p>
                    <p class="text-sm opacity-30 mt-1">Escribe un mensaje para comenzar</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }

        // Actualizar UI
        const session = loadedSessions.find(s => s.id === sessionId);
        if (session) {
            const sessionNameEl = document.getElementById('current-session-name');
            if (sessionNameEl) {
                sessionNameEl.textContent = session.session_name || 'Sin nombre';
            }
        }

        renderSessionHistory(loadedSessions);
        toggleSessionsDropdown();

        console.log(`✅ [Simulación] Loaded session ${sessionId} with ${messages?.length || 0} messages`);

    } catch (error) {
        console.error('[Simulación] Error loading session:', error);
        window.showToast?.('Error al cargar la sesión', 'error');
    }
}

/**
 * Crea una nueva sesión
 */
async function startNewSession() {
    try {
        const userId = await window.getUserId();

        // Crear nueva sesión
        const editorContent = document.getElementById('prompt-editor')?.value?.trim();
        const { data: response, error } = await window.auth.invokeFunction('create-simulation-session', {
            body: {
                session_name: `Simulación ${new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`,
                draft_prompt: editorContent
            }
        });

        if (error) throw error;

        // Actualizar estado
        currentSessionId = response.session.id;
        sessionStorage.setItem('current_simulation_session_id', currentSessionId);
        chatHistory = [];

        // Limpiar chat
        const messagesContainer = document.getElementById('simulation-chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="text-center text-slate-400 py-12">
                    <i data-lucide="message-square" class="w-16 h-16 mx-auto mb-4 opacity-10"></i>
                    <p class="text-lg font-medium opacity-50">Prueba tu nuevo prompt aquí</p>
                    <p class="text-sm opacity-30 mt-1">Escribe un mensaje para comenzar la simulación</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }

        // Actualizar nombre de sesión
        const sessionNameEl = document.getElementById('current-session-name');
        if (sessionNameEl) {
            sessionNameEl.textContent = response.session.session_name || 'Nueva sesión';
        }

        // Recargar lista de sesiones
        await loadSimulationSessions(userId);
        toggleSessionsDropdown();

        console.log(`✅ [Simulación] Created new session ${currentSessionId}`);
        window.showToast?.('Nueva sesión creada', 'success');

    } catch (error) {
        console.error('[Simulación] Error creating new session:', error);
        window.showToast?.('Error al crear nueva sesión', 'error');
    }
}

/**
 * Carga o crea una sesión de simulación
 */
async function loadOrCreateSession(userId) {
    try {
        // 1. Intentar cargar sesión guardada en sessionStorage
        const savedSessionId = sessionStorage.getItem('current_simulation_session_id');

        if (savedSessionId) {
            // Verificar si la sesión existe y cargar mensajes
            const { data: messages, error } = await window.auth.sb
                .from('simulation_messages')
                .select('*')
                .eq('session_id', savedSessionId)
                .order('created_at', { ascending: true });

            if (!error && messages) {
                console.log(`📋 [Simulación] Loaded ${messages.length} messages from session ${savedSessionId}`);

                // Cargar mensajes al chat
                chatHistory = messages.map(msg => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    feedback: msg.feedback
                }));

                // Renderizar historial en UI
                const messagesContainer = document.getElementById('simulation-chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = '';
                    if (messages.length > 0) {
                        chatHistory.forEach(msg => {
                            addMessageToChat(msg.role, msg.content, msg.id, msg.feedback);
                        });
                    }
                }

                currentSessionId = savedSessionId;

                // 🔄 NUEVO: Actualizar nombre de sesión en UI
                const session = loadedSessions.find(s => s.id === savedSessionId);
                if (session) {
                    const sessionNameEl = document.getElementById('current-session-name');
                    if (sessionNameEl) {
                        sessionNameEl.textContent = session.session_name || 'Sesión actual';
                    }
                }

                return;
            }
        }

        // 2. Si no hay sesión válida, crear nueva
        const editorContent = document.getElementById('prompt-editor')?.value?.trim();

        const { data: response, error: createError } = await window.auth.invokeFunction('create-simulation-session', {
            body: {
                session_name: `Simulación ${new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`,
                draft_prompt: editorContent
            }
        });

        if (!createError && response?.session) {
            currentSessionId = response.session.id;
            sessionStorage.setItem('current_simulation_session_id', currentSessionId);
            chatHistory = [];
            console.log(`✅ [Simulación] Created new session ${currentSessionId}`);

            // 🔄 NUEVO: Actualizar nombre de sesión en UI
            const sessionNameEl = document.getElementById('current-session-name');
            if (sessionNameEl) {
                sessionNameEl.textContent = response.session.session_name || 'Nueva sesión';
            }
        } else {
            console.error('[Simulación] Error creating session:', createError);
        }

    } catch (error) {
        console.error('[Simulación] Error in loadOrCreateSession:', error);
    }
}

/**
 * Guarda un mensaje en la base de datos
 */
async function saveMessageToDB(sessionId, role, content, msgId, metadata = {}) {
    try {
        if (!sessionId) {
            console.warn('[Simulación] No session ID, skipping DB save');
            return;
        }

        const { data, error } = await window.auth.invokeFunction('save-simulation-message', {
            body: {
                session_id: sessionId,
                role: role,
                content: content,
                metadata: metadata
            }
        });

        if (error) {
            console.error('[Simulación] Error saving message to DB:', error);
        } else {
            console.log(`✅ [Simulación] Saved ${role} message to DB`);
        }
    } catch (error) {
        console.error('[Simulación] Exception saving message:', error);
    }
}

/**
 * 🧠 Analiza ejemplos de entrenamiento y sugiere mejoras al prompt
 */
async function analyzeAndImprovePrompt() {
    try {
        // Mostrar loading
        if (window.showLoadingOverlay) {
            window.showLoadingOverlay('Analizando tus ejemplos guardados...');
        }

        const { data, error } = await window.auth.invokeFunction('analyze-training-examples', {
            body: {
                include_draft: true // Usar draft si existe
            }
        });

        if (window.hideLoadingOverlay) {
            window.hideLoadingOverlay();
        }

        if (error) {
            console.error('[Prompt Training] Error analyzing examples:', error);
            window.showToast?.(error.error || 'Error al analizar ejemplos', 'error');
            return;
        }

        if (!data || !data.analysis) {
            window.showToast?.('No se recibió análisis', 'error');
            return;
        }

        console.log('[Prompt Training] Analysis received:', data);

        // Mostrar modal con resultados
        showAnalysisModal(data.analysis, data.stats);

    } catch (error) {
        if (window.hideLoadingOverlay) {
            window.hideLoadingOverlay();
        }
        console.error('[Prompt Training] Error in analyzeAndImprovePrompt:', error);
        window.showToast?.('Error al analizar ejemplos', 'error');
    }
}

/**
 * Muestra modal con análisis de ejemplos
 */
function showAnalysisModal(analysis, stats) {
    const modal = document.createElement('div');
    modal.id = 'analysis-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.onclick = (e) => {
        if (e.target === modal) closeAnalysisModal();
    };

    const goodPatterns = analysis.good_patterns || [];
    const badPatterns = analysis.bad_patterns || [];
    const suggestions = analysis.suggestions || [];
    const changes = analysis.suggested_changes || { add: [], modify: [], remove: [] };

    const hasChanges = changes.add.length > 0 || changes.modify.length > 0 || changes.remove.length > 0;

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onclick="event.stopPropagation()">
            <!-- Header -->
            <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <i data-lucide="brain" class="w-8 h-8"></i>
                        <div>
                            <h2 class="text-2xl font-bold">Análisis de Ejemplos</h2>
                            <p class="text-sm text-purple-100 mt-1">
                                ${stats.total_good} buenos • ${stats.total_bad} malos
                            </p>
                        </div>
                    </div>
                    <button onclick="closeAnalysisModal()" class="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
                ${goodPatterns.length > 0 ? `
                <!-- Patrones Positivos -->
                <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-green-900 mb-3 flex items-center gap-2">
                        <i data-lucide="check-circle" class="w-5 h-5 text-green-600"></i>
                        Patrones Positivos
                    </h3>
                    <ul class="space-y-2">
                        ${goodPatterns.map(pattern => `
                            <li class="flex items-start gap-2 text-sm text-green-800">
                                <span class="text-green-500 mt-0.5">✓</span>
                                <span>${pattern}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}

                ${badPatterns.length > 0 ? `
                <!-- Patrones Negativos -->
                <div class="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                        <i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i>
                        Patrones Negativos
                    </h3>
                    <ul class="space-y-2">
                        ${badPatterns.map(pattern => `
                            <li class="flex items-start gap-2 text-sm text-red-800">
                                <span class="text-red-500 mt-0.5">✗</span>
                                <span>${pattern}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}

                ${suggestions.length > 0 ? `
                <!-- Sugerencias -->
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <i data-lucide="lightbulb" class="w-5 h-5 text-blue-600"></i>
                        Sugerencias de Mejora
                    </h3>
                    <ol class="space-y-3">
                        ${suggestions.map((suggestion, i) => `
                            <li class="flex items-start gap-3 text-sm text-blue-800">
                                <span class="font-bold text-blue-600 mt-0.5">${i + 1}.</span>
                                <span>${suggestion}</span>
                            </li>
                        `).join('')}
                    </ol>
                </div>
                ` : ''}

                ${hasChanges ? `
                <!-- Cambios Sugeridos -->
                <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h3 class="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <i data-lucide="scissors" class="w-5 h-5 text-purple-600"></i>
                        Cambios Quirúrgicos Sugeridos
                    </h3>
                    <p class="text-xs text-purple-700 mb-4">Aplica estos cambios específicos sin reescribir todo el prompt</p>

                    ${changes.add.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="font-semibold text-sm text-purple-800 mb-2 flex items-center gap-2">
                            <span class="text-green-600">+</span> AGREGAR
                        </h4>
                        ${changes.add.map((change, i) => `
                            <div class="bg-white border border-purple-200 rounded-lg p-3 mb-2 text-sm">
                                <p class="text-purple-700 font-medium mb-1">📍 ${change.where}</p>
                                <div class="bg-green-50 border border-green-200 rounded p-2 font-mono text-xs text-green-900 whitespace-pre-wrap">+ ${change.text}</div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    ${changes.modify.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="font-semibold text-sm text-purple-800 mb-2 flex items-center gap-2">
                            <span class="text-blue-600">~</span> MODIFICAR
                        </h4>
                        ${changes.modify.map((change, i) => `
                            <div class="bg-white border border-purple-200 rounded-lg p-3 mb-2 text-sm">
                                <div class="bg-red-50 border border-red-200 rounded p-2 font-mono text-xs text-red-900 whitespace-pre-wrap mb-2">- ${change.original}</div>
                                <div class="bg-green-50 border border-green-200 rounded p-2 font-mono text-xs text-green-900 whitespace-pre-wrap">+ ${change.new}</div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    ${changes.remove.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="font-semibold text-sm text-purple-800 mb-2 flex items-center gap-2">
                            <span class="text-red-600">-</span> ELIMINAR
                        </h4>
                        ${changes.remove.map((change, i) => `
                            <div class="bg-white border border-purple-200 rounded-lg p-3 mb-2 text-sm">
                                <div class="bg-red-50 border border-red-200 rounded p-2 font-mono text-xs text-red-900 whitespace-pre-wrap">- ${change.text}</div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>

            <!-- Footer Actions -->
            <div class="border-t border-gray-200 p-4 bg-gray-50 flex gap-3 justify-end">
                <button onclick="closeAnalysisModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
}

/**
 * Cierra modal de análisis
 */
function closeAnalysisModal() {
    const modal = document.getElementById('analysis-modal');
    if (modal) {
        modal.remove();
    }
}

// ============================================================================
// EXPOSE FUNCTIONS TO WINDOW FOR ONCLICK HANDLERS
// ============================================================================
window.improvePromptWithAI = improvePromptWithAI;
window.savePrompt = savePrompt;
window.saveDraftManual = saveDraftManual;
window.resetPrompt = resetPrompt;
window.analyzeAndImprovePrompt = analyzeAndImprovePrompt;
window.toggleSessionsDropdown = toggleSessionsDropdown;
window.startNewSession = startNewSession;
window.sendSuggestionToDeveloper = sendSuggestionToDeveloper;
window.loadSession = loadSession;
window.closeAnalysisModal = closeAnalysisModal;
