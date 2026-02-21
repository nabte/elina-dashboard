// auto-responses.js - Gestión de Respuestas Automáticas (Text Triggers)

let autoResponsesData = [];

// Inicializar cuando el panel se active
document.addEventListener('panel:activated', async (e) => {
    if (e.detail.panelId === 'auto-responses' || e.detail.tabId === 'auto-responses') {
        await initAutoResponses();
    }
});

async function initAutoResponses() {
    const container = document.getElementById('auto-responses-content');
    if (!container) return;

    const userId = await window.getUserId();
    if (!userId) {
        container.innerHTML = '<p class="text-red-500">Error: No se pudo obtener el ID del usuario</p>';
        return;
    }

    // Cargar respuestas automáticas
    await loadAutoResponses(userId);

    // Renderizar UI
    renderAutoResponsesUI(container);
}

async function loadAutoResponses(userId) {
    try {
        const { data, error } = await window.auth.sb
            .from('automation_rules')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'auto_response')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Mapear los datos de automation_rules al formato esperado por el frontend
        autoResponsesData = (data || []).map(r => ({
            id: r.id,
            trigger_text: r.trigger_config?.keyword || '',
            response_text: r.action_config?.response_text || '',
            is_active: r.is_active,
            match_type: r.trigger_config?.match_type || 'exact',
            media_type: r.action_config?.media_type || 'text',
            media_url: r.action_config?.media_url || null,
            _raw: r // Guardar el original por si acaso
        }));

        // Asegurar que las respuestas por defecto existan (si no existen, crearlas)
        await ensureDefaultExamples(userId);

        // Recargar después de asegurar defaults
        const { data: updatedData, error: reloadError } = await window.auth.sb
            .from('automation_rules')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'auto_response')
            .order('created_at', { ascending: false });

        if (reloadError) throw reloadError;

        autoResponsesData = (updatedData || []).map(r => ({
            id: r.id,
            trigger_text: r.trigger_config?.keyword || '',
            response_text: r.action_config?.response_text || '',
            is_active: r.is_active,
            match_type: r.trigger_config?.match_type || 'exact',
            media_type: r.action_config?.media_type || 'text',
            media_url: r.action_config?.media_url || null,
            _raw: r
        }));
    } catch (error) {
        console.error('[Auto Responses] Error al cargar:', error);
        window.showToast?.('Error al cargar respuestas automáticas', 'error');
    }
}

// Definir las respuestas por defecto (identificadas por trigger_text único)
const DEFAULT_EXAMPLES = [
    {
        trigger_text: 'Hola, vi tu anuncio en Facebook',
        response_text: '¡Hola! Gracias por contactarnos. Estamos aquí para ayudarte. ¿En qué podemos asistirte hoy?',
        is_active: false,
        match_type: 'contains'
    },
    {
        trigger_text: 'Información',
        response_text: 'Con gusto te proporcionamos información. ¿Sobre qué producto o servicio te gustaría saber más?',
        is_active: false,
        match_type: 'contains'
    },
    {
        trigger_text: 'Precio',
        response_text: 'Nuestros precios varían según el producto. ¿Podrías decirme qué producto te interesa para darte un precio exacto?',
        is_active: false,
        match_type: 'contains'
    }
];

async function ensureDefaultExamples(userId) {
    try {
        // Obtener todos los trigger_text existentes del usuario (normalizados para comparación)
        const existingTriggers = new Set(
            autoResponsesData.map(r => r.trigger_text.toLowerCase().trim())
        );

        // Crear solo las que no existen
        const toCreate = [];
        for (const example of DEFAULT_EXAMPLES) {
            const normalizedTrigger = example.trigger_text.toLowerCase().trim();

            // Verificar si ya existe una respuesta con este trigger_text exacto
            if (!existingTriggers.has(normalizedTrigger)) {
                toCreate.push(example);
            }
        }

        // Crear todas las que faltan en un solo batch (más eficiente)
        if (toCreate.length > 0) {
            const inserts = toCreate.map(example => ({
                user_id: userId,
                name: `Respuesta: ${example.trigger_text.substring(0, 30)}`,
                type: 'auto_response',
                trigger_type: 'keyword',
                trigger_config: {
                    keyword: example.trigger_text,
                    match_type: example.match_type || 'contains'
                },
                action_type: 'send_message',
                action_config: {
                    response_text: example.response_text,
                    media_type: 'text'
                },
                is_active: example.is_active || false,
                priority: 10
            }));

            const { error } = await window.auth.sb
                .from('automation_rules')
                .insert(inserts);

            if (error) {
                console.error('[Auto Responses] Error al crear ejemplos por defecto:', error);
            } else {
                // console.log(`[Auto Responses] ${toCreate.length} respuesta(s) por defecto creada(s)`);
            }
        }
    } catch (error) {
        console.error('[Auto Responses] Error al asegurar ejemplos predeterminados:', error);
    }
}

