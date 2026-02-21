/**
 * FLOW BUILDER V2 - UX Simplificada PRO
 * Con Drag & Drop, Templates, Vista Previa en Tiempo Real
 */

let currentFlow = {
    id: null,
    name: '',
    triggerKeywords: [],
    steps: []
};

let currentFlowContainerId = 'ai-flows-list-container';
let draggedStepIndex = null;

// ==================== TEMPLATES PREDEFINIDOS ====================

const FLOW_TEMPLATES = {
    cotizacion_rapida: {
        name: 'Cotización Rápida',
        description: 'Pregunta cantidad, genera cotización y pide pago',
        icon: 'zap',
        color: 'blue',
        keywords: ['cotizar', 'precio', 'cuanto cuesta'],
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: '¡Hola! 👋 Perfecto, te ayudaré con tu cotización.'
            },
            {
                id: 'ask_quantity',
                type: 'question',
                content: '¿Cuántas piezas necesitas?',
                variable: 'cantidad',
                validation: { type: 'number', min: 1 }
            },
            {
                id: 'create_quote',
                type: 'create_quote',
                products: 'auto_detect',
                quantity_variable: 'cantidad',
                send_to_customer: true
            },
            {
                id: 'send_payment',
                type: 'send_payment_info',
                message_template: 'Para confirmar tu pedido:\n\n🏦 {{bank_name}}\n💳 {{bank_account}}\n👤 {{account_holder}}',
                payment_method: 'transfer'
            }
        ]
    },

    servicio_con_diseno: {
        name: 'Servicio con Diseño',
        description: 'Recolecta imagen, analiza diseño, cotiza y solicita pago',
        icon: 'image',
        color: 'purple',
        keywords: ['diseño personalizado', 'quiero personalizar'],
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: '¡Genial! Vamos a crear algo personalizado para ti ✨'
            },
            {
                id: 'ask_design',
                type: 'collect_image',
                content: 'Envíame tu diseño o una imagen de referencia',
                variable: 'imagen_diseno',
                max_images: 3,
                read_content: true
            },
            {
                id: 'analyze_design',
                type: 'read_image',
                source_variable: 'imagen_diseno',
                extraction_prompt: 'Describe el diseño en detalle: colores, estilo, complejidad y elementos principales',
                save_to: 'analisis_diseno'
            },
            {
                id: 'ask_quantity',
                type: 'question',
                content: '¿Cuántas piezas necesitas?',
                variable: 'cantidad',
                validation: { type: 'number' }
            },
            {
                id: 'create_quote',
                type: 'create_quote',
                products: 'auto_detect',
                quantity_variable: 'cantidad',
                send_to_customer: true
            },
            {
                id: 'payment',
                type: 'send_payment_info',
                message_template: '💰 Total: Ver cotización arriba\n\nPara confirmar:\n🏦 {{bank_name}}\n💳 {{bank_account}}',
                payment_method: 'transfer'
            },
            {
                id: 'create_task',
                type: 'create_task',
                task_title: 'Producir pedido personalizado - {{cantidad}} piezas',
                description: 'Diseño: {{analisis_diseno}}',
                due_date_offset_days: 7,
                priority: 'medium'
            }
        ]
    },

    consulta_prioritaria: {
        name: 'Consulta Prioritaria',
        description: 'Recolecta info, detecta urgencia y escala a humano',
        icon: 'bell',
        color: 'red',
        keywords: ['urgente', 'necesito ayuda', 'consulta'],
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: 'Hola! Estoy aquí para ayudarte. Cuéntame qué necesitas.'
            },
            {
                id: 'ask_need',
                type: 'question',
                content: 'Descríbeme brevemente tu necesidad',
                variable: 'descripcion_necesidad',
                validation: { type: 'text', min_length: 10 }
            },
            {
                id: 'ask_urgency',
                type: 'question',
                content: '¿Es urgente? (Si/No)',
                variable: 'es_urgente',
                validation: { type: 'text' }
            },
            {
                id: 'check_urgency',
                type: 'condition',
                variable: 'es_urgente',
                conditions: [
                    {
                        operator: 'equals',
                        value: 'Si',
                        next_step: 'escalate'
                    }
                ],
                default_next_step: 'create_task_normal'
            },
            {
                id: 'escalate',
                type: 'trigger_critical',
                reason: 'Cliente requiere atención urgente',
                notify_admin: true,
                admin_message: '🚨 URGENTE: {{descripcion_necesidad}}',
                auto_response_to_customer: 'Entiendo la urgencia. Un asesor te contactará en menos de 30 minutos.',
                add_label: 'urgente'
            },
            {
                id: 'create_task_normal',
                type: 'create_task',
                task_title: 'Atender consulta: {{descripcion_necesidad}}',
                due_date_offset_days: 2,
                priority: 'medium'
            }
        ]
    },

    encuesta_satisfaccion: {
        name: 'Encuesta Post-Venta',
        description: 'Pregunta experiencia, califica servicio y agradece',
        icon: 'star',
        color: 'yellow',
        keywords: ['encuesta', 'feedback', 'calificar'],
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: '¡Hola! Nos encantaría saber tu opinión sobre tu reciente compra 🌟'
            },
            {
                id: 'ask_rating',
                type: 'question',
                content: '¿Cómo calificarías tu experiencia del 1 al 10?',
                variable: 'calificacion',
                validation: { type: 'number', min: 1, max: 10 }
            },
            {
                id: 'ask_comments',
                type: 'question',
                content: '¿Qué podríamos mejorar? (Opcional, escribe "ninguno" si todo está bien)',
                variable: 'comentarios',
                validation: { type: 'text' }
            },
            {
                id: 'thank_you',
                type: 'message',
                content: '¡Muchísimas gracias por tu tiempo! 💙\n\nTu opinión nos ayuda a mejorar cada día.'
            }
        ]
    }
};

// Tipos de paso con descripciones amigables
const STEP_TYPES = {
    message: {
        icon: 'message-square',
        title: 'Enviar Mensaje',
        description: 'Elina enviará un mensaje de texto al cliente',
        color: 'blue',
        defaultContent: '¡Hola! Bienvenido 👋'
    },
    question: {
        icon: 'help-circle',
        title: 'Hacer una Pregunta',
        description: 'Elina preguntará algo y esperará la respuesta',
        color: 'purple',
        defaultContent: '¿Cuál es tu respuesta?'
    },
    collect_image: {
        icon: 'image',
        title: 'Pedir Imagen',
        description: 'Elina pedirá al cliente que envíe una imagen',
        color: 'green',
        defaultContent: 'Envía una imagen o foto'
    },
    read_image: {
        icon: 'scan',
        title: 'Leer Imagen con IA',
        description: 'La IA analizará el contenido de la imagen',
        color: 'teal',
        defaultContent: ''
    },
    create_quote: {
        icon: 'file-text',
        title: 'Crear Cotización',
        description: 'Genera una cotización con productos y precios',
        color: 'amber',
        defaultContent: ''
    },
    send_payment_info: {
        icon: 'credit-card',
        title: 'Enviar Datos de Pago',
        description: 'Envía información bancaria para recibir pagos',
        color: 'emerald',
        defaultContent: ''
    },
    create_task: {
        icon: 'check-square',
        title: 'Crear Tarea/Recordatorio',
        description: 'Crea una tarea para dar seguimiento',
        color: 'orange',
        defaultContent: ''
    },
    trigger_critical: {
        icon: 'alert-circle',
        title: 'Modo Urgente (Pasar a Humano)',
        description: 'Pausa el flow y notifica al administrador',
        color: 'red',
        defaultContent: ''
    },
    condition: {
        icon: 'git-branch',
        title: 'Decidir según Respuesta',
        description: 'Toma diferentes caminos según lo que responda el cliente',
        color: 'indigo',
        defaultContent: ''
    }
};

