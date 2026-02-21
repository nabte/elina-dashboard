let currentPrompt = '';
let chatHistory = [];
let systemCapabilities = {};

// Lista de palabras clave para detectar lÃ­mites del sistema
const limitKeywords = [
    /puedes borrar/i, /eliminar mensaje/i, /crear grupo/i, /campaÃ±a/i,
    /difundir/i, /masivo/i, /descargar reporte/i, /ver mis contactos/i,
    /editar contacto/i, /bloquear/i, /reportar/i, /spam/i
];

// Listener para activaciÃ³n de paneles
document.addEventListener('panel:activated', async (event) => {
    const { panelId } = event.detail;
    if (panelId === 'prompt-training') {
        console.log('[Prompt Training] Panel activado, inicializando modo prompt...');
        await initPromptTraining('prompt');
    } else if (panelId === 'ai-memory') {
        console.log('[Prompt Training] Panel ai-memory activado, inicializando modo memory...');
        await initPromptTraining('memory');
    }
});

async function initPromptTraining(mode = 'prompt') {
    const userId = await window.getUserId();
    if (!userId) {
        console.error('[Prompt Training] No user ID found');
        return;
    }

    const containerId = mode === 'memory' ? 'ai-memory-content' : 'prompt-training-content';
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`[Prompt Training] Container #${containerId} not found`);
        return;
    }

    // Renderizar UI segÃºn el modo
    if (mode === 'memory') {
        console.log('[Prompt Training] Rendering AI Memory UI');
        renderAiMemoryUI(container);
        await syncBusinessData(userId);
    } else {
        console.log('[Prompt Training] Rendering Prompt Editor UI');
        renderPromptEditorUI(container);
        await loadCurrentPrompt(userId);
        await loadSystemCapabilities();
        setupSimulationChatListeners(container);
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

    // BotÃ³n Restaurar
    const restartBtn = container.querySelector('#restart-simulation-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            const messagesContainer = container.querySelector('#simulation-chat-messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="text-center text-slate-400 py-8">
                        <i data-lucide="message-square" class="w-12 h-12 mx-auto mb-2 opacity-20"></i>
                        <p>Inicia una conversaciÃ³n para probar el prompt</p>
                    </div>
                `;
                chatHistory = [];
                if (window.lucide) lucide.createIcons();
            }
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
                    el.textContent = val || 'AÃºn no le has dicho a Elina de quÃ© trata tu negocio. Ve a ConfiguraciÃ³n para completar esta informaciÃ³n.';
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

        // Mock para la UI ya que la columna no existe en DB aÃºn
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
            // Si la funciÃ³n no existe aÃºn, no mostrar error
            if (error.code !== '42883') { // 42883 = function does not exist
                console.warn('[Prompt Training] No se pudo obtener versiÃ³n del prompt:', error);
            }
            return;
        }

        // Actualizar indicador en prompt-training si existe
        const versionIndicator = document.getElementById('prompt-training-version-indicator');
        if (versionIndicator && versionData && versionData.length > 0) {
            const version = versionData[0];
            versionIndicator.textContent = `v${version.version_number}`;
            versionIndicator.title = `VersiÃ³n ${version.version_number} - ${new Date(version.created_at).toLocaleDateString()}`;
        }
    } catch (err) {
        console.warn('[Prompt Training] Error al actualizar indicador de versiÃ³n:', err);
    }
}

async function loadSystemCapabilities() {
    // DocumentaciÃ³n de capacidades del sistema Elina V4
    systemCapabilities = {
        modifiableWithPrompt: [
            'Personalidad y Tono',
            'InformaciÃ³n del Negocio',
            'Reglas de Respuesta',
            'Formato de PresentaciÃ³n',
            'Contexto de Ventas',
            'Prioridades'
        ],
        systemCapabilities: [
            { name: 'Memoria Corto Plazo', modifiable: false, description: 'Ventana de 10 mensajes por sesiÃ³n' },
            { name: 'Memoria Largo Plazo (RAG)', modifiable: false, description: 'Embeddings de mensajes anteriores, threshold 0.7, mÃ¡x 3 mensajes' },
            { name: 'TranscripciÃ³n de Audio', modifiable: false, description: 'Whisper de OpenAI' },
            { name: 'DescripciÃ³n de ImÃ¡genes', modifiable: false, description: 'GPT-4o-mini analiza imÃ¡genes enviadas' },
            { name: 'EnvÃ­o de ImÃ¡genes', modifiable: 'parcial', description: 'Puede enviar imÃ¡genes de productos' },
            { name: 'EnvÃ­o de Videos', modifiable: 'parcial', description: 'Puede enviar videos' },
            { name: 'EnvÃ­o de Audio', modifiable: true, description: 'Tag [AUDIO] para responder con voz' },
            { name: 'BÃºsqueda de Productos', modifiable: 'parcial', description: 'Herramienta ver_productos con bÃºsqueda hÃ­brida' },
            { name: 'Placeholders de Productos', modifiable: false, description: '[PRODUCT_NAME:ID], [PRODUCT_PRICE:ID], etc.' },
            { name: 'GeneraciÃ³n de Cotizaciones', modifiable: false, description: 'PDF automÃ¡tico con 3+ productos o solicitud explÃ­cita' },
            { name: 'Promos Inteligentes', modifiable: false, description: 'Inyecta promociones activas al contexto' },
            { name: 'DetecciÃ³n de CrÃ­ticos', modifiable: false, description: 'Detecta intenciones de compra urgente, quejas' },
            { name: 'Sistema de Citas', modifiable: false, description: 'Detecta intenciÃ³n, muestra slots disponibles' },
            { name: 'Pausar Seguimientos', modifiable: false, description: 'Pausa automÃ¡tica cuando cliente responde' },
            { name: 'Labels/Etiquetas', modifiable: false, description: 'AsignaciÃ³n automÃ¡tica de etiquetas' }
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
            
            /* Chat container with 85vh height */
            .simulator-chat-container {
                height: 85vh;
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
        <div class="space-y-6 prompt-training-container">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
                <!-- Panel izquierdo: Editor de Prompt -->
                <div class="flex flex-col bg-white rounded-xl shadow-md p-6 border border-slate-100">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <h3 class="text-xl font-bold">Entrenamiento Prompt</h3>
                            <span id="prompt-training-version-indicator" 
                                  class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200"
                                  title="VersiÃ³n actual">...</span>
                        </div>
                        <div id="auto-save-status" class="text-xs text-slate-400 flex items-center gap-1 italic"></div>
                    </div>
                    
                    <div class="flex-1 flex flex-col gap-4">
                        <div class="relative flex-1">
                            <textarea id="prompt-editor" 
                                class="w-full h-full min-h-[400px] p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
                                placeholder="Escribe aquÃ­ las instrucciones para tu IA..."></textarea>
                            
                            <div class="absolute bottom-4 right-4 flex gap-2">
                                <button onclick="resetPrompt()" class="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all" title="Restaurar original">
                                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                                </button>
                                <button onclick="saveDraftManual()" class="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 shadow-sm font-medium transition-all">
                                    Guardar Borrador
                                </button>
                                <button onclick="savePrompt()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-medium transition-all">
                                    Publicar Oficial
                                </button>
                            </div>
                        </div>

                        <div class="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <label class="block text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                <i data-lucide="sparkles" class="w-4 h-4 text-blue-600"></i>
                                Mejorar con IA
                            </label>
                            <div class="flex gap-2">
                                <input type="text" id="improvement-input" 
                                    class="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ej: 'Haz que sea mÃ¡s amable' o 'AÃ±ade polÃ­tica de reembolsos'...">
                                <button id="improve-prompt-btn" onclick="improvePromptWithAI()" 
                                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap">
                                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                                    Mejorar
                                </button>
                                <button onclick="document.getElementById('example-file-input').click()" 
                                    class="p-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-all" title="Subir ejemplo (Shot o TXT)">
                                    <i data-lucide="paperclip" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Panel derecho: Chat de SimulaciÃ³n -->
                <div class="flex flex-col simulator-dark-theme">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold flex items-center gap-2">
                            Simulador de Chat
                            <span class="px-2 py-0.5 bg-green-500 bg-opacity-20 text-green-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-500 border-opacity-30">Sandbox</span>
                        </h3>
                        <button id="restart-simulation-btn" class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all" title="Reiniciar chat">
                            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <div class="simulator-chat-container">
                        <div id="simulation-chat-messages" class="flex flex-col">
                            <div class="text-center text-slate-400 py-8">
                                <i data-lucide="message-square" class="w-12 h-12 mx-auto mb-2 opacity-20"></i>
                                <p>Inicia una conversaciÃ³n para probar el prompt</p>
                            </div>
                        </div>

                        <div id="limit-alert" class="hidden mb-4 p-3 bg-amber-900 bg-opacity-20 border border-amber-500 border-opacity-30 rounded-lg flex gap-3">
                            <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400 shrink-0"></i>
                            <div>
                                <p class="text-xs font-bold text-amber-300">LÃ­mite detectado</p>
                                <p class="text-[11px] text-amber-400">Has solicitado una funciÃ³n que requiere programaciÃ³n. Â¿Quieres enviar esta solicitud al desarrollador?</p>
                                <button onclick="sendSuggestionToDeveloper()" class="mt-2 text-xs font-bold text-amber-300 hover:underline">
                                    SÃ­, enviar sugerencia
                                </button>
                            </div>
                        </div>

                        <div class="flex gap-2 mt-4">
                            <input type="text" id="simulation-message-input" 
                                class="flex-1 px-4 py-3 bg-slate-700 bg-opacity-50 border border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-700 transition-all text-sm text-white placeholder-slate-400"
                                placeholder="Escribe un mensaje de prueba...">
                            <button onclick="window.sendSimulationMessage()" 
                                class="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95">
                                <i data-lucide="send" class="w-5 h-5"></i>
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
}

function renderAiMemoryUI(container) {
    injectPromptStyles();

    container.innerHTML = `
        <div class="space-y-6 prompt-training-container">
            <!-- TÃ­tulo y Header de SecciÃ³n -->
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Memoria del Negocio</h2>
                    <p class="text-slate-500">Lo que Elina sabe sobre tu empresa y cÃ³mo debe comportarse.</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.location.hash = '#settings'" class="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-medium transition-all shadow-sm">
                        <i data-lucide="settings" class="w-4 h-4"></i>
                        Actualizar Datos
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Resumen de Identidad -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
                        <div class="p-6">
                            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                                <i data-lucide="building-2" class="w-5 h-5 text-blue-500"></i>
                                Perfil del Negocio
                            </h3>
                            <div class="space-y-6">
                                <div>
                                    <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">DescripciÃ³n de la Empresa</label>
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
                                        <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">DirecciÃ³n</label>
                                        <div class="flex items-center gap-2 text-slate-700">
                                            <i data-lucide="map-pin" class="w-4 h-4 text-slate-400"></i>
                                            <span id="brain-address">...</span>
                                        </div>
                                    </div>
                                    <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">TelÃ©fono PÃºblico</label>
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
                            <button onclick="window.uploadKnowledgeFile()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-medium transition-all">
                                <i data-lucide="upload" class="w-4 h-4"></i>
                                Subir Archivo
                            </button>
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

                <!-- Sidebar Informativo -->
                <div class="space-y-6">
                    <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white border border-slate-700">
                        <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                            <i data-lucide="zap" class="w-5 h-5 text-amber-400"></i>
                            Capacidades Base
                        </h3>
                        <p class="text-sm text-slate-300 mb-4">Funciones programadas que Elina ya conoce y no necesitas explicarle en el prompt:</p>
                        
                        <div class="space-y-3" id="system-capabilities-list">
                            <div class="flex items-start gap-3">
                                <div class="w-5 h-5 bg-white/10 rounded flex items-center justify-center mt-0.5 shrink-0">
                                    <i data-lucide="check" class="w-3 h-3 text-amber-400"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-bold text-slate-100">GestiÃ³n de Citas</p>
                                    <p class="text-[10px] text-slate-400 leading-tight">Muestra disponibilidad y agenda en el calendario.</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <div class="w-5 h-5 bg-white/10 rounded flex items-center justify-center mt-0.5 shrink-0">
                                    <i data-lucide="check" class="w-3 h-3 text-amber-400"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-bold text-slate-100">CatÃ¡logo DinÃ¡mico</p>
                                    <p class="text-[10px] text-slate-400 leading-tight">Consulta stock, precios e imÃ¡genes reales.</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <div class="w-5 h-5 bg-white/10 rounded flex items-center justify-center mt-0.5 shrink-0">
                                    <i data-lucide="check" class="w-3 h-3 text-amber-400"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-bold text-slate-100">Cotizaciones PDF</p>
                                    <p class="text-[10px] text-slate-400 leading-tight">Genera documentos profesionales al instante.</p>
                                </div>
                            </div>
                             <div class="flex items-start gap-3">
                                <div class="w-5 h-5 bg-white/10 rounded flex items-center justify-center mt-0.5 shrink-0">
                                    <i data-lucide="check" class="w-3 h-3 text-amber-400"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-bold text-slate-100">Voz y Audio</p>
                                    <p class="text-[10px] text-slate-400 leading-tight">Escucha audios de clientes y envÃ­a respuestas de voz.</p>
                                </div>
                            </div>
                        </div>

                        <div class="mt-6 pt-6 border-t border-white/10">
                            <p class="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Pilas de Memoria</p>
                            <div class="flex gap-2">
                                <span class="px-2 py-1 bg-white/5 rounded text-[10px] font-medium text-slate-300 border border-white/10">Contexto: 10 msg</span>
                                <span class="px-2 py-1 bg-white/5 rounded text-[10px] font-medium text-slate-300 border border-white/10">Historial: Ilimitado</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tip de Entrenamiento -->
                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                        <div class="flex gap-3">
                            <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                                <i data-lucide="lightbulb" class="w-5 h-5 text-amber-600"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-amber-900 mb-1">Tip Pro</h4>
                                <p class="text-xs text-amber-800 leading-relaxed">
                                    No satures el prompt con tu direcciÃ³n o telÃ©fono. Elina ya los toma de tu <b>Perfil del Negocio</b> automÃ¡ticamente. Ãšsalo solo para definir su "personalidad".
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

async function improvePromptWithAI() {
    const improvementText = document.getElementById('improvement-input').value.trim();
    const currentPromptText = document.getElementById('prompt-editor').value;
    const btn = document.getElementById('improve-prompt-btn');

    if (!improvementText) {
        window.showToast?.('Por favor, describe cÃ³mo quieres mejorar el prompt', 'error');
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
                prompt: `Prompt actual:\n\n${currentPromptText}\n\nInstrucciones de mejora: ${improvementText}\n\nMejora el prompt siguiendo estas instrucciones. Devuelve SOLO el prompt mejorado, sin explicaciones adicionales.`,
                systemInstruction: 'Eres un experto en optimizaciÃ³n de prompts para asistentes de IA conversacionales. Tu tarea es mejorar prompts basÃ¡ndote en las instrucciones del usuario, manteniendo la esencia original, mejorando la claridad, efectividad y estructura. Los prompts deben ser especÃ­ficos, accionables y optimizados para agentes de IA que responden mensajes de WhatsApp.',
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
            throw new Error('No se recibiÃ³ una respuesta vÃ¡lida');
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
                window.showToast?.('Imagen procesada. Usa el campo de mejora para describir quÃ© quieres cambiar.', 'info');
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'text/plain') {
            const text = await file.text();
            document.getElementById('improvement-input').value = `Ejemplo de texto:\n\n${text}\n\nQuiero que el prompt haga que la IA responda de forma similar a este ejemplo.`;
            window.showToast?.('Ejemplo de texto cargado', 'success');
        } else {
            window.showToast?.('Formato de archivo no soportado. Usa imÃ¡genes o archivos de texto.', 'error');
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
        window.showToast?.('El prompt no puede estar vacÃ­o', 'error');
        return;
    }

    if (!confirm('Â¿PUBLICAR COMO OFICIAL? Esto actualizarÃ¡ la versiÃ³n que ven tus clientes.')) return;

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

        // 2. Crear nueva versiÃ³n
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
    if (confirm('Â¿Restaurar desde versiÃ³n OFICIAL? Se perderÃ¡n tus cambios actuales.')) {
        document.getElementById('prompt-editor').value = currentPrompt;
        window.showToast?.('Editor restaurado', 'info');
    }
}

window.sendSimulationMessage = async function () {
    const input = document.getElementById('simulation-message-input');
    const message = input.value.trim();

    if (!message) return;

    // Agregar mensaje del usuario al chat
    addMessageToChat('user', message);
    input.value = '';

    // Ocultar alerta de lÃ­mite
    document.getElementById('limit-alert')?.classList.add('hidden');

    // Detectar si hay lÃ­mites
    const hasLimit = limitKeywords.some(keyword => keyword.test(message));

    if (hasLimit) {
        document.getElementById('limit-alert')?.classList.remove('hidden');
        addMessageToChat('assistant', 'âš ï¸ Lo siento, esta solicitud requiere desarrollo adicional. El sistema actual no puede realizar esta acciÃ³n solo modificando el prompt.');
        return;
    }

    try {
        showTypingIndicator();
        const response = await simulateAIResponse(message);
        removeTypingIndicator();
        addMessageToChat('assistant', response);
    } catch (error) {
        removeTypingIndicator();
        console.error('[Prompt Training] Error al simular respuesta:', error);
        addMessageToChat('assistant', 'âŒ Error al generar respuesta. Verifica tu configuraciÃ³n.');
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

        console.log('[Simulador] Llamando a process-chat-message en modo simulaciÃ³n...');

        // Call Supabase Edge Function instead of n8n webhook
        const response = await fetch('https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/process-chat-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.supabaseClient.supabaseKey}`
            },
            body: JSON.stringify({
                // Simulation mode parameters
                isSimulation: true,
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
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en Edge Function: ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('[Simulador] Respuesta recibida:', responseData);

        // Extract response from Edge Function response structure
        let aiResponse = responseData?.data?.generated_response ||
            responseData?.data?.output ||
            responseData?.response ||
            'âš ï¸ Sin respuesta generada.';

        // Handle media responses
        const mediaType = responseData?.data?.media_type;
        const mediaUrl = responseData?.data?.media_url;

        if (mediaType === 'image' && mediaUrl) {
            aiResponse += `\n\nðŸ–¼ï¸ [Imagen generada](${mediaUrl})`;
        } else if (mediaType === 'video' && mediaUrl) {
            aiResponse += `\n\nðŸŽ¥ [Video generado](${mediaUrl})`;
        } else if (mediaType === 'audio' && mediaUrl) {
            aiResponse += `\n\nðŸ”Š [Audio generado](${mediaUrl})`;
        }

        // Handle quote PDFs
        if (responseData?.data?.quote_generated && responseData?.data?.pdf_url) {
            aiResponse += `\n\nðŸ“„ [CotizaciÃ³n Generada](${responseData.data.pdf_url})`;
        }

        return aiResponse;
    } catch (error) {
        console.error('[Prompt Training] Error en simulaciÃ³n:', error);
        throw error;
    }
}

function addMessageToChat(role, content, messageId = null) {
    const messagesContainer = document.getElementById('simulation-chat-messages');
    if (!messagesContainer) return;

    const emptyMessage = messagesContainer.querySelector('.text-center');
    if (emptyMessage) emptyMessage.remove();

    const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    chatHistory.push({ id: msgId, role, content, timestamp: new Date() });

    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-3`;
    messageDiv.setAttribute('data-message-id', msgId);

    // Parse content for media links
    let textContent = content;
    let mediaHTML = '';

    // Check for image links (ðŸ–¼ï¸ [Imagen generada](url))
    const imageMatch = content.match(/ðŸ–¼ï¸\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (imageMatch) {
        const imageUrl = imageMatch[2];
        textContent = content.replace(imageMatch[0], '').trim();
        mediaHTML += `<img src="${imageUrl}" class="message-media-image" alt="Imagen generada" onclick="window.open('${imageUrl}', '_blank')">`;
    }

    // Check for video links (ðŸŽ¥ [Video generado](url))
    const videoMatch = content.match(/ðŸŽ¥\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (videoMatch) {
        const videoUrl = videoMatch[2];
        textContent = content.replace(videoMatch[0], '').trim();
        mediaHTML += `<video src="${videoUrl}" class="message-media-video" controls></video>`;
    }

    // Check for audio links (ðŸ”Š [Audio generado](url))
    const audioMatch = content.match(/ðŸ”Š\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (audioMatch) {
        const audioUrl = audioMatch[2];
        textContent = content.replace(audioMatch[0], '').trim();
        mediaHTML += `<audio src="${audioUrl}" controls class="w-full mt-2"></audio>`;
    }

    // Check for PDF links (ðŸ“„ [CotizaciÃ³n Generada](url))
    const pdfMatch = content.match(/ðŸ“„\s*\[([^\]]+)\]\(([^)]+)\)/);
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
                <span class="saved-badge hidden text-xs text-green-600 font-semibold mt-1">âœ“ Guardado como ejemplo</span>
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

        await window.auth.sb.from('training_examples').insert({
            user_id: userId,
            contact_id: `SIM${userId.slice(0, 8)}`,
            user_message: userMessage.content,
            ai_response: aiMessage.content,
            is_good_example: isGood,
            embedding: embedding,
            notes: isGood ? 'Ejemplo guardado desde simulaciÃ³n' : 'Ejemplo marcado como malo desde simulaciÃ³n'
        });

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

 
 / /   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 / /   K N O W L E D G E   F I L E S   M A N A G E M E N T   ( R A G ) 
 
 / /   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 
 
 a s y n c   f u n c t i o n   l o a d K n o w l e d g e F i l e s ( )   { 
 
         t r y   { 
 
                 c o n s t   r e s p o n s e   =   a w a i t   f e t c h ( ' h t t p s : / / m y t v w f b i j l g b i h l e g m f g . s u p a b a s e . c o / f u n c t i o n s / v 1 / k n o w l e d g e - f i l e s ' ,   { 
 
                         h e a d e r s :   { 
 
                                 ' A u t h o r i z a t i o n ' :   ` B e a r e r   $ { w i n d o w . s u p a b a s e C l i e n t . s u p a b a s e K e y } ` 
 
                         } 
 
                 } ) ; 
 
 
 
                 i f   ( ! r e s p o n s e . o k )   t h r o w   n e w   E r r o r ( ' F a i l e d   t o   l o a d   f i l e s ' ) ; 
 
 
 
                 c o n s t   {   f i l e s   }   =   a w a i t   r e s p o n s e . j s o n ( ) ; 
 
                 r e n d e r K n o w l e d g e F i l e s ( f i l e s ) ; 
 
         }   c a t c h   ( e r r o r )   { 
 
                 c o n s o l e . e r r o r ( ' [ K n o w l e d g e   F i l e s ]   E r r o r   l o a d i n g   f i l e s : ' ,   e r r o r ) ; 
 
                 d o c u m e n t . g e t E l e m e n t B y I d ( ' k n o w l e d g e - f i l e s - l i s t ' ) . i n n e r H T M L   =   ` 
 
                         < d i v   c l a s s = " t e x t - c e n t e r   p y - 8   t e x t - r e d - 5 0 0 " > 
 
                                 < i   d a t a - l u c i d e = " a l e r t - c i r c l e "   c l a s s = " w - 8   h - 8   m x - a u t o   m b - 2 " > < / i > 
 
                                 < p   c l a s s = " t e x t - s m " > E r r o r   a l   c a r g a r   a r c h i v o s < / p > 
 
                         < / d i v > 
 
                 ` ; 
 
                 i f   ( w i n d o w . l u c i d e )   l u c i d e . c r e a t e I c o n s ( ) ; 
 
         } 
 
 } 
 
 
 
 f u n c t i o n   r e n d e r K n o w l e d g e F i l e s ( f i l e s )   { 
 
         c o n s t   c o n t a i n e r   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' k n o w l e d g e - f i l e s - l i s t ' ) ; 
 
 
 
         i f   ( ! f i l e s   | |   f i l e s . l e n g t h   = = =   0 )   { 
 
                 c o n t a i n e r . i n n e r H T M L   =   ` 
 
                         < d i v   c l a s s = " t e x t - c e n t e r   p y - 8   t e x t - s l a t e - 4 0 0 " > 
 
                                 < i   d a t a - l u c i d e = " i n b o x "   c l a s s = " w - 1 2   h - 1 2   m x - a u t o   m b - 2   o p a c i t y - 2 0 " > < / i > 
 
                                 < p   c l a s s = " t e x t - s m " > N o   h a y   a r c h i v o s   s u b i d o s < / p > 
 
                                 < p   c l a s s = " t e x t - x s   m t - 1 " > S u b e   P D F s ,   D O C X   o   T X T   p a r a   q u e   E l i n a   l o s   c o n s u l t e < / p > 
 
                         < / d i v > 
 
                 ` ; 
 
                 i f   ( w i n d o w . l u c i d e )   l u c i d e . c r e a t e I c o n s ( ) ; 
 
                 r e t u r n ; 
 
         } 
 
 
 
         c o n t a i n e r . i n n e r H T M L   =   f i l e s . m a p ( f i l e   = >   { 
 
                 c o n s t   s t a t u s C o n f i g   =   { 
 
                         ' p e n d i n g ' :   {   b g :   ' b g - y e l l o w - 1 0 0 ' ,   t e x t :   ' t e x t - y e l l o w - 7 0 0 ' ,   b o r d e r :   ' b o r d e r - y e l l o w - 2 0 0 ' ,   l a b e l :   ' P E N D I E N T E '   } , 
 
                         ' p r o c e s s i n g ' :   {   b g :   ' b g - b l u e - 1 0 0 ' ,   t e x t :   ' t e x t - b l u e - 7 0 0 ' ,   b o r d e r :   ' b o r d e r - b l u e - 2 0 0 ' ,   l a b e l :   ' P R O C E S A N D O '   } , 
 
                         ' r e a d y ' :   {   b g :   ' b g - g r e e n - 1 0 0 ' ,   t e x t :   ' t e x t - g r e e n - 7 0 0 ' ,   b o r d e r :   ' b o r d e r - g r e e n - 2 0 0 ' ,   l a b e l :   ' A C T I V O '   } , 
 
                         ' e r r o r ' :   {   b g :   ' b g - r e d - 1 0 0 ' ,   t e x t :   ' t e x t - r e d - 7 0 0 ' ,   b o r d e r :   ' b o r d e r - r e d - 2 0 0 ' ,   l a b e l :   ' E R R O R '   } 
 
                 } ; 
 
 
 
                 c o n s t   s t a t u s   =   s t a t u s C o n f i g [ f i l e . s t a t u s ]   | |   s t a t u s C o n f i g [ ' p e n d i n g ' ] ; 
 
                 c o n s t   f i l e S i z e   =   f o r m a t F i l e S i z e ( f i l e . f i l e _ s i z e ) ; 
 
                 c o n s t   f i l e D a t e   =   f o r m a t R e l a t i v e D a t e ( f i l e . c r e a t e d _ a t ) ; 
 
 
 
                 r e t u r n   ` 
 
                         < d i v   c l a s s = " f l e x   i t e m s - c e n t e r   j u s t i f y - b e t w e e n   p - 3   b g - s l a t e - 5 0   r o u n d e d - l g   b o r d e r   b o r d e r - s l a t e - 1 0 0   h o v e r : b g - s l a t e - 1 0 0   t r a n s i t i o n - a l l   g r o u p " > 
 
                                 < d i v   c l a s s = " f l e x   i t e m s - c e n t e r   g a p - 3   f l e x - 1 " > 
 
                                         < d i v   c l a s s = " w - 1 0   h - 1 0   b g - w h i t e   r o u n d e d   b o r d e r   b o r d e r - s l a t e - 2 0 0   f l e x   i t e m s - c e n t e r   j u s t i f y - c e n t e r " > 
 
                                                 < i   d a t a - l u c i d e = " f i l e - t e x t "   c l a s s = " w - 5   h - 5   t e x t - s l a t e - 4 0 0 " > < / i > 
 
                                         < / d i v > 
 
                                         < d i v   c l a s s = " f l e x - 1 " > 
 
                                                 < p   c l a s s = " t e x t - s m   f o n t - b o l d   t e x t - s l a t e - 7 0 0 " > $ { e s c a p e H t m l ( f i l e . f i l e n a m e ) } < / p > 
 
                                                 < p   c l a s s = " t e x t - [ 1 0 p x ]   t e x t - s l a t e - 4 0 0 " > $ { f i l e D a t e }   â ¬ ¢   $ { f i l e S i z e } < / p > 
 
                                         < / d i v > 
 
                                 < / d i v > 
 
                                 < d i v   c l a s s = " f l e x   i t e m s - c e n t e r   g a p - 2 " > 
 
                                         < d i v   c l a s s = " p x - 2   p y - 1   $ { s t a t u s . b g }   $ { s t a t u s . t e x t }   r o u n d e d   t e x t - [ 1 0 p x ]   f o n t - b o l d   t r a c k i n g - w i d e r   b o r d e r   $ { s t a t u s . b o r d e r } " > 
 
                                                 $ { s t a t u s . l a b e l } 
 
                                         < / d i v > 
 
                                         $ { f i l e . s t a t u s   = = =   ' r e a d y '   ?   ` 
 
                                                 < b u t t o n   o n c l i c k = " v i e w K n o w l e d g e F i l e ( ' $ { f i l e . i d } ' ) "   c l a s s = " p - 2   t e x t - b l u e - 6 0 0   h o v e r : b g - b l u e - 5 0   r o u n d e d   t r a n s i t i o n - a l l "   t i t l e = " V e r   c o n t e n i d o " > 
 
                                                         < i   d a t a - l u c i d e = " e y e "   c l a s s = " w - 4   h - 4 " > < / i > 
 
                                                 < / b u t t o n > 
 
                                         `   :   ' ' } 
 
                                         < b u t t o n   o n c l i c k = " d e l e t e K n o w l e d g e F i l e ( ' $ { f i l e . i d } ' ,   ' $ { e s c a p e H t m l ( f i l e . f i l e n a m e ) } ' ) "   c l a s s = " p - 2   t e x t - r e d - 6 0 0   h o v e r : b g - r e d - 5 0   r o u n d e d   t r a n s i t i o n - a l l   o p a c i t y - 0   g r o u p - h o v e r : o p a c i t y - 1 0 0 "   t i t l e = " E l i m i n a r " > 
 
                                                 < i   d a t a - l u c i d e = " t r a s h - 2 "   c l a s s = " w - 4   h - 4 " > < / i > 
 
                                         < / b u t t o n > 
 
                                 < / d i v > 
 
                         < / d i v > 
 
                 ` ; 
 
         } ) . j o i n ( ' ' ) ; 
 
 
 
         i f   ( w i n d o w . l u c i d e )   l u c i d e . c r e a t e I c o n s ( ) ; 
 
 } 
 
 
 
 a s y n c   f u n c t i o n   u p l o a d K n o w l e d g e F i l e ( )   { 
 
         c o n s t   i n p u t   =   d o c u m e n t . c r e a t e E l e m e n t ( ' i n p u t ' ) ; 
 
         i n p u t . t y p e   =   ' f i l e ' ; 
 
         i n p u t . a c c e p t   =   ' . p d f , . d o c x , . t x t ' ; 
 
 
 
         i n p u t . o n c h a n g e   =   a s y n c   ( e )   = >   { 
 
                 c o n s t   f i l e   =   e . t a r g e t . f i l e s [ 0 ] ; 
 
                 i f   ( ! f i l e )   r e t u r n ; 
 
 
 
                 / /   S h o w   l o a d i n g   s t a t e 
 
                 c o n s t   c o n t a i n e r   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' k n o w l e d g e - f i l e s - l i s t ' ) ; 
 
                 c o n t a i n e r . i n s e r t A d j a c e n t H T M L ( ' a f t e r b e g i n ' ,   ` 
 
                         < d i v   i d = " u p l o a d - p r o g r e s s "   c l a s s = " p - 3   b g - b l u e - 5 0   r o u n d e d - l g   b o r d e r   b o r d e r - b l u e - 2 0 0   f l e x   i t e m s - c e n t e r   g a p - 3 " > 
 
                                 < i   d a t a - l u c i d e = " l o a d e r "   c l a s s = " w - 5   h - 5   t e x t - b l u e - 6 0 0   a n i m a t e - s p i n " > < / i > 
 
                                 < d i v   c l a s s = " f l e x - 1 " > 
 
                                         < p   c l a s s = " t e x t - s m   f o n t - b o l d   t e x t - b l u e - 9 0 0 " > S u b i e n d o   $ { e s c a p e H t m l ( f i l e . n a m e ) } . . . < / p > 
 
                                         < p   c l a s s = " t e x t - x s   t e x t - b l u e - 7 0 0 " > E s t o   p u e d e   t a r d a r   u n o s   s e g u n d o s < / p > 
 
                                 < / d i v > 
 
                         < / d i v > 
 
                 ` ) ; 
 
                 i f   ( w i n d o w . l u c i d e )   l u c i d e . c r e a t e I c o n s ( ) ; 
 
 
 
                 t r y   { 
 
                         c o n s t   f o r m D a t a   =   n e w   F o r m D a t a ( ) ; 
 
                         f o r m D a t a . a p p e n d ( ' f i l e ' ,   f i l e ) ; 
 
 
 
                         c o n s t   r e s p o n s e   =   a w a i t   f e t c h ( ' h t t p s : / / m y t v w f b i j l g b i h l e g m f g . s u p a b a s e . c o / f u n c t i o n s / v 1 / k n o w l e d g e - f i l e s ' ,   { 
 
                                 m e t h o d :   ' P O S T ' , 
 
                                 h e a d e r s :   { 
 
                                         ' A u t h o r i z a t i o n ' :   ` B e a r e r   $ { w i n d o w . s u p a b a s e C l i e n t . s u p a b a s e K e y } ` 
 
                                 } , 
 
                                 b o d y :   f o r m D a t a 
 
                         } ) ; 
 
 
 
                         i f   ( ! r e s p o n s e . o k )   { 
 
                                 c o n s t   e r r o r   =   a w a i t   r e s p o n s e . j s o n ( ) ; 
 
                                 t h r o w   n e w   E r r o r ( e r r o r . e r r o r   | |   ' U p l o a d   f a i l e d ' ) ; 
 
                         } 
 
 
 
                         / /   R e m o v e   p r o g r e s s   i n d i c a t o r 
 
                         d o c u m e n t . g e t E l e m e n t B y I d ( ' u p l o a d - p r o g r e s s ' ) ? . r e m o v e ( ) ; 
 
 
 
                         / /   S h o w   s u c c e s s   m e s s a g e 
 
                         s h o w T o a s t ( ' A r c h i v o   s u b i d o   e x i t o s a m e n t e .   P r o c e s a n d o . . . ' ,   ' s u c c e s s ' ) ; 
 
 
 
                         / /   R e l o a d   f i l e s   l i s t 
 
                         a w a i t   l o a d K n o w l e d g e F i l e s ( ) ; 
 
 
 
                 }   c a t c h   ( e r r o r )   { 
 
                         c o n s o l e . e r r o r ( ' [ K n o w l e d g e   F i l e s ]   U p l o a d   e r r o r : ' ,   e r r o r ) ; 
 
                         d o c u m e n t . g e t E l e m e n t B y I d ( ' u p l o a d - p r o g r e s s ' ) ? . r e m o v e ( ) ; 
 
                         s h o w T o a s t ( ` E r r o r :   $ { e r r o r . m e s s a g e } ` ,   ' e r r o r ' ) ; 
 
                 } 
 
         } ; 
 
 
 
         i n p u t . c l i c k ( ) ; 
 
 } 
 
 
 
 a s y n c   f u n c t i o n   v i e w K n o w l e d g e F i l e ( f i l e I d )   { 
 
         t r y   { 
 
                 c o n s t   r e s p o n s e   =   a w a i t   f e t c h ( ` h t t p s : / / m y t v w f b i j l g b i h l e g m f g . s u p a b a s e . c o / f u n c t i o n s / v 1 / k n o w l e d g e - f i l e s / $ { f i l e I d } ` ,   { 
 
                         h e a d e r s :   { 
 
                                 ' A u t h o r i z a t i o n ' :   ` B e a r e r   $ { w i n d o w . s u p a b a s e C l i e n t . s u p a b a s e K e y } ` 
 
                         } 
 
                 } ) ; 
 
 
 
                 i f   ( ! r e s p o n s e . o k )   t h r o w   n e w   E r r o r ( ' F a i l e d   t o   l o a d   f i l e ' ) ; 
 
 
 
                 c o n s t   {   f i l e   }   =   a w a i t   r e s p o n s e . j s o n ( ) ; 
 
 
 
                 / /   S h o w   m o d a l   w i t h   e x t r a c t e d   t e x t 
 
                 c o n s t   m o d a l   =   d o c u m e n t . c r e a t e E l e m e n t ( ' d i v ' ) ; 
 
                 m o d a l . c l a s s N a m e   =   ' f i x e d   i n s e t - 0   b g - b l a c k   b g - o p a c i t y - 5 0   f l e x   i t e m s - c e n t e r   j u s t i f y - c e n t e r   z - 5 0   p - 4 ' ; 
 
                 m o d a l . i n n e r H T M L   =   ` 
 
                         < d i v   c l a s s = " b g - w h i t e   r o u n d e d - x l   s h a d o w - 2 x l   m a x - w - 4 x l   w - f u l l   m a x - h - [ 9 0 v h ]   f l e x   f l e x - c o l " > 
 
                                 < d i v   c l a s s = " p - 6   b o r d e r - b   b o r d e r - s l a t e - 2 0 0   f l e x   i t e m s - c e n t e r   j u s t i f y - b e t w e e n " > 
 
                                         < d i v > 
 
                                                 < h 3   c l a s s = " t e x t - x l   f o n t - b o l d   t e x t - s l a t e - 8 0 0 " > $ { e s c a p e H t m l ( f i l e . f i l e n a m e ) } < / h 3 > 
 
                                                 < p   c l a s s = " t e x t - s m   t e x t - s l a t e - 5 0 0 " > C o n t e n i d o   e x t r a Ã ­ d o < / p > 
 
                                         < / d i v > 
 
                                         < b u t t o n   o n c l i c k = " t h i s . c l o s e s t ( ' . f i x e d ' ) . r e m o v e ( ) "   c l a s s = " p - 2   h o v e r : b g - s l a t e - 1 0 0   r o u n d e d - l g   t r a n s i t i o n - a l l " > 
 
                                                 < i   d a t a - l u c i d e = " x "   c l a s s = " w - 5   h - 5 " > < / i > 
 
                                         < / b u t t o n > 
 
                                 < / d i v > 
 
                                 < d i v   c l a s s = " p - 6   o v e r f l o w - y - a u t o   f l e x - 1 " > 
 
                                         < p r e   c l a s s = " w h i t e s p a c e - p r e - w r a p   t e x t - s m   t e x t - s l a t e - 7 0 0   f o n t - m o n o   b g - s l a t e - 5 0   p - 4   r o u n d e d - l g   b o r d e r   b o r d e r - s l a t e - 2 0 0 " > $ { e s c a p e H t m l ( f i l e . e x t r a c t e d _ t e x t   | |   ' N o   h a y   c o n t e n i d o   e x t r a Ã ­ d o ' ) } < / p r e > 
 
                                 < / d i v > 
 
                         < / d i v > 
 
                 ` ; 
 
                 d o c u m e n t . b o d y . a p p e n d C h i l d ( m o d a l ) ; 
 
                 i f   ( w i n d o w . l u c i d e )   l u c i d e . c r e a t e I c o n s ( ) ; 
 
 
 
                 / /   C l o s e   o n   b a c k g r o u n d   c l i c k 
 
                 m o d a l . a d d E v e n t L i s t e n e r ( ' c l i c k ' ,   ( e )   = >   { 
 
                         i f   ( e . t a r g e t   = = =   m o d a l )   m o d a l . r e m o v e ( ) ; 
 
                 } ) ; 
 
 
 
         }   c a t c h   ( e r r o r )   { 
 
                 c o n s o l e . e r r o r ( ' [ K n o w l e d g e   F i l e s ]   V i e w   e r r o r : ' ,   e r r o r ) ; 
 
                 s h o w T o a s t ( ' E r r o r   a l   c a r g a r   e l   a r c h i v o ' ,   ' e r r o r ' ) ; 
 
         } 
 
 } 
 
 
 
 a s y n c   f u n c t i o n   d e l e t e K n o w l e d g e F i l e ( f i l e I d ,   f i l e n a m e )   { 
 
         i f   ( ! c o n f i r m ( ` Â ¿ E s t Ã ¡ s   s e g u r o   d e   e l i m i n a r   " $ { f i l e n a m e } " ?   E s t a   a c c i Ã ³ n   n o   s e   p u e d e   d e s h a c e r . ` ) )   { 
 
                 r e t u r n ; 
 
         } 
 
 
 
         t r y   { 
 
                 c o n s t   r e s p o n s e   =   a w a i t   f e t c h ( ` h t t p s : / / m y t v w f b i j l g b i h l e g m f g . s u p a b a s e . c o / f u n c t i o n s / v 1 / k n o w l e d g e - f i l e s / $ { f i l e I d } ` ,   { 
 
                         m e t h o d :   ' D E L E T E ' , 
 
                         h e a d e r s :   { 
 
                                 ' A u t h o r i z a t i o n ' :   ` B e a r e r   $ { w i n d o w . s u p a b a s e C l i e n t . s u p a b a s e K e y } ` 
 
                         } 
 
                 } ) ; 
 
 
 
                 i f   ( ! r e s p o n s e . o k )   t h r o w   n e w   E r r o r ( ' F a i l e d   t o   d e l e t e   f i l e ' ) ; 
 
 
 
                 s h o w T o a s t ( ' A r c h i v o   e l i m i n a d o   e x i t o s a m e n t e ' ,   ' s u c c e s s ' ) ; 
 
                 a w a i t   l o a d K n o w l e d g e F i l e s ( ) ; 
 
 
 
         }   c a t c h   ( e r r o r )   { 
 
                 c o n s o l e . e r r o r ( ' [ K n o w l e d g e   F i l e s ]   D e l e t e   e r r o r : ' ,   e r r o r ) ; 
 
                 s h o w T o a s t ( ' E r r o r   a l   e l i m i n a r   e l   a r c h i v o ' ,   ' e r r o r ' ) ; 
 
         } 
 
 } 
 
 
 
 / /   H e l p e r   f u n c t i o n s 
 
 f u n c t i o n   f o r m a t F i l e S i z e ( b y t e s )   { 
 
         i f   ( b y t e s   <   1 0 2 4 )   r e t u r n   b y t e s   +   '   B ' ; 
 
         i f   ( b y t e s   <   1 0 2 4   *   1 0 2 4 )   r e t u r n   ( b y t e s   /   1 0 2 4 ) . t o F i x e d ( 1 )   +   '   K B ' ; 
 
         r e t u r n   ( b y t e s   /   ( 1 0 2 4   *   1 0 2 4 ) ) . t o F i x e d ( 1 )   +   '   M B ' ; 
 
 } 
 
 
 
 f u n c t i o n   f o r m a t R e l a t i v e D a t e ( d a t e S t r i n g )   { 
 
         c o n s t   d a t e   =   n e w   D a t e ( d a t e S t r i n g ) ; 
 
         c o n s t   n o w   =   n e w   D a t e ( ) ; 
 
         c o n s t   d i f f M s   =   n o w   -   d a t e ; 
 
         c o n s t   d i f f D a y s   =   M a t h . f l o o r ( d i f f M s   /   ( 1 0 0 0   *   6 0   *   6 0   *   2 4 ) ) ; 
 
 
 
         i f   ( d i f f D a y s   = = =   0 )   r e t u r n   ' H o y ' ; 
 
         i f   ( d i f f D a y s   = = =   1 )   r e t u r n   ' A y e r ' ; 
 
         i f   ( d i f f D a y s   <   7 )   r e t u r n   ` H a c e   $ { d i f f D a y s }   d Ã ­ a s ` ; 
 
         i f   ( d i f f D a y s   <   3 0 )   r e t u r n   ` H a c e   $ { M a t h . f l o o r ( d i f f D a y s   /   7 ) }   s e m a n a s ` ; 
 
         r e t u r n   ` H a c e   $ { M a t h . f l o o r ( d i f f D a y s   /   3 0 ) }   m e s e s ` ; 
 
 } 
 
 
 
 f u n c t i o n   s h o w T o a s t ( m e s s a g e ,   t y p e   =   ' i n f o ' )   { 
 
         c o n s t   t o a s t   =   d o c u m e n t . c r e a t e E l e m e n t ( ' d i v ' ) ; 
 
         c o n s t   b g C o l o r   =   t y p e   = = =   ' s u c c e s s '   ?   ' b g - g r e e n - 5 0 0 '   :   t y p e   = = =   ' e r r o r '   ?   ' b g - r e d - 5 0 0 '   :   ' b g - b l u e - 5 0 0 ' ; 
 
         t o a s t . c l a s s N a m e   =   ` f i x e d   b o t t o m - 4   r i g h t - 4   $ { b g C o l o r }   t e x t - w h i t e   p x - 6   p y - 3   r o u n d e d - l g   s h a d o w - l g   z - 5 0   a n i m a t e - f a d e - i n ` ; 
 
         t o a s t . t e x t C o n t e n t   =   m e s s a g e ; 
 
         d o c u m e n t . b o d y . a p p e n d C h i l d ( t o a s t ) ; 
 
 
 
         s e t T i m e o u t ( ( )   = >   { 
 
                 t o a s t . c l a s s L i s t . a d d ( ' a n i m a t e - f a d e - o u t ' ) ; 
 
                 s e t T i m e o u t ( ( )   = >   t o a s t . r e m o v e ( ) ,   3 0 0 ) ; 
 
         } ,   3 0 0 0 ) ; 
 
 } 
 
 
 
 / /   M a k e   f u n c t i o n s   g l o b a l l y   a v a i l a b l e 
 
 w i n d o w . u p l o a d K n o w l e d g e F i l e   =   u p l o a d K n o w l e d g e F i l e ; 
 
 w i n d o w . v i e w K n o w l e d g e F i l e   =   v i e w K n o w l e d g e F i l e ; 
 
 w i n d o w . d e l e t e K n o w l e d g e F i l e   =   d e l e t e K n o w l e d g e F i l e ; 
 
 w i n d o w . l o a d K n o w l e d g e F i l e s   =   l o a d K n o w l e d g e F i l e s ; 
 
 