function renderAutoResponsesUI(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-2xl sm:text-3xl font-bold">Respuestas Programadas</h2>
                    <p class="text-slate-500 mt-1">Responde automáticamente cuando detecte estos mensajes</p>
                </div>
                <button id="add-auto-response-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i> Agregar Respuesta
                </button>
            </div>

            <div id="auto-responses-list" class="space-y-4">
                ${autoResponsesData.map((response, index) => renderAutoResponseItem(response, index)).join('')}
            </div>

            <div id="new-auto-response-form" class="hidden bg-white rounded-xl shadow-md p-6">
                <h3 class="text-xl font-bold mb-4">Nueva Respuesta Automática</h3>
                <form id="auto-response-form" class="space-y-4">
                    <div>
                        <label class="block font-medium mb-2">Espero este texto:</label>
                        <input type="text" id="trigger-text-input" class="form-input w-full" placeholder="Ej: Hola, vi tu anuncio" required>
                        <p class="text-xs text-slate-500 mt-1">El sistema buscará este texto en los mensajes entrantes</p>
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Envío este texto:</label>
                        <textarea id="response-text-input" rows="4" class="form-input w-full" placeholder="Ej: ¡Hola! Gracias por contactarnos..." required></textarea>
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Tipo de respuesta:</label>
                        <select id="media-type-input" class="form-input w-full">
                            <option value="text" selected>Solo texto</option>
                            <option value="image">Imagen</option>
                            <option value="video">Video</option>
                        </select>
                        <p class="text-xs text-slate-500 mt-1">Selecciona el tipo de contenido a enviar</p>
                    </div>
                    <div id="media-upload-container" class="hidden">
                        <label class="block font-medium mb-2">Archivo multimedia:</label>
                        <input type="file" id="media-file-input" class="form-input w-full" accept="image/*,video/*">
                        <p id="media-upload-help-text" class="text-xs text-slate-500 mt-1">Sube una imagen o video</p>
                        <div id="media-preview" class="mt-2 hidden">
                            <div class="flex items-center gap-2 p-2 bg-slate-50 rounded">
                                <span id="media-preview-text" class="text-sm text-slate-600"></span>
                                <button type="button" id="remove-media-btn" class="text-red-500 hover:text-red-700">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                        <div id="media-upload-progress" class="mt-3 hidden">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-xs font-semibold text-green-600">Subiendo archivo...</span>
                                <span id="media-progress-percent" class="text-xs font-bold text-green-600">0%</span>
                            </div>
                            <div class="w-full bg-slate-200 rounded-full h-2">
                                <div id="media-progress-bar" class="bg-green-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="relative inline-flex items-center cursor-pointer" id="is-active-input-switch" data-active="false">
                            <div class="relative w-11 h-6 bg-slate-200 rounded-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            <span class="ml-3 text-sm font-medium text-slate-700">Activar automáticamente</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <select id="match-type-input" class="form-input">
                                <option value="exact">Coincidencia exacta</option>
                                <option value="contains" selected>Contiene el texto</option>
                            </select>
                            <button type="button" id="help-match-type-btn" class="text-blue-500 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-50 transition-colors" title="¿Cómo funciona?">
                                <i data-lucide="help-circle" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2">
                        <button type="button" id="cancel-auto-response-btn" class="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg">Cancelar</button>
                        <button type="submit" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Inicializar iconos
    if (window.lucide) {
        lucide.createIcons();
    }
}