// ==================== INICIALIZACIÓN ====================

export async function initFlowBuilder(containerId) {
    if (containerId) currentFlowContainerId = containerId;
    const container = document.getElementById(currentFlowContainerId);
    if (!container) return;

    container.innerHTML = `
        <div class="p-12 text-center text-slate-500">
            <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4"></i>
            <p>Cargando flujos...</p>
        </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
        const flows = await fetchFlows();
        renderFlowList(container, flows);
    } catch (error) {
        console.error('Error fetching flows:', error);
        container.innerHTML = `
            <div class="p-12 text-center text-red-500">
                <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-4"></i>
                <p>Error al cargar los flujos. Por favor intenta más tarde.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

async function fetchFlows() {
    const userId = await window.getUserId();
    const { data, error } = await window.auth.sb
        .from('auto_responses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_flow', true)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// ==================== RENDERIZADO DE LISTA ====================

function renderFlowList(container, flows) {
    if (flows.length === 0) {
        container.innerHTML = `
            <div class="max-w-6xl mx-auto">
                ${renderWelcomeCard()}
                ${renderTemplatesGallery()}
            </div>
        `;
    } else {
        container.innerHTML = `
            ${renderWelcomeCard()}
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="font-bold text-slate-800 text-2xl">Mis Flows</h3>
                    <p class="text-sm text-slate-500">Conversaciones automatizadas activas</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="window.showTemplatesModal()" class="px-6 py-3 bg-purple-50 text-purple-600 rounded-xl font-bold hover:bg-purple-100 transition-all flex items-center gap-2 border-2 border-purple-200">
                        <i data-lucide="layout-template" class="w-5 h-5"></i> Usar Template
                    </button>
                    <button onclick="window.openFlowEditorV2()" class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl">
                        <i data-lucide="plus" class="w-5 h-5"></i> Crear desde Cero
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                ${flows.map(flow => createFlowCardV2(flow)).join('')}
            </div>

            <!-- Templates Section -->
            <div class="mt-12 pt-8 border-t-2 border-slate-200">
                ${renderTemplatesGallery()}
            </div>
        `;
    }

    if (window.lucide) lucide.createIcons();
}

function renderWelcomeCard() {
    return `
        <div class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-1 mb-8">
            <div class="bg-white rounded-[22px] p-8">
                <div class="flex items-center gap-4 mb-4">
                    <div class="p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl">
                        <i data-lucide="zap" class="w-8 h-8 text-indigo-600"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-2xl text-slate-900">Flows Inteligentes</h3>
                        <p class="text-slate-600">Automatiza conversaciones completas con IA</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                        <div class="text-3xl mb-2">🎯</div>
                        <p class="font-bold text-slate-800 mb-1">Define el Disparador</p>
                        <p class="text-xs text-slate-600">Ej: "llaveros", "cotización"</p>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                        <div class="text-3xl mb-2">🧩</div>
                        <p class="font-bold text-slate-800 mb-1">Arma los Pasos</p>
                        <p class="text-xs text-slate-600">Mensajes, preguntas, acciones</p>
                    </div>
                    <div class="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
                        <div class="text-3xl mb-2">🚀</div>
                        <p class="font-bold text-slate-800 mb-1">Activa 24/7</p>
                        <p class="text-xs text-slate-600">Elina lo ejecuta automáticamente</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderTemplatesGallery() {
    return `
        <div class="mb-8">
            <h3 class="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                <i data-lucide="layout-template" class="w-6 h-6 text-purple-600"></i>
                Templates Listos para Usar
            </h3>
            <p class="text-sm text-slate-500 mb-6">Comienza rápido con plantillas prediseñadas</p>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                ${Object.entries(FLOW_TEMPLATES).map(([key, template]) => `
                    <div class="group bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-2xl p-6 hover:border-${template.color}-400 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                         onclick="window.useTemplate('${key}')">

                        <!-- Background Pattern -->
                        <div class="absolute top-0 right-0 opacity-5 group-hover:opacity-10 transition-opacity">
                            <i data-lucide="${template.icon}" class="w-32 h-32 text-${template.color}-600"></i>
                        </div>

                        <!-- Content -->
                        <div class="relative z-10">
                            <div class="w-14 h-14 bg-gradient-to-br from-${template.color}-100 to-${template.color}-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                                <i data-lucide="${template.icon}" class="w-7 h-7 text-${template.color}-700"></i>
                            </div>

                            <h4 class="font-bold text-lg text-slate-900 mb-2">${template.name}</h4>
                            <p class="text-sm text-slate-600 mb-4">${template.description}</p>

                            <div class="flex items-center justify-between pt-4 border-t border-slate-200">
                                <span class="text-xs font-bold text-slate-500">${template.steps.length} pasos</span>
                                <span class="text-xs font-bold text-${template.color}-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Usar →
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function createFlowCardV2(flow) {
    const isActive = flow.is_active;
    let stepsCount = 0;
    try {
        const flowData = typeof flow.flow_data === 'string' ? JSON.parse(flow.flow_data) : flow.flow_data;
        stepsCount = flowData?.steps?.length || 0;
    } catch (e) {}

    return `
        <div class="group bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
             onclick="window.openFlowEditorV2('${flow.id}')">

            <!-- Status Badge -->
            <div class="absolute top-4 right-4">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                    <div class="w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}"></div>
                    ${isActive ? 'Activo' : 'Pausado'}
                </div>
            </div>

            <!-- Icon -->
            <div class="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i data-lucide="git-branch" class="w-8 h-8 text-indigo-600"></i>
            </div>

            <!-- Title -->
            <h4 class="font-bold text-lg text-slate-900 mb-2 truncate">${flow.trigger_text || 'Sin nombre'}</h4>
            <p class="text-xs text-slate-500 mb-4 flex items-center gap-1">
                <i data-lucide="zap" class="w-3 h-3"></i>
                Palabras clave que activan el flow
            </p>

            <!-- Stats -->
            <div class="flex items-center gap-4 text-sm text-slate-600 mb-6 pb-6 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <i data-lucide="layers" class="w-4 h-4 text-indigo-600"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-500">Pasos</p>
                        <p class="font-bold text-slate-900">${stepsCount}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                        <i data-lucide="activity" class="w-4 h-4 text-purple-600"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-500">Creado</p>
                        <p class="font-bold text-slate-900">${new Date(flow.created_at).toLocaleDateString('es-MX', {month: 'short', day: 'numeric'})}</p>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
                <button onclick="event.stopPropagation(); window.openFlowEditorV2('${flow.id}')"
                        class="flex-1 py-2 px-4 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                    Editar
                </button>
                <button onclick="event.stopPropagation(); window.duplicateFlowV2('${flow.id}')"
                        class="py-2 px-4 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-100 transition-all flex items-center justify-center"
                        title="Duplicar flow">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
                <button onclick="event.stopPropagation(); window.deleteFlowV2('${flow.id}')"
                        class="py-2 px-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

// ==================== TEMPLATES ====================

window.useTemplate = (templateKey) => {
    const template = FLOW_TEMPLATES[templateKey];
    if (!template) return;

    currentFlow = {
        id: null,
        name: template.name,
        triggerKeywords: [...template.keywords],
        steps: JSON.parse(JSON.stringify(template.steps)) // Deep clone
    };

    renderFlowEditor();
    window.showToast?.(`Template "${template.name}" cargado! Personalízalo a tu gusto`, 'success');
};

window.showTemplatesModal = () => {
    const modal = document.createElement('div');
    modal.id = 'templates-modal';
    modal.className = 'fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';

    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
            <div class="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <i data-lucide="layout-template" class="w-6 h-6 text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900">Templates Prediseñados</h2>
                            <p class="text-sm text-slate-600">Comienza con flows profesionales listos para usar</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('templates-modal').remove()"
                            class="w-10 h-10 rounded-full hover:bg-white/50 flex items-center justify-center transition-colors">
                        <i data-lucide="x" class="w-6 h-6 text-slate-600"></i>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${Object.entries(FLOW_TEMPLATES).map(([key, template]) => `
                        <div class="border-2 border-slate-200 rounded-2xl p-6 hover:border-${template.color}-400 hover:shadow-xl transition-all">
                            <div class="flex items-start gap-4 mb-4">
                                <div class="w-16 h-16 bg-gradient-to-br from-${template.color}-100 to-${template.color}-200 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                                    <i data-lucide="${template.icon}" class="w-8 h-8 text-${template.color}-700"></i>
                                </div>
                                <div class="flex-1">
                                    <h3 class="font-bold text-lg text-slate-900 mb-1">${template.name}</h3>
                                    <p class="text-sm text-slate-600 mb-3">${template.description}</p>
                                    <div class="flex items-center gap-2 text-xs text-slate-500">
                                        <span class="px-2 py-1 bg-slate-100 rounded-md font-medium">${template.steps.length} pasos</span>
                                        <span class="px-2 py-1 bg-slate-100 rounded-md font-medium">${template.keywords.length} keywords</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Preview de pasos -->
                            <div class="mb-4 space-y-2 max-h-32 overflow-y-auto">
                                ${template.steps.slice(0, 3).map((step, idx) => {
                                    const stepType = STEP_TYPES[step.type];
                                    return `
                                        <div class="flex items-center gap-2 text-xs">
                                            <span class="w-5 h-5 rounded-full bg-${stepType?.color || 'slate'}-100 text-${stepType?.color || 'slate'}-700 flex items-center justify-center font-bold">${idx + 1}</span>
                                            <i data-lucide="${stepType?.icon || 'circle'}" class="w-3 h-3 text-${stepType?.color || 'slate'}-600"></i>
                                            <span class="text-slate-700">${stepType?.title || step.type}</span>
                                        </div>
                                    `;
                                }).join('')}
                                ${template.steps.length > 3 ? `<p class="text-xs text-slate-400 pl-7">+${template.steps.length - 3} pasos más...</p>` : ''}
                            </div>

                            <button onclick="window.useTemplate('${key}'); document.getElementById('templates-modal').remove()"
                                    class="w-full py-3 bg-gradient-to-r from-${template.color}-500 to-${template.color}-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                <i data-lucide="rocket" class="w-4 h-4"></i>
                                Usar este Template
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
};

// ==================== EDITOR VISUAL CON DRAG & DROP ====================

window.openFlowEditorV2 = async (flowId = null) => {
    // Resetear flow actual
    currentFlow = {
        id: flowId,
        name: '',
        triggerKeywords: [],
        steps: []
    };

    // Si hay flowId, cargar datos
    if (flowId) {
        try {
            const userId = await window.getUserId();
            const { data, error } = await window.auth.sb
                .from('auto_responses')
                .select('*')
                .eq('id', flowId)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            currentFlow.name = data.trigger_text || '';
            currentFlow.triggerKeywords = (data.trigger_text || '').split(',').map(k => k.trim()).filter(k => k);

            const flowData = typeof data.flow_data === 'string' ? JSON.parse(data.flow_data) : data.flow_data;
            currentFlow.steps = flowData?.steps || [];
        } catch (e) {
            console.error('Error loading flow:', e);
            window.showToast?.('Error al cargar el flow', 'error');
            return;
        }
    }

    renderFlowEditor();
};

function renderFlowEditor() {
    const modalId = 'flow-editor-v2-modal';
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200';

    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] h-[92vh] flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <i data-lucide="sparkles" class="w-6 h-6 text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900">${currentFlow.id ? 'Editar Flow' : 'Crear Nuevo Flow'}</h2>
                            <p class="text-sm text-slate-600">Diseña conversaciones automatizadas sin código</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.togglePreviewMode()" id="toggle-preview-btn"
                                class="px-4 py-2 bg-white/60 hover:bg-white rounded-xl font-bold text-sm text-slate-700 flex items-center gap-2 border border-slate-200">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                            <span id="preview-btn-text">Vista Previa</span>
                        </button>
                        <button onclick="document.getElementById('${modalId}').remove()"
                                class="w-10 h-10 rounded-full hover:bg-white/50 flex items-center justify-center transition-colors text-slate-600 hover:text-slate-900">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-hidden flex">
                <!-- Main Editor Area -->
                <div id="editor-area" class="flex-1 overflow-y-auto p-8 bg-slate-50">
                    <div class="max-w-4xl mx-auto space-y-6">
                        ${renderBasicSettings()}
                        ${renderStepsBuilder()}
                    </div>
                </div>

                <!-- Preview Area (Hidden by default) -->
                <div id="preview-area" class="hidden w-96 border-l border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 overflow-y-auto p-6">
                    ${renderPreviewPanel()}
                </div>

                <!-- Sidebar - Step Types Palette -->
                <div id="palette-sidebar" class="w-80 border-l border-slate-200 bg-white overflow-y-auto p-6">
                    <h3 class="font-bold text-sm text-slate-500 uppercase tracking-wide mb-4">Tipos de Paso</h3>
                    <p class="text-xs text-slate-400 mb-4">Haz clic para agregar →</p>
                    ${renderStepTypesPalette()}
                </div>
            </div>

            <!-- Footer -->
            <div class="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                <button onclick="document.getElementById('${modalId}').remove()"
                        class="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-all">
                    Cancelar
                </button>
                <div class="flex gap-3">
                    <button onclick="window.saveFlowV2(false)"
                            class="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all flex items-center gap-2">
                        <i data-lucide="save" class="w-4 h-4"></i>
                        Guardar Borrador
                    </button>
                    <button onclick="window.saveFlowV2(true)"
                            class="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2">
                        <i data-lucide="rocket" class="w-4 h-4"></i>
                        Activar Flow
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
}

function renderBasicSettings() {
    return `
        <div class="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <i data-lucide="settings" class="w-5 h-5 text-indigo-600"></i>
                </div>
                <div>
                    <h3 class="font-bold text-lg text-slate-900">Configuración Básica</h3>
                    <p class="text-sm text-slate-500">¿Cuándo se activa este flow?</p>
                </div>
            </div>

            <!-- Trigger Keywords -->
            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-700 mb-2">
                    🎯 Palabras Clave (Disparadores)
                </label>
                <p class="text-xs text-slate-500 mb-3">Cuando el cliente escriba alguna de estas palabras, el flow se activará automáticamente</p>

                <div id="keywords-container" class="flex flex-wrap gap-2 mb-3 min-h-[40px] p-2 bg-slate-50 rounded-lg border border-slate-200">
                    ${currentFlow.triggerKeywords.length === 0 ? `
                        <span class="text-xs text-slate-400 italic">Agrega al menos una palabra clave...</span>
                    ` : currentFlow.triggerKeywords.map((kw, idx) => `
                        <div class="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-sm hover:shadow-md transition-all">
                            <span class="text-sm font-medium">${kw}</span>
                            <button onclick="window.removeKeyword(${idx})" class="text-white/70 hover:text-white">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div class="flex gap-2">
                    <input type="text" id="new-keyword-input" placeholder="Ej: llaveros, cotización, 3d..."
                           class="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm"
                           onkeypress="if(event.key==='Enter') window.addKeyword()">
                    <button onclick="window.addKeyword()"
                            class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        Agregar
                    </button>
                </div>

                <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <i data-lucide="lightbulb" class="w-4 h-4 text-amber-600 mt-0.5 shrink-0"></i>
                    <p class="text-xs text-amber-800">
                        <strong>Ejemplo:</strong> Si agregas "llaveros", el flow se activará cuando el cliente diga "¿Vendes llaveros?" o "Quiero llaveros personalizados"
                    </p>
                </div>
            </div>
        </div>
    `;
}

function renderStepsBuilder() {
    return `
        <div class="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <i data-lucide="list-ordered" class="w-5 h-5 text-purple-600"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg text-slate-900">Pasos de la Conversación</h3>
                        <p class="text-sm text-slate-500">Arrastra para reordenar</p>
                    </div>
                </div>
                <div class="text-sm font-bold text-slate-600 px-3 py-1.5 bg-slate-100 rounded-lg">
                    ${currentFlow.steps.length} ${currentFlow.steps.length === 1 ? 'paso' : 'pasos'}
                </div>
            </div>

            <!-- Steps List with Drag & Drop -->
            <div id="steps-container" class="space-y-3 mb-4">
                ${currentFlow.steps.length === 0 ? `
                    <div class="text-center py-16 border-2 border-dashed border-slate-300 rounded-xl bg-gradient-to-br from-slate-50 to-white">
                        <div class="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                            <i data-lucide="mouse-pointer-click" class="w-10 h-10 text-purple-600"></i>
                        </div>
                        <p class="text-slate-600 font-bold text-lg mb-1">Haz clic en un tipo de paso →</p>
                        <p class="text-xs text-slate-400">para agregar el primer bloque de tu conversación</p>
                    </div>
                ` : currentFlow.steps.map((step, idx) => renderStepBlock(step, idx)).join('')}
            </div>
        </div>
    `;
}

function renderStepBlock(step, index) {
    const stepType = STEP_TYPES[step.type] || STEP_TYPES.message;

    return `
        <div class="step-block group border-2 border-slate-200 rounded-xl p-4 hover:border-${stepType.color}-400 hover:shadow-lg transition-all bg-white cursor-move"
             draggable="true"
             ondragstart="window.handleDragStart(event, ${index})"
             ondragover="window.handleDragOver(event)"
             ondrop="window.handleDrop(event, ${index})"
             ondragend="window.handleDragEnd(event)">

            <div class="flex items-start gap-4">
                <!-- Step Number & Icon with Drag Handle -->
                <div class="flex flex-col items-center gap-2 shrink-0">
                    <div class="cursor-move touch-none">
                        <div class="w-10 h-10 rounded-full bg-${stepType.color}-100 text-${stepType.color}-700 flex items-center justify-center font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
                            ${index + 1}
                        </div>
                        <div class="flex gap-0.5 justify-center mt-1">
                            <div class="w-0.5 h-0.5 bg-slate-300 rounded-full"></div>
                            <div class="w-0.5 h-0.5 bg-slate-300 rounded-full"></div>
                        </div>
                    </div>
                    ${index < currentFlow.steps.length - 1 ? `
                        <div class="w-0.5 h-12 bg-slate-200 group-hover:bg-${stepType.color}-300 transition-colors"></div>
                    ` : ''}
                </div>

                <!-- Step Content -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <i data-lucide="${stepType.icon}" class="w-5 h-5 text-${stepType.color}-600 shrink-0"></i>
                            <h4 class="font-bold text-slate-900 truncate">${stepType.title}</h4>
                            <span class="text-xs text-slate-400 hidden sm:inline">• ${stepType.description}</span>
                        </div>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                            <button onclick="window.editStepV2(${index})" class="p-1.5 hover:bg-${stepType.color}-100 rounded-lg text-slate-500 hover:text-${stepType.color}-700 transition-all" title="Editar">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.duplicateStepV2(${index})" class="p-1.5 hover:bg-purple-100 rounded-lg text-slate-500 hover:text-purple-700 transition-all" title="Duplicar">
                                <i data-lucide="copy" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.deleteStepV2(${index})" class="p-1.5 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 transition-all" title="Eliminar">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Step Preview -->
                    <div class="mt-3 p-3 bg-gradient-to-br from-slate-50 to-white rounded-lg border border-slate-200">
                        ${renderStepPreview(step)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStepPreview(step) {
    const truncate = (text, len = 80) => text?.length > len ? text.substring(0, len) + '...' : text;

    switch (step.type) {
        case 'message':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="message-circle" class="w-4 h-4 text-blue-500 mt-0.5 shrink-0"></i>
                    <p class="text-sm text-slate-700">${truncate(step.content) || '<em class="text-slate-400">Sin contenido</em>'}</p>
                </div>
            `;

        case 'question':
            return `
                <div class="space-y-2">
                    <div class="flex items-start gap-2">
                        <i data-lucide="help-circle" class="w-4 h-4 text-purple-500 mt-0.5 shrink-0"></i>
                        <p class="text-sm text-slate-700"><strong>Pregunta:</strong> ${truncate(step.content) || '<em class="text-slate-400">Sin pregunta</em>'}</p>
                    </div>
                    <p class="text-xs text-slate-500 pl-6">
                        Guardar en: <code class="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">${step.variable || 'sin_variable'}</code>
                        ${step.validation ? ` • Tipo: ${step.validation.type}` : ''}
                    </p>
                </div>
            `;

        case 'collect_image':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="image" class="w-4 h-4 text-green-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Solicitar:</strong> ${truncate(step.content) || 'Imagen'}</p>
                        <p class="text-xs text-slate-500 mt-1">
                            Máx: ${step.max_images || 1} imagen(es) • ${step.optional ? 'Opcional' : 'Requerida'}
                            ${step.read_content ? ' • Leer con IA' : ''}
                        </p>
                    </div>
                </div>
            `;

        case 'read_image':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="scan" class="w-4 h-4 text-teal-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Analizar imagen de:</strong> <code class="bg-slate-200 px-1 rounded text-xs">${step.source_variable || 'imagen'}</code></p>
                        <p class="text-xs text-slate-500 mt-1">Guardar análisis en: <code class="bg-slate-200 px-1 rounded">${step.save_to || 'analisis'}</code></p>
                    </div>
                </div>
            `;

        case 'create_quote':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="file-text" class="w-4 h-4 text-amber-500 mt-0.5 shrink-0"></i>
                    <p class="text-sm text-slate-700">
                        <strong>Crear cotización</strong>
                        ${step.products === 'auto_detect' ? '(auto-detectar producto)' : 'con producto manual'}
                        ${step.send_to_customer ? ' y enviar al cliente' : ''}
                    </p>
                </div>
            `;

        case 'send_payment_info':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="credit-card" class="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Enviar datos de pago</strong></p>
                        ${step.message_template ? `<p class="text-xs text-slate-500 mt-1 italic">"${truncate(step.message_template, 60)}"</p>` : ''}
                    </div>
                </div>
            `;

        case 'create_task':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="check-square" class="w-4 h-4 text-orange-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Tarea:</strong> ${truncate(step.task_title) || 'Sin título'}</p>
                        <p class="text-xs text-slate-500 mt-1">
                            Plazo: ${step.due_date_offset_days || 7} días •
                            Prioridad: ${step.priority || 'media'}
                        </p>
                    </div>
                </div>
            `;

        case 'trigger_critical':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="alert-circle" class="w-4 h-4 text-red-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-red-700">
                        <p><strong>⚠️ Modo Crítico:</strong> ${truncate(step.reason) || 'Pasar a humano'}</p>
                        ${step.notify_admin ? '<p class="text-xs mt-1">✓ Notificar administrador</p>' : ''}
                    </div>
                </div>
            `;

        case 'condition':
            const conditionsCount = step.conditions?.length || 0;
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="git-branch" class="w-4 h-4 text-indigo-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Si</strong> <code class="bg-slate-200 px-1 rounded">${step.variable || '?'}</code> cumple:</p>
                        <p class="text-xs text-slate-500 mt-1">${conditionsCount} condición(es) configurada(s)</p>
                    </div>
                </div>
            `;

        default:
            return `<p class="text-xs text-slate-500">Tipo: ${step.type}</p>`;
    }
}

function renderStepTypesPalette() {
    return Object.entries(STEP_TYPES).map(([type, config]) => `
        <button onclick="window.addStepV2('${type}')"
                class="w-full mb-3 p-4 border-2 border-slate-200 rounded-xl hover:border-${config.color}-400 hover:bg-${config.color}-50 transition-all group text-left active:scale-95">
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 bg-${config.color}-100 rounded-lg flex items-center justify-center group-hover:bg-${config.color}-200 transition-colors shrink-0 shadow-sm">
                    <i data-lucide="${config.icon}" class="w-5 h-5 text-${config.color}-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-sm text-slate-900 mb-1">${config.title}</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">${config.description}</p>
                </div>
            </div>
        </button>
    `).join('');
}

// ==================== PREVIEW PANEL ====================

function renderPreviewPanel() {
    return `
        <div class="h-full flex flex-col">
            <div class="mb-4">
                <h3 class="font-bold text-lg text-slate-900 flex items-center gap-2 mb-2">
                    <i data-lucide="smartphone" class="w-5 h-5 text-indigo-600"></i>
                    Vista Previa
                </h3>
                <p class="text-xs text-slate-500">Simula cómo se verá la conversación</p>
            </div>

            <!-- Phone Mockup -->
            <div class="flex-1 bg-white rounded-3xl shadow-2xl border-8 border-slate-800 overflow-hidden flex flex-col">
                <!-- Phone Header -->
                <div class="bg-slate-800 text-white px-4 py-3 flex items-center gap-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
                        E
                    </div>
                    <div class="flex-1">
                        <p class="font-bold text-sm">Elina</p>
                        <p class="text-xs text-slate-400">Bot Inteligente</p>
                    </div>
                    <i data-lucide="phone" class="w-5 h-5"></i>
                </div>

                <!-- Chat Messages -->
                <div class="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-slate-50 to-slate-100 space-y-3" id="preview-messages">
                    ${renderPreviewMessages()}
                </div>
            </div>

            <!-- Test Controls -->
            <div class="mt-4 p-4 bg-white rounded-xl border border-slate-200">
                <p class="text-xs font-bold text-slate-600 mb-2">Probar Flow</p>
                <div class="flex gap-2">
                    <input type="text" id="preview-test-input" placeholder="Escribe un mensaje..."
                           class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                           onkeypress="if(event.key==='Enter') window.sendPreviewMessage()">
                    <button onclick="window.sendPreviewMessage()"
                            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
                        <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderPreviewMessages() {
    if (currentFlow.steps.length === 0) {
        return `
            <div class="text-center py-8 text-slate-400 text-sm">
                <i data-lucide="message-square-off" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                <p>Agrega pasos para ver la vista previa</p>
            </div>
        `;
    }

    let messages = [];

    // Simular conversación
    currentFlow.steps.forEach((step, idx) => {
        const stepType = STEP_TYPES[step.type];

        if (step.type === 'message') {
            messages.push({
                from: 'bot',
                text: step.content || stepType?.defaultContent || 'Mensaje...',
                icon: stepType?.icon
            });
        } else if (step.type === 'question' || step.type === 'collect_image') {
            messages.push({
                from: 'bot',
                text: step.content || stepType?.defaultContent || 'Pregunta...',
                icon: stepType?.icon
            });
            messages.push({
                from: 'user',
                text: step.type === 'collect_image' ? '📷 [Imagen enviada]' : `Respuesta a paso ${idx + 1}`
            });
        } else if (step.type === 'create_quote') {
            messages.push({
                from: 'bot',
                text: '📋 Cotización generada:\n\nProducto: Ejemplo\nCantidad: 10\nTotal: $500',
                icon: 'file-text'
            });
        } else if (step.type === 'send_payment_info') {
            messages.push({
                from: 'bot',
                text: step.message_template || '🏦 Datos de pago:\nBanco: BBVA\nCuenta: ****1234',
                icon: 'credit-card'
            });
        }
    });

    return messages.map(msg => {
        if (msg.from === 'bot') {
            return `
                <div class="flex items-end gap-2 justify-start">
                    <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold">
                        E
                    </div>
                    <div class="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm max-w-[75%] border border-slate-200">
                        ${msg.icon ? `<i data-lucide="${msg.icon}" class="w-4 h-4 text-indigo-600 mb-1"></i>` : ''}
                        <p class="text-sm text-slate-800 whitespace-pre-wrap">${msg.text}</p>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="flex items-end gap-2 justify-end">
                    <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-br-none shadow-sm max-w-[75%]">
                        <p class="text-sm whitespace-pre-wrap">${msg.text}</p>
                    </div>
                    <div class="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold">
                        U
                    </div>
                </div>
            `;
        }
    }).join('');
}

// ==================== DRAG & DROP HANDLERS ====================

window.handleDragStart = (e, index) => {
    draggedStepIndex = index;
    e.currentTarget.style.opacity = '0.5';
};

window.handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#8b5cf6';
};

window.handleDrop = (e, targetIndex) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '';

    if (draggedStepIndex === null || draggedStepIndex === targetIndex) return;

    // Reorder steps
    const [draggedStep] = currentFlow.steps.splice(draggedStepIndex, 1);
    currentFlow.steps.splice(targetIndex, 0, draggedStep);

    draggedStepIndex = null;
    refreshEditor();
};

window.handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.borderColor = '';
    draggedStepIndex = null;
};

// ==================== PREVIEW MODE ====================

window.togglePreviewMode = () => {
    const previewArea = document.getElementById('preview-area');
    const paletteSidebar = document.getElementById('palette-sidebar');
    const btnText = document.getElementById('preview-btn-text');

    if (previewArea.classList.contains('hidden')) {
        previewArea.classList.remove('hidden');
        paletteSidebar.classList.add('hidden');
        btnText.textContent = 'Editor';

        // Refresh preview
        const messagesContainer = document.getElementById('preview-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = renderPreviewMessages();
            if (window.lucide) lucide.createIcons();
        }
    } else {
        previewArea.classList.add('hidden');
        paletteSidebar.classList.remove('hidden');
        btnText.textContent = 'Vista Previa';
    }
};

window.sendPreviewMessage = () => {
    const input = document.getElementById('preview-test-input');
    const message = input.value.trim();
    if (!message) return;

    const messagesContainer = document.getElementById('preview-messages');
    const userMsg = `
        <div class="flex items-end gap-2 justify-end animate-in slide-in-from-right">
            <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-br-none shadow-sm max-w-[75%]">
                <p class="text-sm">${message}</p>
            </div>
            <div class="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold">
                U
            </div>
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', userMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    input.value = '';

    // Simular respuesta del bot
    setTimeout(() => {
        const botMsg = `
            <div class="flex items-end gap-2 justify-start animate-in slide-in-from-left">
                <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold">
                    E
                </div>
                <div class="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm max-w-[75%] border border-slate-200">
                    <p class="text-sm text-slate-800">Esta es una simulación. El flow real seguirá los pasos configurados.</p>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', botMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        if (window.lucide) lucide.createIcons();
    }, 500);
};

// ==================== FUNCIONES DE INTERACCIÓN ====================

window.addKeyword = () => {
    const input = document.getElementById('new-keyword-input');
    const keyword = input.value.trim();

    if (keyword && !currentFlow.triggerKeywords.includes(keyword)) {
        currentFlow.triggerKeywords.push(keyword);
        input.value = '';
        refreshEditor();
    }
};

window.removeKeyword = (index) => {
    currentFlow.triggerKeywords.splice(index, 1);
    refreshEditor();
};

window.addStepV2 = (stepType) => {
    const stepTypeConfig = STEP_TYPES[stepType];
    const newStep = {
        id: `step_${Date.now()}`,
        type: stepType,
        content: stepTypeConfig?.defaultContent || '',
        next_step: null
    };

    // Configuración por defecto según tipo
    switch (stepType) {
        case 'question':
            newStep.variable = 'respuesta';
            newStep.validation = { type: 'text' };
            break;
        case 'collect_image':
            newStep.variable = 'imagen';
            newStep.max_images = 1;
            newStep.optional = false;
            newStep.read_content = false;
            break;
        case 'read_image':
            newStep.source_variable = 'imagen';
            newStep.extraction_prompt = 'Describe el contenido de la imagen';
            newStep.save_to = 'analisis';
            break;
        case 'create_quote':
            newStep.products = 'auto_detect';
            newStep.send_to_customer = true;
            break;
        case 'send_payment_info':
            newStep.message_template = 'Para confirmar:\n🏦 {{bank_name}}\n💳 {{bank_account}}\n👤 {{account_holder}}';
            newStep.payment_method = 'transfer';
            break;
        case 'create_task':
            newStep.task_title = 'Nueva tarea';
            newStep.due_date_offset_days = 7;
            newStep.priority = 'medium';
            break;
        case 'trigger_critical':
            newStep.reason = 'El cliente requiere atención personalizada';
            newStep.notify_admin = true;
            newStep.auto_response_to_customer = 'Un asesor te contactará pronto.';
            newStep.add_label = 'urgente';
            break;
        case 'condition':
            newStep.variable = 'respuesta';
            newStep.conditions = [];
            break;
    }

    currentFlow.steps.push(newStep);
    refreshEditor();

    // Auto-scroll al nuevo paso
    setTimeout(() => {
        const stepsContainer = document.getElementById('steps-container');
        if (stepsContainer) {
            stepsContainer.scrollTop = stepsContainer.scrollHeight;
        }
    }, 100);
};

window.editStepV2 = (index) => {
    const step = currentFlow.steps[index];
    const stepType = STEP_TYPES[step.type];

    // Create edit modal
    const modal = document.createElement('div');
    modal.id = 'edit-step-modal';
    modal.className = 'fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4';

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div class="sticky top-0 bg-gradient-to-r from-${stepType?.color || 'blue'}-50 to-${stepType?.color || 'blue'}-100 px-6 py-4 border-b border-${stepType?.color || 'blue'}-200 z-10">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-${stepType?.color || 'blue'}-200 rounded-xl flex items-center justify-center">
                            <i data-lucide="${stepType?.icon || 'circle'}" class="w-6 h-6 text-${stepType?.color || 'blue'}-700"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-slate-900">Editar: ${stepType?.title || step.type}</h3>
                            <p class="text-xs text-slate-600">${stepType?.description || ''}</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('edit-step-modal').remove()"
                            class="w-8 h-8 rounded-full hover:bg-white/50 flex items-center justify-center">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>

            <div class="p-6">
                <div id="step-edit-form">
                    ${renderStepEditForm(step, index)}
                </div>

                <div class="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                    <button onclick="document.getElementById('edit-step-modal').remove()"
                            class="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300">
                        Cancelar
                    </button>
                    <button onclick="window.saveStepEdit(${index})"
                            class="flex-1 px-4 py-2.5 bg-${stepType?.color || 'blue'}-600 text-white rounded-xl font-bold hover:bg-${stepType?.color || 'blue'}-700">
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
};

function renderStepEditForm(step, index) {
    switch (step.type) {
        case 'message':
            return `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Mensaje que Elina enviará</label>
                        <textarea id="edit-content" rows="4"
                                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none resize-none"
                                  placeholder="Escribe el mensaje aquí...">${step.content || ''}</textarea>
                        <p class="text-xs text-slate-500 mt-1">Puedes usar variables como {{cantidad}}, {{nombre}}, etc.</p>
                    </div>
                </div>
            `;

        case 'question':
            return `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Pregunta</label>
                        <textarea id="edit-content" rows="3"
                                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none resize-none"
                                  placeholder="¿Qué quieres preguntar?">${step.content || ''}</textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Guardar respuesta como</label>
                        <input type="text" id="edit-variable"
                               class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none"
                               placeholder="nombre_variable"
                               value="${step.variable || ''}">
                        <p class="text-xs text-slate-500 mt-1">Ejemplo: cantidad, nombre, email</p>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Tipo de respuesta</label>
                        <select id="edit-validation-type"
                                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none">
                            <option value="text" ${step.validation?.type === 'text' ? 'selected' : ''}>Texto</option>
                            <option value="number" ${step.validation?.type === 'number' ? 'selected' : ''}>Número</option>
                            <option value="email" ${step.validation?.type === 'email' ? 'selected' : ''}>Email</option>
                            <option value="phone" ${step.validation?.type === 'phone' ? 'selected' : ''}>Teléfono</option>
                        </select>
                    </div>
                </div>
            `;

        case 'collect_image':
            return `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Mensaje al solicitar imagen</label>
                        <textarea id="edit-content" rows="2"
                                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 outline-none resize-none"
                                  placeholder="Envía tu diseño...">${step.content || ''}</textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Máximo de imágenes</label>
                            <input type="number" id="edit-max-images" min="1" max="10"
                                   class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 outline-none"
                                   value="${step.max_images || 1}">
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Guardar como</label>
                            <input type="text" id="edit-variable"
                                   class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 outline-none"
                                   value="${step.variable || 'imagen'}">
                        </div>
                    </div>

                    <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <input type="checkbox" id="edit-read-content" ${step.read_content ? 'checked' : ''}
                               class="w-5 h-5 text-green-600 rounded">
                        <label for="edit-read-content" class="text-sm text-slate-700 cursor-pointer">
                            <strong>Analizar imagen con IA automáticamente</strong>
                            <p class="text-xs text-slate-500">La IA leerá el contenido de la imagen</p>
                        </label>
                    </div>

                    <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <input type="checkbox" id="edit-optional" ${step.optional ? 'checked' : ''}
                               class="w-5 h-5 text-slate-600 rounded">
                        <label for="edit-optional" class="text-sm text-slate-700 cursor-pointer">
                            Imagen opcional (el usuario puede saltar este paso)
                        </label>
                    </div>
                </div>
            `;

        case 'create_quote':
            return `
                <div class="space-y-4">
                    <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p class="text-sm text-amber-900 font-medium mb-2">Este paso creará una cotización automática</p>
                        <p class="text-xs text-amber-700">La cotización se generará con los productos detectados y la cantidad especificada</p>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Origen del producto</label>
                        <select id="edit-products"
                                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none">
                            <option value="auto_detect" ${step.products === 'auto_detect' ? 'selected' : ''}>Auto-detectar del mensaje</option>
                            <option value="manual" ${step.products === 'manual' ? 'selected' : ''}>Selección manual (próximamente)</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Variable de cantidad (opcional)</label>
                        <input type="text" id="edit-quantity-variable"
                               class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none"
                               placeholder="cantidad"
                               value="${step.quantity_variable || ''}">
                        <p class="text-xs text-slate-500 mt-1">Si dejaste la cantidad guardada en un paso anterior</p>
                    </div>

                    <div class="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <input type="checkbox" id="edit-send-to-customer" ${step.send_to_customer !== false ? 'checked' : ''}
                               class="w-5 h-5 text-amber-600 rounded">
                        <label for="edit-send-to-customer" class="text-sm text-slate-700 cursor-pointer">
                            Enviar cotización al cliente automáticamente
                        </label>
                    </div>
                </div>
            `;

        case 'send_payment_info':
            return `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Mensaje de pago</label>
                        <textarea id="edit-message-template" rows="6"
                                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none resize-none font-mono text-sm"
                                  placeholder="Para confirmar:\n🏦 {{bank_name}}\n💳 {{bank_account}}">${step.message_template || ''}</textarea>
                        <p class="text-xs text-slate-500 mt-1">Variables disponibles: {{bank_name}}, {{bank_account}}, {{account_holder}}, {{clabe}}, {{paypal_email}}</p>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Método de pago</label>
                        <select id="edit-payment-method"
                                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none">
                            <option value="transfer" ${step.payment_method === 'transfer' ? 'selected' : ''}>Transferencia bancaria</option>
                            <option value="cash" ${step.payment_method === 'cash' ? 'selected' : ''}>Efectivo</option>
                            <option value="card" ${step.payment_method === 'card' ? 'selected' : ''}>Tarjeta</option>
                        </select>
                    </div>
                </div>
            `;

        case 'create_task':
            return `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Título de la tarea</label>
                        <input type="text" id="edit-task-title"
                               class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                               placeholder="Ej: Entregar pedido de {{cantidad}} piezas"
                               value="${step.task_title || ''}">
                        <p class="text-xs text-slate-500 mt-1">Puedes usar variables guardadas previamente</p>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Descripción (opcional)</label>
                        <textarea id="edit-task-description" rows="3"
                                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 outline-none resize-none"
                                  placeholder="Detalles adicionales...">${step.description || ''}</textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Días para completar</label>
                            <input type="number" id="edit-due-days" min="1"
                                   class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                                   value="${step.due_date_offset_days || 7}">
                        </div>

                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Prioridad</label>
                            <select id="edit-priority"
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 outline-none">
                                <option value="low" ${step.priority === 'low' ? 'selected' : ''}>Baja</option>
                                <option value="medium" ${step.priority === 'medium' ? 'selected' : ''}>Media</option>
                                <option value="high" ${step.priority === 'high' ? 'selected' : ''}>Alta</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

        case 'trigger_critical':
            return `
                <div class="space-y-4">
                    <div class="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p class="text-sm text-red-900 font-medium mb-1">⚠️ Modo Crítico</p>
                        <p class="text-xs text-red-700">El flow se pausará y se notificará al administrador para atención personalizada</p>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Motivo de escalamiento</label>
                        <textarea id="edit-reason" rows="2"
                                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 outline-none resize-none"
                                  placeholder="Ej: Cliente requiere atención urgente">${step.reason || ''}</textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Mensaje al cliente</label>
                        <textarea id="edit-auto-response" rows="3"
                                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 outline-none resize-none"
                                  placeholder="Ej: Un asesor te contactará pronto...">${step.auto_response_to_customer || ''}</textarea>
                    </div>

                    <div class="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <input type="checkbox" id="edit-notify-admin" ${step.notify_admin !== false ? 'checked' : ''}
                               class="w-5 h-5 text-red-600 rounded">
                        <label for="edit-notify-admin" class="text-sm text-slate-700 cursor-pointer">
                            Notificar al administrador por WhatsApp
                        </label>
                    </div>
                </div>
            `;

        default:
            return `
                <div class="p-8 text-center text-slate-500">
                    <i data-lucide="wrench" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>Editor en desarrollo para este tipo de paso</p>
                </div>
            `;
    }
}

window.saveStepEdit = (index) => {
    const step = currentFlow.steps[index];

    // Common fields
    const content = document.getElementById('edit-content')?.value;
    if (content !== undefined) step.content = content;

    // Type-specific fields
    switch (step.type) {
        case 'question':
            step.variable = document.getElementById('edit-variable')?.value || step.variable;
            step.validation = {
                type: document.getElementById('edit-validation-type')?.value || 'text'
            };
            break;

        case 'collect_image':
            step.max_images = parseInt(document.getElementById('edit-max-images')?.value) || 1;
            step.variable = document.getElementById('edit-variable')?.value || step.variable;
            step.read_content = document.getElementById('edit-read-content')?.checked || false;
            step.optional = document.getElementById('edit-optional')?.checked || false;
            break;

        case 'create_quote':
            step.products = document.getElementById('edit-products')?.value || 'auto_detect';
            step.quantity_variable = document.getElementById('edit-quantity-variable')?.value || null;
            step.send_to_customer = document.getElementById('edit-send-to-customer')?.checked !== false;
            break;

        case 'send_payment_info':
            step.message_template = document.getElementById('edit-message-template')?.value || step.message_template;
            step.payment_method = document.getElementById('edit-payment-method')?.value || 'transfer';
            break;

        case 'create_task':
            step.task_title = document.getElementById('edit-task-title')?.value || step.task_title;
            step.description = document.getElementById('edit-task-description')?.value || '';
            step.due_date_offset_days = parseInt(document.getElementById('edit-due-days')?.value) || 7;
            step.priority = document.getElementById('edit-priority')?.value || 'medium';
            break;

        case 'trigger_critical':
            step.reason = document.getElementById('edit-reason')?.value || step.reason;
            step.auto_response_to_customer = document.getElementById('edit-auto-response')?.value || '';
            step.notify_admin = document.getElementById('edit-notify-admin')?.checked !== false;
            break;
    }

    document.getElementById('edit-step-modal')?.remove();
    refreshEditor();
    window.showToast?.('Paso actualizado', 'success');
};

window.duplicateStepV2 = (index) => {
    const step = JSON.parse(JSON.stringify(currentFlow.steps[index])); // Deep clone
    step.id = `step_${Date.now()}`;
    currentFlow.steps.splice(index + 1, 0, step);
    refreshEditor();
    window.showToast?.('Paso duplicado', 'success');
};

window.deleteStepV2 = (index) => {
    if (confirm('¿Eliminar este paso?')) {
        currentFlow.steps.splice(index, 1);
        refreshEditor();
        window.showToast?.('Paso eliminado', 'success');
    }
};

window.duplicateFlowV2 = async (flowId) => {
    try {
        const userId = await window.getUserId();
        const { data, error } = await window.auth.sb
            .from('auto_responses')
            .select('*')
            .eq('id', flowId)
            .single();

        if (error) throw error;

        const { error: insertError } = await window.auth.sb
            .from('auto_responses')
            .insert({
                user_id: userId,
                trigger_text: data.trigger_text + ' (copia)',
                response_text: data.response_text,
                is_active: false,
                is_flow: true,
                flow_data: data.flow_data
            });

        if (insertError) throw insertError;

        window.showToast?.('Flow duplicado', 'success');
        initFlowBuilder(currentFlowContainerId);
    } catch (error) {
        console.error('Error duplicating flow:', error);
        window.showToast?.('Error al duplicar el flow', 'error');
    }
};

window.saveFlowV2 = async (activate = false) => {
    // Validaciones
    if (currentFlow.triggerKeywords.length === 0) {
        window.showToast?.('Agrega al menos una palabra clave', 'error');
        return;
    }

    if (currentFlow.steps.length === 0) {
        window.showToast?.('Agrega al menos un paso', 'error');
        return;
    }

    // Construir flow_data
    const flowData = {
        id: currentFlow.id || `flow_${Date.now()}`,
        mode: 'step_by_step',
        trigger_keywords: currentFlow.triggerKeywords,
        steps: currentFlow.steps.map((step, idx) => ({
            ...step,
            next_step: idx < currentFlow.steps.length - 1 ? currentFlow.steps[idx + 1].id : null
        })),
        variables: {}
    };

    try {
        const userId = await window.getUserId();
        const payload = {
            user_id: userId,
            trigger_text: currentFlow.triggerKeywords.join(', '),
            response_text: `Flow: ${currentFlow.triggerKeywords[0]}`,
            is_active: activate,
            is_flow: true,
            flow_data: flowData
        };

        if (currentFlow.id) {
            // Update
            const { error } = await window.auth.sb
                .from('auto_responses')
                .update(payload)
                .eq('id', currentFlow.id);

            if (error) throw error;
        } else {
            // Insert
            const { error } = await window.auth.sb
                .from('auto_responses')
                .insert(payload);

            if (error) throw error;
        }

        window.showToast?.(`Flow ${activate ? 'activado' : 'guardado'} exitosamente ✨`, 'success');
        document.getElementById('flow-editor-v2-modal')?.remove();
        initFlowBuilder(currentFlowContainerId);
    } catch (error) {
        console.error('Error saving flow:', error);
        window.showToast?.('Error al guardar el flow', 'error');
    }
};

window.deleteFlowV2 = async (flowId) => {
    if (!confirm('¿Eliminar este flow permanentemente?')) return;

    try {
        const { error } = await window.auth.sb
            .from('auto_responses')
            .delete()
            .eq('id', flowId);

        if (error) throw error;

        window.showToast?.('Flow eliminado', 'success');
        initFlowBuilder(currentFlowContainerId);
    } catch (error) {
        console.error('Error deleting flow:', error);
        window.showToast?.('Error al eliminar el flow', 'error');
    }
};

function refreshEditor() {
    const stepsContainer = document.getElementById('steps-container');
    const keywordsContainer = document.getElementById('keywords-container');

    if (stepsContainer) {
        stepsContainer.innerHTML = currentFlow.steps.length === 0 ? `
            <div class="text-center py-16 border-2 border-dashed border-slate-300 rounded-xl bg-gradient-to-br from-slate-50 to-white">
                <div class="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <i data-lucide="mouse-pointer-click" class="w-10 h-10 text-purple-600"></i>
                </div>
                <p class="text-slate-600 font-bold text-lg mb-1">Haz clic en un tipo de paso →</p>
                <p class="text-xs text-slate-400">para agregar el primer bloque de tu conversación</p>
            </div>
        ` : currentFlow.steps.map((step, idx) => renderStepBlock(step, idx)).join('');
    }

    if (keywordsContainer) {
        keywordsContainer.innerHTML = currentFlow.triggerKeywords.length === 0 ? `
            <span class="text-xs text-slate-400 italic">Agrega al menos una palabra clave...</span>
        ` : currentFlow.triggerKeywords.map((kw, idx) => `
            <div class="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-sm hover:shadow-md transition-all">
                <span class="text-sm font-medium">${kw}</span>
                <button onclick="window.removeKeyword(${idx})" class="text-white/70 hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
    }

    // Refresh preview if visible
    const previewMessages = document.getElementById('preview-messages');
    if (previewMessages && !document.getElementById('preview-area').classList.contains('hidden')) {
        previewMessages.innerHTML = renderPreviewMessages();
    }

    if (window.lucide) lucide.createIcons();
}