function renderAutoResponseItem(response, index) {
    // Verificar si está en modo edición
    const isEditing = response._editing === true;

    if (isEditing) {
        return `
            <div class="bg-white rounded-xl shadow-md p-6 border-2 border-blue-500" data-response-id="${response.id}">
                <h4 class="text-lg font-bold mb-4 text-blue-600">Editando Respuesta</h4>
                <form class="edit-auto-response-form space-y-4" data-response-id="${response.id}">
                    <div>
                        <label class="block font-medium mb-2">Espero este texto:</label>
                        <input type="text" class="edit-trigger-text form-input w-full" value="${escapeHtml(response.trigger_text)}" required>
                        <p class="text-xs text-slate-500 mt-1">El sistema buscará este texto en los mensajes entrantes</p>
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Envío este texto:</label>
                        <textarea class="edit-response-text form-input w-full" rows="4" required>${escapeHtml(response.response_text)}</textarea>
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Tipo de respuesta:</label>
                        <select class="edit-media-type form-input w-full" data-response-id="${response.id}">
                            <option value="text" ${response.media_type === 'text' || !response.media_type ? 'selected' : ''}>Solo texto</option>
                            <option value="image" ${response.media_type === 'image' ? 'selected' : ''}>Imagen</option>
                            <option value="video" ${response.media_type === 'video' ? 'selected' : ''}>Video</option>
                        </select>
                    </div>
                    <div class="edit-media-upload-container ${response.media_type && response.media_type !== 'text' ? '' : 'hidden'}">
                        <label class="block font-medium mb-2">Archivo multimedia:</label>
                        <input type="file" class="edit-media-file-input form-input w-full" data-response-id="${response.id}" accept="${response.media_type === 'video' ? 'video/*' : 'image/*'}">
                        <p class="edit-media-upload-help-text text-xs text-slate-500 mt-1">
                            ${response.media_type === 'video' ? 'Selecciona un archivo de video' : 'Selecciona una imagen'}
                        </p>
                        ${response.media_url ? `
                            <div class="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                                <p class="text-xs text-slate-600 flex items-center gap-2">
                                    <i data-lucide="link" class="w-3 h-3"></i>
                                    Archivo actual: <a href="${response.media_url}" target="_blank" class="text-blue-500 hover:underline">Ver archivo</a>
                                </p>
                            </div>
                        ` : ''}
                        
                        <div class="edit-media-upload-progress mt-3 hidden">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-xs font-semibold text-blue-600">Subiendo archivo...</span>
                                <span class="edit-media-progress-percent text-xs font-bold text-blue-600">0%</span>
                            </div>
                            <div class="w-full bg-slate-200 rounded-full h-2">
                                <div class="edit-media-progress-bar bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="relative inline-flex items-center cursor-pointer edit-is-active-switch" data-response-id="${response.id}" data-active="${response.is_active}">
                            <div class="relative w-11 h-6 rounded-full ${response.is_active ? 'bg-green-600' : 'bg-slate-200'} after:absolute after:top-[2px] ${response.is_active ? 'after:left-[22px]' : 'after:left-[2px]'} after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            <span class="ml-3 text-sm font-medium text-slate-700">Activar automáticamente</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <select class="edit-match-type form-input">
                                <option value="exact" ${response.match_type === 'exact' ? 'selected' : ''}>Coincidencia exacta</option>
                                <option value="contains" ${response.match_type === 'contains' ? 'selected' : ''}>Contiene el texto</option>
                            </select>
                            <button type="button" class="help-match-type-btn text-blue-500 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-50 transition-colors" title="¿Cómo funciona?">
                                <i data-lucide="help-circle" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" class="cancel-edit-btn bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg" data-response-id="${response.id}">Cancelar</button>
                        <button type="submit" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
    }

    return `
        <div class="bg-white rounded-xl shadow-md p-6" data-response-id="${response.id}">
            <div class="flex items-start justify-between gap-4">
                <div class="flex-1 space-y-3">
                    <div class="flex items-center gap-3">
                        <div class="relative inline-flex items-center cursor-pointer auto-response-toggle-switch" data-response-id="${response.id}" data-active="${response.is_active}">
                            <div class="w-11 h-6 rounded-full ${response.is_active ? 'bg-green-600' : 'bg-slate-200'} after:absolute after:top-[2px] ${response.is_active ? 'after:left-[22px]' : 'after:left-[2px]'} after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            <span class="ml-3 text-sm font-medium text-slate-700">${response.is_active ? 'Activa' : 'Inactiva'}</span>
                        </div>
                        <span class="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded">
                            ${response.match_type === 'exact' ? 'Coincidencia exacta' : 'Contiene'}
                        </span>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-slate-600 mb-1">Espero este texto:</p>
                        <p class="text-slate-800 bg-slate-50 p-2 rounded">${escapeHtml(response.trigger_text)}</p>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-slate-600 mb-1">Envío este texto:</p>
                        <p class="text-slate-800 bg-slate-50 p-2 rounded">${escapeHtml(response.response_text)}</p>
                    </div>
                    ${response.media_type && response.media_type !== 'text' ? `
                    <div>
                        <p class="text-sm font-semibold text-slate-600 mb-1">Tipo de media:</p>
                        <p class="text-slate-800 bg-slate-50 p-2 rounded">${response.media_type === 'image' ? 'Imagen' : response.media_type === 'video' ? 'Video' : response.media_type}</p>
                        ${response.media_url ? `<a href="${response.media_url}" target="_blank" class="text-blue-500 hover:underline text-xs">Ver archivo</a>` : ''}
                    </div>
                    ` : ''}
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="editAutoResponse('${response.id}')" class="text-blue-500 hover:text-blue-700 p-2" title="Editar">
                        <i data-lucide="edit-2" class="w-5 h-5"></i>
                    </button>
                    <button onclick="deleteAutoResponse('${response.id}')" class="text-red-500 hover:text-red-700 p-2" title="Eliminar">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// --- GESTIÓN DE EVENTOS (DELEGACIÓN) ---
// Se registran una sola vez a nivel de documento
(function initAutoResponseEventListeners() {
    // Evitar doble registro si el script se carga varias veces
    if (window._autoResponseListenersInitialized) return;
    window._autoResponseListenersInitialized = true;

    // console.log('[Auto Responses] Inicializando listeners globales de delegación');

    // Listener para Envío de Formularios (Nuevo y Edición)
    document.addEventListener('submit', async (e) => {
        const target = e.target;
        // Formulario Nuevo
        if (target.id === 'auto-response-form') {
            e.preventDefault();
            await saveAutoResponse();
        }
        // Formulario Edición
        else if (target.classList.contains('edit-auto-response-form')) {
            e.preventDefault();
            const responseId = target.dataset.responseId;
            await updateAutoResponse(responseId);
        }
    });

    // Listener para Clics (Delegación)
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Botón agregar nueva respuesta
        if (target.closest('#add-auto-response-btn')) {
            const form = document.getElementById('new-auto-response-form');
            if (form) {
                form.classList.remove('hidden');
                form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        // Botón cancelar nueva respuesta
        if (target.closest('#cancel-auto-response-btn')) {
            const form = document.getElementById('new-auto-response-form');
            if (form) {
                form.classList.add('hidden');
                form.reset();
                document.getElementById('media-upload-container')?.classList.add('hidden');
                document.getElementById('media-preview')?.classList.add('hidden');
            }
        }

        // Botón cancelar edición
        if (target.closest('.cancel-edit-btn')) {
            const btn = target.closest('.cancel-edit-btn');
            const responseId = btn.dataset.responseId;
            cancelEditAutoResponse(responseId);
        }

        // Botones de ayuda (Nuevo y Edición)
        if (target.closest('#help-match-type-btn') || target.closest('.help-match-type-btn')) {
            showMatchTypeHelp();
        }

        // Botón remover media
        if (target.closest('#remove-media-btn')) {
            const input = document.getElementById('media-file-input');
            const preview = document.getElementById('media-preview');
            if (input) input.value = '';
            if (preview) preview.classList.add('hidden');
        }

        // Toggle switches en la lista
        const toggleSwitch = target.closest('.auto-response-toggle-switch');
        if (toggleSwitch) {
            const responseId = toggleSwitch.dataset.responseId;
            const currentActive = toggleSwitch.dataset.active === 'true';
            const newActive = !currentActive;
            toggleAutoResponse(responseId, newActive);
        }

        // Toggle switch en formulario nuevo
        const newSwitch = target.closest('#is-active-input-switch');
        if (newSwitch) {
            const currentActive = newSwitch.dataset.active === 'true';
            const newActive = !currentActive;
            newSwitch.dataset.active = newActive.toString();

            const div = newSwitch.querySelector('div');
            if (div) {
                div.className = `relative w-11 h-6 rounded-full transition-all ${newActive ? 'bg-green-600' : 'bg-slate-200'} after:absolute after:top-[2px] ${newActive ? 'after:left-[22px]' : 'after:left-[2px]'} after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`;
            }
        }

        // Toggle switch en formulario de edición
        const editSwitch = target.closest('.edit-is-active-switch');
        if (editSwitch) {
            const currentActive = editSwitch.dataset.active === 'true';
            const newActive = !currentActive;
            editSwitch.dataset.active = newActive.toString();

            const div = editSwitch.querySelector('div');
            if (div) {
                div.className = `relative w-11 h-6 rounded-full transition-all ${newActive ? 'bg-green-600' : 'bg-slate-200'} after:absolute after:top-[2px] ${newActive ? 'after:left-[22px]' : 'after:left-[2px]'} after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`;
            }
        }
    });

    // Listener para Cambios (Selector de Media)
    document.addEventListener('change', (e) => {
        const target = e.target;

        // Tipo de media en formulario nuevo
        if (target.id === 'media-type-input') {
            const container = document.getElementById('media-upload-container');
            const fileInput = document.getElementById('media-file-input');
            const helpText = document.getElementById('media-upload-help-text');

            if (container && fileInput) {
                const type = target.value;
                if (type !== 'text') {
                    container.classList.remove('hidden');
                    fileInput.accept = type === 'image' ? 'image/*' : 'video/*';
                    if (helpText) {
                        helpText.textContent = type === 'image' ? 'Sube una imagen (JPG, PNG, WEBP)' : 'Sube un video (MP4)';
                    }
                } else {
                    container.classList.add('hidden');
                }
            }
        }

        // Tipo de media en formulario de edición
        if (target.classList.contains('edit-media-type')) {
            const form = target.closest('.edit-auto-response-form');
            const container = form?.querySelector('.edit-media-upload-container');
            const fileInput = form?.querySelector('.edit-media-file-input');
            const helpText = form?.querySelector('.edit-media-upload-help-text');

            if (container && fileInput) {
                const type = target.value;
                if (type !== 'text') {
                    container.classList.remove('hidden');
                    fileInput.accept = type === 'image' ? 'image/*' : 'video/*';
                    if (helpText) {
                        helpText.textContent = type === 'image' ? 'Selecciona una imagen' : 'Selecciona un archivo de video';
                    }
                } else {
                    container.classList.add('hidden');
                }
            }
        }
    });
})();

function showMatchTypeHelp() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-2xl font-bold text-slate-800">¿Cómo funcionan los tipos de coincidencia?</h3>
                    <button class="close-help-modal text-slate-400 hover:text-slate-600 p-1">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                
                <div class="space-y-6">
                    <!-- Coincidencia Exacta -->
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <h4 class="font-bold text-lg text-blue-800 mb-3 flex items-center gap-2">
                            <i data-lucide="check-circle" class="w-5 h-5"></i>
                            Coincidencia Exacta
                        </h4>
                        <p class="text-slate-700 mb-3">
                            El mensaje del usuario debe ser <strong>exactamente igual</strong> al texto configurado (ignora mayúsculas/minúsculas y espacios al inicio/final).
                        </p>
                        <div class="bg-white rounded p-3 space-y-2 text-sm">
                            <div class="flex items-start gap-2">
                                <span class="text-green-600 font-bold">✅</span>
                                <div>
                                    <strong>Texto configurado:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Hola</code><br>
                                    <strong>Mensaje:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Hola</code> → <span class="text-green-600 font-semibold">Coincide</span>
                                </div>
                            </div>
                            <div class="flex items-start gap-2">
                                <span class="text-green-600 font-bold">✅</span>
                                <div>
                                    <strong>Texto configurado:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Hola</code><br>
                                    <strong>Mensaje:</strong> <code class="bg-slate-100 px-2 py-1 rounded">hola</code> → <span class="text-green-600 font-semibold">Coincide</span> (ignora mayúsculas)
                                </div>
                            </div>
                            <div class="flex items-start gap-2">
                                <span class="text-red-600 font-bold">❌</span>
                                <div>
                                    <strong>Texto configurado:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Hola</code><br>
                                    <strong>Mensaje:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Hola, cómo estás?</code> → <span class="text-red-600 font-semibold">NO coincide</span> (tiene texto adicional)
                                </div>
                            </div>
                        </div>
                        <p class="text-sm text-slate-600 mt-2">
                            <strong>Cuándo usar:</strong> Para comandos específicos como "Sí", "No", "Cancelar", "Hola"
                        </p>
                    </div>

                    <!-- Contiene el texto -->
                    <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                        <h4 class="font-bold text-lg text-green-800 mb-3 flex items-center gap-2">
                            <i data-lucide="search" class="w-5 h-5"></i>
                            Contiene el texto ⭐ <span class="text-sm font-normal text-green-700">(Recomendado)</span>
                        </h4>
                        <p class="text-slate-700 mb-3">
                            El mensaje del usuario debe <strong>contener</strong> el texto configurado en cualquier parte (ignora mayúsculas/minúsculas).
                        </p>
                        <div class="bg-white rounded p-3 space-y-2 text-sm">
                            <div class="flex items-start gap-2">
                                <span class="text-green-600 font-bold">✅</span>
                                <div>
                                    <strong>Texto configurado:</strong> <code class="bg-slate-100 px-2 py-1 rounded">vi tu anuncio</code><br>
                                    <strong>Mensaje:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Hola, vi tu anuncio en Facebook</code> → <span class="text-green-600 font-semibold">Coincide</span>
                                </div>
                            </div>
                            <div class="flex items-start gap-2">
                                <span class="text-green-600 font-bold">✅</span>
                                <div>
                                    <strong>Texto configurado:</strong> <code class="bg-slate-100 px-2 py-1 rounded">vi tu anuncio</code><br>
                                    <strong>Mensaje:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Vi tu anuncio</code> → <span class="text-green-600 font-semibold">Coincide</span>
                                </div>
                            </div>
                            <div class="flex items-start gap-2">
                                <span class="text-green-600 font-bold">✅</span>
                                <div>
                                    <strong>Texto configurado:</strong> <code class="bg-slate-100 px-2 py-1 rounded">vi tu anuncio</code><br>
                                    <strong>Mensaje:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Hola vi tu anuncio</code> → <span class="text-green-600 font-semibold">Coincide</span>
                                </div>
                            </div>
                            <div class="flex items-start gap-2">
                                <span class="text-red-600 font-bold">❌</span>
                                <div>
                                    <strong>Texto configurado:</strong> <code class="bg-slate-100 px-2 py-1 rounded">vi tu anuncio</code><br>
                                    <strong>Mensaje:</strong> <code class="bg-slate-100 px-2 py-1 rounded">Hola, cómo estás?</code> → <span class="text-red-600 font-semibold">NO coincide</span>
                                </div>
                            </div>
                        </div>
                        <p class="text-sm text-slate-600 mt-2">
                            <strong>Cuándo usar:</strong> Para la mayoría de casos. Es más flexible y captura variaciones naturales del mensaje.
                        </p>
                    </div>

                    <!-- Consejo -->
                    <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                        <h4 class="font-bold text-lg text-yellow-800 mb-2 flex items-center gap-2">
                            <i data-lucide="lightbulb" class="w-5 h-5"></i>
                            💡 Consejo
                        </h4>
                        <p class="text-slate-700">
                            Usa <strong>"Contiene el texto"</strong> para la mayoría de casos. Es más flexible y captura variaciones naturales del mensaje que los usuarios pueden escribir.
                        </p>
                    </div>
                </div>

                <div class="mt-6 flex justify-end">
                    <button class="close-help-modal bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors">
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Inicializar iconos de Lucide
    if (window.lucide) {
        lucide.createIcons();
    }

    // Cerrar modal
    const closeModal = () => {
        modal.remove();
    };

    modal.querySelectorAll('.close-help-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

async function uploadMediaFile(file, userId, onProgress) {
    if (!file) {
        console.warn('[Auto Responses] uploadMediaFile llamado sin archivo');
        return null;
    }
    // console.log(`[Auto Responses] Iniciando subida: ${file.name} (${file.type}, ${file.size} bytes)`);

    try {
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const tempPath = `temp-uploads/${userId}/auto-responses/${Date.now()}-${safeFileName}`;

        // console.log(`[Auto Responses] 1. Subiendo a Supabase Storage: ${tempPath}`);
        // 1. Subir a Supabase Storage temporal
        const { error: uploadError } = await window.auth.sb.storage
            .from('campaign_files')
            .upload(tempPath, file, {
                onUploadProgress: (progress) => {
                    if (onProgress) {
                        const percent = Math.round((progress.loaded / progress.total) * 50); // 0-50%
                        onProgress(percent);
                    }
                }
            });

        if (uploadError) throw new Error(`Error en subida: ${uploadError.message}`);

        if (onProgress) onProgress(60);

        // 2. Obtener URL pública
        const { data: urlData } = window.auth.sb.storage
            .from('campaign_files')
            .getPublicUrl(tempPath);

        // console.log(`[Auto Responses] 2. URL pública obtenida: ${urlData.publicUrl}`);
        if (onProgress) onProgress(70);

        // 3. Mover a CDN (Bunny.net) usando smart-worker
        // console.log(`[Auto Responses] 3. Invocando smart-worker para mover a Bunny.net...`);
        const { data: bunnyData, error: functionError } = await window.auth.invokeFunction('smart-worker', {
            body: {
                sourceUrl: urlData.publicUrl,
                userId,
                fileName: safeFileName,
                folder: 'auto-responses'
            }
        });

        if (functionError) {
            console.error('[Auto Responses] Error en smart-worker:', functionError);
            throw new Error(`Error al mover a CDN: ${functionError.message}`);
        }

        // console.log(`[Auto Responses] 3. Éxito smart-worker, cdnUrl: ${bunnyData?.cdnUrl}`);
        if (onProgress) onProgress(90);

        // 4. Limpiar archivo temporal
        await window.auth.sb.storage.from('campaign_files').remove([tempPath]);

        if (onProgress) onProgress(100);

        return bunnyData?.cdnUrl || null;
    } catch (error) {
        console.error('[Auto Responses] Error al subir archivo:', error);
        throw error;
    }
}

async function saveAutoResponse() {
    // console.log('[Auto Responses] saveAutoResponse activado');
    const userId = await window.getUserId();
    if (!userId) {
        console.error('[Auto Responses] No se pudo obtener userId');
        return;
    }

    const triggerText = document.getElementById('trigger-text-input').value.trim();
    const responseText = document.getElementById('response-text-input').value.trim();
    const isActiveSwitch = document.getElementById('is-active-input-switch');
    const isActive = isActiveSwitch ? isActiveSwitch.dataset.active === 'true' : false;
    const matchType = document.getElementById('match-type-input').value;
    const mediaType = document.getElementById('media-type-input').value;
    const mediaFile = document.getElementById('media-file-input').files[0];

    if (!triggerText || !responseText) {
        window.showToast?.('Por favor completa todos los campos', 'error');
        return;
    }

    // Validar que si hay tipo de media, haya archivo
    if (mediaType !== 'text' && !mediaFile) {
        window.showToast?.('Por favor selecciona un archivo para el tipo de media seleccionado', 'error');
        return;
    }

    try {
        let mediaUrl = null;

        // Subir archivo si existe
        if (mediaFile) {
            const progressContainer = document.getElementById('media-upload-progress');
            const progressBar = document.getElementById('media-progress-bar');
            const progressPercent = document.getElementById('media-progress-percent');

            if (progressContainer && progressBar) {
                progressContainer.classList.remove('hidden');
                progressBar.style.width = '0%';
                if (progressPercent) progressPercent.textContent = '0%';
            }

            // Desactivar botón de guardado
            const submitBtn = document.querySelector('#auto-response-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="flex items-center gap-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Guardando...</span>';
            }

            try {
                mediaUrl = await uploadMediaFile(mediaFile, userId, (progress) => {
                    if (progressBar) progressBar.style.width = `${progress}%`;
                    if (progressPercent) progressPercent.textContent = `${progress}%`;
                });

                if (progressContainer) {
                    progressContainer.classList.add('hidden');
                }

                // El botón se restaurará al recargar la UI o en el catch
                if (!mediaUrl) {
                    throw new Error('No se pudo obtener la URL del archivo');
                }
            } catch (error) {
                if (progressContainer) progressContainer.classList.add('hidden');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Guardar';
                }
                throw error;
            }
        }

        const { error } = await window.auth.sb
            .from('automation_rules')
            .insert({
                user_id: userId,
                name: `Respuesta: ${triggerText.substring(0, 30)}`,
                type: 'auto_response',
                trigger_type: 'keyword',
                trigger_config: {
                    keyword: triggerText,
                    match_type: matchType
                },
                action_type: 'send_message',
                action_config: {
                    response_text: responseText,
                    media_type: mediaType,
                    media_url: mediaUrl
                },
                is_active: isActive,
                priority: 10
            });

        if (error) throw error;

        window.showToast?.('Respuesta automática guardada correctamente', 'success');

        // Recargar y actualizar UI
        await loadAutoResponses(userId);
        const container = document.getElementById('auto-responses-content');
        if (container) renderAutoResponsesUI(container);

        // Ocultar formulario
        document.getElementById('new-auto-response-form')?.classList.add('hidden');
        document.getElementById('auto-response-form')?.reset();
        document.getElementById('media-upload-container')?.classList.add('hidden');
        document.getElementById('media-preview')?.classList.add('hidden');
    } catch (error) {
        console.error('[Auto Responses] Error al guardar:', error);
        window.showToast?.(`Error al guardar: ${error.message}`, 'error');
    }
}

window.toggleAutoResponse = async function (responseId, isActive) {
    try {
        const { error } = await window.auth.sb
            .from('automation_rules')
            .update({ is_active: isActive })
            .eq('id', responseId);

        if (error) throw error;

        // Actualizar el estado visual del switch
        const switchElement = document.querySelector(`.auto-response-toggle-switch[data-response-id="${responseId}"]`);
        if (switchElement) {
            switchElement.dataset.active = isActive ? 'true' : 'false';
            const switchDiv = switchElement.querySelector('div');
            if (switchDiv) {
                if (isActive) {
                    switchDiv.classList.add('bg-green-600');
                    switchDiv.classList.remove('bg-slate-200');
                    switchDiv.classList.remove('after:left-[2px]');
                    switchDiv.classList.add('after:left-[22px]');
                } else {
                    switchDiv.classList.remove('bg-green-600');
                    switchDiv.classList.add('bg-slate-200');
                    switchDiv.classList.remove('after:left-[22px]');
                    switchDiv.classList.add('after:left-[2px]');
                }
            }
            // Actualizar el texto
            const textSpan = switchElement.querySelector('span');
            if (textSpan) {
                textSpan.textContent = isActive ? 'Activa' : 'Inactiva';
            }
        }

        window.showToast?.(
            isActive ? 'Respuesta automática activada' : 'Respuesta automática desactivada',
            'success'
        );
    } catch (error) {
        console.error('[Auto Responses] Error al actualizar:', error);
        window.showToast?.('Error al actualizar la respuesta automática', 'error');
    }
};

window.editAutoResponse = function (responseId) {
    // Marcar como editando
    const response = autoResponsesData.find(r => r.id === responseId);
    if (response) {
        response._editing = true;
        // Recargar UI
        const container = document.getElementById('auto-responses-content');
        if (container) renderAutoResponsesUI(container);

        // Inicializar iconos
        if (window.lucide) {
            lucide.createIcons();
        }
    }
};

function cancelEditAutoResponse(responseId) {
    // Quitar modo edición
    const response = autoResponsesData.find(r => r.id === responseId);
    if (response) {
        delete response._editing;
        // Recargar UI
        const container = document.getElementById('auto-responses-content');
        if (container) renderAutoResponsesUI(container);

        // Inicializar iconos
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

async function updateAutoResponse(responseId) {
    const form = document.querySelector(`.edit-auto-response-form[data-response-id="${responseId}"]`);
    if (!form) return;

    const triggerText = form.querySelector('.edit-trigger-text').value.trim();
    const responseText = form.querySelector('.edit-response-text').value.trim();
    const isActiveSwitch = form.querySelector('.edit-is-active-switch');
    const isActive = isActiveSwitch ? isActiveSwitch.dataset.active === 'true' : false;
    const matchType = form.querySelector('.edit-match-type').value;
    const mediaType = form.querySelector('.edit-media-type').value;
    const mediaFileInput = form.querySelector('.edit-media-file-input');
    const mediaFile = mediaFileInput?.files[0];

    // console.log(`[Auto Responses] updateAutoResponse activado para ID: ${responseId}`);
    if (!triggerText || !responseText) {
        window.showToast?.('Por favor completa todos los campos', 'error');
        return;
    }

    // Validar que si hay tipo de media, haya archivo o URL existente
    const existingResponse = autoResponsesData.find(r => r.id === responseId);
    if (mediaType !== 'text' && !mediaFile && !existingResponse?.media_url) {
        window.showToast?.('Por favor selecciona un archivo para el tipo de media seleccionado', 'error');
        return;
    }

    try {
        const userId = await window.getUserId();
        if (!userId) return;

        let mediaUrl = existingResponse?.media_url || null;

        // Subir nuevo archivo si existe
        if (mediaFile) {
            const progressContainer = form.querySelector('.edit-media-upload-progress');
            const progressBar = form.querySelector('.edit-media-progress-bar');
            const progressPercent = form.querySelector('.edit-media-progress-percent');

            if (progressContainer && progressBar) {
                progressContainer.classList.remove('hidden');
                progressBar.style.width = '0%';
                if (progressPercent) progressPercent.textContent = '0%';
            }

            // Desactivar botón de guardado durante la subida
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="flex items-center gap-2"><div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Subiendo...</span>';
            }

            try {
                mediaUrl = await uploadMediaFile(mediaFile, userId, (progress) => {
                    if (progressBar) progressBar.style.width = `${progress}%`;
                    if (progressPercent) progressPercent.textContent = `${progress}%`;
                });

                if (progressContainer) {
                    progressContainer.classList.add('hidden');
                }

                // Restaurar botón
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Guardar Cambios';
                }

                if (!mediaUrl) {
                    throw new Error('No se pudo obtener la URL del archivo');
                }
            } catch (error) {
                if (progressContainer) progressContainer.classList.add('hidden');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Guardar Cambios';
                }
                throw error;
            }
        }

        // Si cambió a solo texto, limpiar media_url
        if (mediaType === 'text') {
            mediaUrl = null;
        }

        // Actualizar datos en automation_rules
        const updateData = {
            name: `Respuesta: ${triggerText.substring(0, 30)}`,
            trigger_config: {
                keyword: triggerText,
                match_type: matchType
            },
            action_config: {
                response_text: responseText,
                media_type: mediaType,
                media_url: mediaUrl
            },
            is_active: isActive
        };

        const { error } = await window.auth.sb
            .from('automation_rules')
            .update(updateData)
            .eq('id', responseId);

        if (error) throw error;

        window.showToast?.('Respuesta automática actualizada correctamente', 'success');

        // Recargar y actualizar UI
        await loadAutoResponses(userId);
        const container = document.getElementById('auto-responses-content');
        if (container) renderAutoResponsesUI(container);
    } catch (error) {
        console.error('[Auto Responses] Error al actualizar:', error);
        window.showToast?.(`Error al guardar: ${error.message}`, 'error');
    }
}

window.deleteAutoResponse = async function (responseId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta respuesta automática?')) {
        return;
    }

    try {
        const { error } = await window.auth.sb
            .from('automation_rules')
            .delete()
            .eq('id', responseId);

        if (error) throw error;

        window.showToast?.('Respuesta automática eliminada', 'success');

        // Recargar y actualizar UI
        const userId = await window.getUserId();
        if (userId) {
            await loadAutoResponses(userId);
            const container = document.getElementById('auto-responses-content');
            if (container) renderAutoResponsesUI(container);
        }
    } catch (error) {
        console.error('[Auto Responses] Error al eliminar:', error);
        window.showToast?.('Error al eliminar la respuesta automática', 'error');
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Convertir regex a texto simple (ej: /video|película|audio/i -> "video, película, audio")
function convertRegexToSimpleText(regex) {
    if (!regex) return '';

    try {
        // Si ya es texto simple (sin barras), devolverlo
        if (!regex.startsWith('/')) {
            return regex;
        }

        // Extraer el patrón del regex (quitar / al inicio y /flags al final)
        const match = regex.match(/^\/(.+?)\/([gimuy]*)$/);
        if (match) {
            const pattern = match[1];
            // Dividir por | y convertir a texto separado por comas
            return pattern.split('|').map(w => w.trim()).filter(w => w).join(', ');
        }

        // Si no coincide el formato, devolver el original sin las barras
        return regex.replace(/^\/|\/[gimuy]*$/g, '').split('|').map(w => w.trim()).filter(w => w).join(', ');
    } catch (e) {
        // Si hay error, devolver el original
        return regex;
    }
}

