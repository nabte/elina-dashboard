/**
 * FLOW BUILDER V3 - Ultra Mejorado
 *
 * 🚨 IMPORTANTE: Este es el archivo ACTIVO en la RAÍZ del proyecto
 * - Se importa dinámicamente desde prompt-training.js (líneas 800, 855)
 * - NO mover a /public (Vite sirve JS desde raíz)
 * - /public es SOLO para assets estáticos (imágenes, favicon, etc.)
 *
 * Características:
 * - Selector de productos inteligente con recomendaciones
 * - Placeholders documentados y visibles
 * - Toggle AI/Exact para cada mensaje
 * - Simulador con IA
 * - Step type: wait_for_file con validación AI
 * - Transiciones suaves (sin flickering) para todos los toggles UI
 * - Integración con OpenRouter para ai_mode
 *
 * Última actualización: 2026-02-16
 */

let currentFlow = {
    id: null,
    name: '',
    triggerKeywords: [],
    steps: [],
    recommended_products: [], // IDs de productos recomendados para este flow
    mode: 'step_by_step' // 'step_by_step' o 'get_all'
};

let currentFlowContainerId = 'ai-flows-list-container';
let draggedStepIndex = null;
let availableProducts = []; // Cache de productos del usuario

// Variables disponibles en el sistema
const AVAILABLE_VARIABLES = {
    flow: {
        title: 'Variables del Flow',
        icon: 'git-branch',
        color: 'purple',
        vars: [
            { name: 'contact_name', description: 'Nombre del contacto', example: 'Juan Pérez' },
            { name: 'contact_phone', description: 'Teléfono del contacto', example: '+52 999 123 4567' }
        ]
    },
    collected: {
        title: 'Variables Recolectadas',
        icon: 'database',
        color: 'blue',
        vars: [] // Se llena dinámicamente con las variables de steps anteriores
    },
    payment: {
        title: 'Datos de Pago',
        icon: 'credit-card',
        color: 'emerald',
        vars: [
            { name: 'bank_name', description: 'Nombre del banco', example: 'BBVA México', source: 'profiles.payment_info' },
            { name: 'bank_account', description: 'Número de cuenta', example: '0123456789', source: 'profiles.payment_info' },
            { name: 'account_holder', description: 'Titular de la cuenta', example: 'Ismael Nabte', source: 'profiles.payment_info' },
            { name: 'clabe', description: 'CLABE interbancaria', example: '012345678901234567', source: 'profiles.payment_info' },
            { name: 'paypal_email', description: 'Email de PayPal', example: 'pago@negocio.com', source: 'profiles.payment_info' },
            { name: 'qr_code_url', description: 'URL del código QR', example: 'https://...', source: 'profiles.payment_info' },
            { name: 'business_name', description: 'Nombre del negocio', example: 'Mi Negocio', source: 'profiles.payment_info' }
        ]
    },
    quote: {
        title: 'Cotización',
        icon: 'file-text',
        color: 'amber',
        vars: [
            { name: 'total_estimate', description: 'Total de la cotización', example: '$1,250.00' },
            { name: 'product_name', description: 'Nombre del producto', example: 'Llaveros personalizados' },
            { name: 'unit_price', description: 'Precio unitario', example: '$25.00' },
            { name: 'quantity', description: 'Cantidad', example: '50' }
        ]
    },
    image: {
        title: 'Análisis de Imagen',
        icon: 'scan',
        color: 'teal',
        vars: [] // Se llena con análisis de imágenes (image_action: 'analyze')
    },
    products: {
        title: 'Datos de Productos',
        icon: 'package',
        color: 'indigo',
        vars: [
            { name: 'product_name', description: 'Nombre del producto', example: 'Tatuaje Minimalista', source: 'products table' },
            { name: 'product_description', description: 'Descripción completa', example: 'Diseño minimalista personalizado...', source: 'products table' },
            { name: 'product_price', description: 'Precio del producto', example: '$850.00', source: 'products table' },
            { name: 'product_image_url', description: 'URL de imagen del producto', example: 'https://...', source: 'products table' },
            { name: 'product_category', description: 'Categoría', example: 'Tatuajes', source: 'products table' },
            { name: 'product_sku', description: 'SKU/Código', example: 'TAT-MIN-001', source: 'products table' }
        ]
    }
};

// Tipos de paso con toggle AI/Exact
const STEP_TYPES = {
    message: {
        icon: 'message-square',
        title: 'Enviar Mensaje',
        description: 'Elina enviará un mensaje de texto al cliente',
        color: 'blue',
        defaultContent: '¡Hola! Bienvenido 👋',
        supportsAiMode: true, // Puede usar IA para personalizar
        aiModeDescription: 'La IA usará este mensaje como inspiración y lo adaptará al contexto'
    },
    question: {
        icon: 'help-circle',
        title: 'Hacer una Pregunta',
        description: 'Elina preguntará algo y esperará la respuesta',
        color: 'purple',
        defaultContent: '¿Cuál es tu respuesta?',
        supportsAiMode: true,
        aiModeDescription: 'La IA reformulará la pregunta según el contexto de la conversación'
    },
    collect_image: {
        icon: 'image',
        title: 'Pedir Imagen',
        description: 'Elina pedirá al cliente que envíe una imagen',
        color: 'green',
        defaultContent: 'Envía una imagen o foto',
        supportsAiMode: true,
        aiModeDescription: 'La IA adaptará cómo pedir la imagen según lo que ya se ha conversado'
    },
    wait_for_file: {
        icon: 'file-plus',
        title: 'Esperar Archivo',
        description: 'Espera imagen/archivo pero el cliente puede seguir escribiendo. Útil para comprobantes de pago',
        color: 'cyan',
        defaultContent: 'Cuando tengas el archivo, envíalo. Mientras tanto puedo responder tus dudas',
        supportsAiMode: false
    },
    generate_image: {
        icon: 'sparkles',
        title: 'Generar Imagen con IA',
        description: 'Usa imágenes recolectadas + variables para generar nueva imagen',
        color: 'pink',
        defaultContent: '',
        supportsAiMode: false
    },
    create_quote: {
        icon: 'file-text',
        title: 'Crear Cotización',
        description: 'Genera una cotización con productos y precios',
        color: 'amber',
        defaultContent: '',
        supportsAiMode: false
    },
    send_payment_info: {
        icon: 'credit-card',
        title: 'Enviar Datos de Pago',
        description: 'Envía información bancaria para recibir pagos',
        color: 'emerald',
        defaultContent: '',
        supportsAiMode: false,  // Siempre modo exacto para datos de pago
        aiModeDescription: ''
    },
    create_task: {
        icon: 'check-square',
        title: 'Crear Tarea/Recordatorio',
        description: 'Crea una tarea para dar seguimiento',
        color: 'orange',
        defaultContent: '',
        supportsAiMode: false
    },
    trigger_critical: {
        icon: 'alert-circle',
        title: 'Modo Urgente (Pasar a Humano)',
        description: 'Pausa el flow y notifica al administrador',
        color: 'red',
        defaultContent: '',
        supportsAiMode: false
    },
    condition: {
        icon: 'git-branch',
        title: 'Decidir según Respuesta',
        description: 'Toma diferentes caminos según lo que responda el cliente',
        color: 'indigo',
        defaultContent: '',
        supportsAiMode: false
    }
};

// ==================== TEMPLATES PREDEFINIDOS ====================

const FLOW_TEMPLATES = {
    cotizacion_rapida: {
        name: 'Cotización Rápida',
        description: 'Pregunta cantidad, genera cotización y pide pago',
        icon: 'zap',
        color: 'blue',
        keywords: ['cotizar', 'precio', 'cuanto cuesta'],
        recommended_products: [], // Se llena al seleccionar
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: '¡Hola! 👋 Perfecto, te ayudaré con tu cotización.',
                ai_mode: true // Por defecto con IA
            },
            {
                id: 'ask_quantity',
                type: 'question',
                content: '¿Cuántas piezas necesitas?',
                variable: 'cantidad',
                validation: { type: 'number', min: 1 },
                ai_mode: false // Pregunta exacta
            },
            {
                id: 'create_quote',
                type: 'create_quote',
                products: 'recommended', // Cambio: usar productos recomendados
                product_priority: 'ai_confidence', // IA decide basado en conversación
                quantity_variable: 'cantidad',
                send_to_customer: true
            },
            {
                id: 'send_payment',
                type: 'send_payment_info',
                message_template: '💰 Total: {{total_estimate}}\n\nPara confirmar:\n🏦 {{bank_name}}\n💳 {{bank_account}}\n👤 {{account_holder}}',
                payment_method: 'transfer',
                ai_mode: false // Mensaje exacto con datos sensibles
            }
        ]
    },

    servicio_con_diseno: {
        name: 'Servicio con Diseño',
        description: 'Recolecta imagen, analiza diseño, cotiza y solicita pago',
        icon: 'image',
        color: 'purple',
        keywords: ['diseño personalizado', 'quiero personalizar'],
        recommended_products: [],
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: '¡Genial! Vamos a crear algo personalizado para ti ✨',
                ai_mode: true
            },
            {
                id: 'ask_design',
                type: 'collect_image',
                content: 'Envíame tu diseño o una imagen de referencia',
                variable: 'imagen_diseno',
                max_images: 3,
                image_action: 'analyze',
                analysis_variable: 'analisis_diseno',
                ai_mode: true
            },
            {
                id: 'ask_quantity',
                type: 'question',
                content: '¿Cuántas piezas necesitas?',
                variable: 'cantidad',
                validation: { type: 'number' },
                ai_mode: false
            },
            {
                id: 'create_quote',
                type: 'create_quote',
                products: 'recommended',
                product_priority: 'ai_confidence',
                quantity_variable: 'cantidad',
                custom_notes: 'Diseño analizado: {{analisis_diseno}}',
                send_to_customer: true
            },
            {
                id: 'payment',
                type: 'send_payment_info',
                message_template: '💰 Total: {{total_estimate}}\n\nPara confirmar:\n🏦 {{bank_name}}\n💳 {{bank_account}}\n👤 {{account_holder}}',
                payment_method: 'transfer',
                ai_mode: false
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

    agendar_cita: {
        name: 'Agendar Cita/Consulta',
        description: 'Consulta disponibilidad, datos del cliente y agenda',
        icon: 'calendar',
        color: 'emerald',
        keywords: ['cita', 'agendar', 'consulta', 'turno'],
        recommended_products: [],
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: 'Perfecto, te ayudaré a agendar tu cita',
                ai_mode: true
            },
            {
                id: 'ask_name',
                type: 'question',
                content: '¿Cuál es tu nombre completo?',
                variable: 'nombre_completo',
                validation: { type: 'text' },
                ai_mode: false
            },
            {
                id: 'ask_service',
                type: 'question',
                content: '¿Qué servicio te interesa?',
                variable: 'servicio',
                validation: { type: 'text' },
                ai_mode: true
            },
            {
                id: 'ask_date',
                type: 'question',
                content: '¿Qué día prefieres? (lunes, martes, etc.)',
                variable: 'dia_preferido',
                validation: { type: 'text' },
                ai_mode: false
            },
            {
                id: 'create_task_cita',
                type: 'create_task',
                task_title: 'Cita: {{nombre_completo}} - {{servicio}}',
                description: 'Día preferido: {{dia_preferido}}. Contactar para confirmar horario.',
                due_date_offset_days: 1,
                priority: 'high'
            },
            {
                id: 'confirmation',
                type: 'message',
                content: 'Perfecto {{nombre_completo}}, revisaré disponibilidad para {{servicio}} el {{dia_preferido}} y te confirmo pronto',
                ai_mode: true
            }
        ]
    },

    seguimiento_pago: {
        name: 'Seguimiento de Pago',
        description: 'Recibe comprobante y confirma pago',
        icon: 'receipt',
        color: 'amber',
        keywords: ['pago', 'comprobante', 'pagué', 'transferencia'],
        recommended_products: [],
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: 'Perfecto, ¿me envías tu comprobante de pago?',
                ai_mode: false
            },
            {
                id: 'wait_receipt',
                type: 'wait_for_file',
                content: 'Puedes enviar captura o foto del comprobante. Si tienes dudas, escríbeme',
                variable: 'comprobante',
                file_type: 'image',
                ai_mode: true
            },
            {
                id: 'create_task_review',
                type: 'create_task',
                task_title: 'Verificar pago de {{contact_name}}',
                description: 'Revisar comprobante y confirmar pago recibido.',
                due_date_offset_days: 1,
                priority: 'high'
            },
            {
                id: 'thanks',
                type: 'message',
                content: 'Recibido! Verificaré tu pago y te confirmo en breve',
                ai_mode: false
            }
        ]
    },

    solicitud_info: {
        name: 'Solicitar Información',
        description: 'Recopila datos del cliente y crea tarea',
        icon: 'clipboard',
        color: 'indigo',
        keywords: ['información', 'datos', 'registro'],
        recommended_products: [],
        steps: [
            {
                id: 'ask_name',
                type: 'question',
                content: '¿Cuál es tu nombre?',
                variable: 'nombre',
                validation: { type: 'text' },
                ai_mode: false
            },
            {
                id: 'ask_email',
                type: 'question',
                content: '¿Tu email?',
                variable: 'email',
                validation: { type: 'email' },
                ai_mode: false
            },
            {
                id: 'ask_details',
                type: 'question',
                content: 'Cuéntame más detalles de lo que necesitas',
                variable: 'detalles',
                validation: { type: 'text' },
                ai_mode: true
            },
            {
                id: 'create_task_followup',
                type: 'create_task',
                task_title: 'Contactar a {{nombre}}',
                description: 'Email: {{email}}\nDetalles: {{detalles}}',
                due_date_offset_days: 2,
                priority: 'medium'
            },
            {
                id: 'thanks',
                type: 'message',
                content: 'Gracias {{nombre}}, me pondré en contacto contigo pronto',
                ai_mode: true
            }
        ]
    },

    atencion_urgente: {
        name: 'Atención Urgente',
        description: 'Detecta urgencia y notifica inmediatamente',
        icon: 'alert-triangle',
        color: 'red',
        keywords: ['urgente', 'emergencia', 'ayuda', 'problema'],
        recommended_products: [],
        steps: [
            {
                id: 'ask_issue',
                type: 'question',
                content: 'Entiendo que es urgente, ¿qué sucede?',
                variable: 'problema',
                validation: { type: 'text' },
                ai_mode: true
            },
            {
                id: 'trigger_alert',
                type: 'trigger_critical',
                reason: 'Cliente reporta situación urgente: {{problema}}',
                notify_admin: true,
                admin_message: '🚨 URGENTE: {{contact_name}} reporta problema',
                auto_response_to_customer: 'Entendido, estoy notificando a mi equipo ahora mismo. Te contactarán en minutos.',
                add_label: 'urgente'
            }
        ]
    },

    consulta_catalogo: {
        name: 'Consulta de Catálogo',
        description: 'Pregunta qué busca y muestra productos',
        icon: 'shopping-bag',
        color: 'pink',
        keywords: ['catálogo', 'productos', 'qué tienen', 'opciones'],
        recommended_products: [],
        steps: [
            {
                id: 'ask_interest',
                type: 'question',
                content: '¿Qué tipo de producto te interesa?',
                variable: 'tipo_producto',
                validation: { type: 'text' },
                ai_mode: true
            },
            {
                id: 'show_quote',
                type: 'create_quote',
                products: 'auto_detect',
                send_to_customer: true
            },
            {
                id: 'ask_continue',
                type: 'question',
                content: '¿Te interesa alguno? Puedo darte más detalles',
                variable: 'interes',
                validation: { type: 'text' },
                ai_mode: true
            }
        ]
    },

    pedido_recurrente: {
        name: 'Pedido Recurrente',
        description: 'Cliente repite su pedido habitual rápidamente',
        icon: 'repeat',
        color: 'amber',
        keywords: ['lo mismo', 'el de siempre', 'repetir pedido', 'lo usual'],
        recommended_products: [],
        steps: [
            {
                id: 'welcome',
                type: 'message',
                content: '¡Perfecto! Voy a preparar tu pedido habitual',
                ai_mode: true
            },
            {
                id: 'ask_quantity',
                type: 'question',
                content: '¿La misma cantidad que la vez anterior?',
                variable: 'confirmar_cantidad',
                validation: { type: 'text' },
                ai_mode: true
            },
            {
                id: 'create_quote',
                type: 'create_quote',
                products: 'recommended',
                product_priority: 'purchase_history',
                send_to_customer: true
            },
            {
                id: 'send_payment',
                type: 'send_payment_info',
                message_template: '💰 Total: {{total_estimate}}\n\nPara confirmar:\n🏦 {{bank_name}}\n💳 {{bank_account}}\n👤 {{account_holder}}',
                payment_method: 'transfer',
                ai_mode: false
            }
        ]
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
        // Cargar productos del usuario
        await loadUserProducts();

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

async function loadUserProducts() {
    try {
        const userId = await window.getUserId();
        const { data, error } = await window.auth.sb
            .from('products')
            .select('id, product_name, price, description, pricing_tiers, gallery, media_url')
            .eq('user_id', userId)
            .order('product_name');

        if (error) {
            console.error('[Flow Builder V3] Error loading products:', error);
            console.error('[Flow Builder V3] Error message:', error.message);
            console.error('[Flow Builder V3] Error details:', error.details);
            throw error;
        }

        availableProducts = (data || []).map(p => ({
            ...p,
            name: p.product_name, // Agregar alias 'name' para compatibilidad
            images: p.gallery || (p.media_url ? [p.media_url] : []) // Mapear gallery a images
        }));

        // Hacer disponible globalmente para el buscador
        window.userProducts = availableProducts;

        console.log(`[Flow Builder V3] Loaded ${availableProducts.length} products`);
        console.log('[Flow Builder V3] Products with pricing_tiers:', availableProducts.filter(p => p.pricing_tiers).length);
        console.log('[Flow Builder V3] Products with images:', availableProducts.filter(p => p.images && p.images.length > 0).length);

        // Log primer producto con pricing_tiers para debug
        const firstWithTiers = availableProducts.find(p => p.pricing_tiers);
        if (firstWithTiers) {
            console.log('[Flow Builder V3] Ejemplo de producto con tiers:', {
                name: firstWithTiers.product_name,
                tiers: firstWithTiers.pricing_tiers
            });
        }
    } catch (e) {
        console.warn('[Flow Builder V3] Error loading products:', e);
        console.warn('[Flow Builder V3] Si el error menciona "pricing_tiers", la columna no existe en la BD.');
        console.warn('[Flow Builder V3] Solución: Ejecuta la migración para agregar la columna pricing_tiers.');
        availableProducts = [];
        window.userProducts = [];
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

// ==================== RENDERIZADO ====================

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
                    <button onclick="window.openFlowEditorV3()" class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl">
                        <i data-lucide="plus" class="w-5 h-5"></i> Crear desde Cero
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                ${flows.map(flow => createFlowCardV3(flow)).join('')}
            </div>

            <div class="mt-12 pt-8 border-t-2 border-slate-200">
                ${renderTemplatesGallery()}
            </div>
        `;
    }

    if (window.lucide) lucide.createIcons();
}

function renderWelcomeCard() {
    return `
        <div class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-0.5 mb-4">
            <div class="bg-white rounded-[14px] p-4">
                <div class="flex items-center gap-3 mb-3">
                    <div class="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                        <i data-lucide="zap" class="w-5 h-5 text-indigo-600"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-slate-900">Flows Inteligentes V3</h3>
                        <p class="text-xs text-slate-600">Con IA adaptativa y productos recomendados</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-100">
                        <div class="text-xl mb-1">🎯</div>
                        <p class="font-bold text-slate-800 text-xs mb-0.5">Disparadores</p>
                        <p class="text-[10px] text-slate-500">Palabras clave</p>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-2 rounded-lg border border-purple-100">
                        <div class="text-xl mb-1">🛍️</div>
                        <p class="font-bold text-slate-800 text-xs mb-0.5">Productos</p>
                        <p class="text-[10px] text-slate-500">IA inteligente</p>
                    </div>
                    <div class="bg-gradient-to-br from-emerald-50 to-teal-50 p-2 rounded-lg border border-emerald-100">
                        <div class="text-xl mb-1">🤖</div>
                        <p class="font-bold text-slate-800 text-xs mb-0.5">IA/Exacto</p>
                        <p class="text-[10px] text-slate-500">Modo flexible</p>
                    </div>
                    <div class="bg-gradient-to-br from-amber-50 to-orange-50 p-2 rounded-lg border border-amber-100">
                        <div class="text-xl mb-1">🎬</div>
                        <p class="font-bold text-slate-800 text-xs mb-0.5">Simulador</p>
                        <p class="text-[10px] text-slate-500">Prueba real</p>
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
                         onclick="window.selectProductsForTemplate('${key}')">

                        <div class="absolute top-0 right-0 opacity-5 group-hover:opacity-10 transition-opacity">
                            <i data-lucide="${template.icon}" class="w-32 h-32 text-${template.color}-600"></i>
                        </div>

                        <div class="relative z-10">
                            <div class="w-14 h-14 bg-gradient-to-br from-${template.color}-100 to-${template.color}-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                                <i data-lucide="${template.icon}" class="w-7 h-7 text-${template.color}-700"></i>
                            </div>

                            <h4 class="font-bold text-lg text-slate-900 mb-2">${template.name}</h4>
                            <p class="text-sm text-slate-600 mb-4">${template.description}</p>

                            <div class="flex items-center justify-between pt-4 border-t border-slate-200">
                                <span class="text-xs font-bold text-slate-500">${template.steps.length} pasos</span>
                                <span class="text-xs font-bold text-${template.color}-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Configurar →
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function createFlowCardV3(flow) {
    const isActive = flow.is_active;
    let stepsCount = 0;
    let recommendedProducts = [];
    let flowMode = 'step_by_step';

    try {
        const flowData = typeof flow.flow_data === 'string' ? JSON.parse(flow.flow_data) : flow.flow_data;
        stepsCount = flowData?.steps?.length || 0;
        recommendedProducts = flowData?.recommended_products || [];
        flowMode = flowData?.mode || 'step_by_step';
    } catch (e) {}

    const modeLabel = flowMode === 'get_all' ? 'Get All (IA)' : 'Paso a Paso';
    const modeIcon = flowMode === 'get_all' ? 'sparkles' : 'list-checks';
    const modeColor = flowMode === 'get_all' ? 'purple' : 'indigo';

    return `
        <div class="group bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-${modeColor}-400 hover:shadow-lg transition-all">
            <!-- Header compacto -->
            <div class="bg-gradient-to-r from-${modeColor}-50 to-${modeColor}-100 p-2.5 border-b border-${modeColor}-200">
                <div class="flex items-center justify-between mb-1.5">
                    <h4 class="font-bold text-sm text-slate-900 truncate flex-1">${flow.trigger_text || 'Sin nombre'}</h4>
                    <button onclick="(function(e){e.stopPropagation(); window.toggleFlowActiveV3('${flow.id}', ${!isActive});})(event)"
                            class="px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${isActive ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'}"
                            title="${isActive ? 'Pausar' : 'Activar'}">
                        <div class="flex items-center gap-1">
                            <div class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-slate-600'}"></div>
                            ${isActive ? 'On' : 'Off'}
                        </div>
                    </button>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    <div class="px-1.5 py-0.5 bg-white border border-${modeColor}-300 rounded flex items-center gap-1">
                        <i data-lucide="${modeIcon}" class="w-3 h-3 text-${modeColor}-600"></i>
                        <span class="text-[10px] font-bold text-${modeColor}-700">${modeLabel}</span>
                    </div>
                    <div class="px-1.5 py-0.5 bg-white border border-slate-300 rounded flex items-center gap-1">
                        <i data-lucide="layers" class="w-3 h-3 text-slate-600"></i>
                        <span class="text-[10px] font-bold text-slate-700">${stepsCount}</span>
                    </div>
                    ${recommendedProducts.length > 0 ? `
                        <div class="px-1.5 py-0.5 bg-white border border-purple-300 rounded flex items-center gap-1">
                            <i data-lucide="package" class="w-3 h-3 text-purple-600"></i>
                            <span class="text-[10px] font-bold text-purple-700">${recommendedProducts.length}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Body compacto -->
            <div class="p-2.5">
                <button onclick="window.openFlowEditorV3('${flow.id}')"
                        class="w-full py-2 px-3 bg-gradient-to-r from-${modeColor}-600 to-${modeColor}-700 text-white rounded-lg font-bold text-xs hover:shadow-lg transition-all flex items-center justify-center gap-1.5 mb-2">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    Editar
                </button>
                <div class="grid grid-cols-3 gap-1.5">
                    <button onclick="(function(e){e.stopPropagation(); window.viewFlowStepsV3('${flow.id}');})(event)"
                            class="py-1.5 px-2 bg-blue-50 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-1"
                            title="Ver pasos">
                        <i data-lucide="eye" class="w-3 h-3"></i>
                        <span>Ver</span>
                    </button>
                    <button onclick="(function(e){e.stopPropagation(); window.duplicateFlowV3('${flow.id}');})(event)"
                            class="py-1.5 px-2 bg-purple-50 text-purple-700 rounded text-[10px] font-bold hover:bg-purple-100 transition-all flex items-center justify-center gap-1"
                            title="Duplicar">
                        <i data-lucide="copy" class="w-3 h-3"></i>
                        <span>Copiar</span>
                    </button>
                    <button onclick="(function(e){e.stopPropagation(); window.deleteFlowV3('${flow.id}');})(event)"
                            class="py-1.5 px-2 bg-red-50 text-red-700 rounded text-[10px] font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-1"
                            title="Eliminar">
                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                        <span>Borrar</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== SELECTOR DE PRODUCTOS PARA TEMPLATE ====================

window.selectProductsForTemplate = (templateKey) => {
    const template = FLOW_TEMPLATES[templateKey];
    if (!template) return;

    if (availableProducts.length === 0) {
        window.showToast?.('No tienes productos registrados. El flow usará auto-detección.', 'warning');
        window.useTemplate(templateKey, []);
        return;
    }

    // Mostrar modal de selección de productos
    const modal = document.createElement('div');
    modal.id = 'product-selector-modal';
    modal.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4';

    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div class="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <i data-lucide="${template.icon}" class="w-6 h-6 text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900">${template.name}</h2>
                            <p class="text-sm text-slate-600">Selecciona los productos recomendados para este flow</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('product-selector-modal').remove()"
                            class="w-10 h-10 rounded-full hover:bg-white/50 flex items-center justify-center transition-colors">
                        <i data-lucide="x" class="w-6 h-6 text-slate-600"></i>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-8">
                <div class="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <h3 class="font-bold text-sm text-indigo-900 mb-2 flex items-center gap-2">
                        <i data-lucide="info" class="w-4 h-4"></i>
                        ¿Qué significa "Productos Recomendados"?
                    </h3>
                    <p class="text-xs text-indigo-800 leading-relaxed">
                        La IA analizará la conversación y decidirá cuál de estos productos es el más adecuado según el contexto.
                        <br><br>
                        <strong>Ejemplo:</strong> Si seleccionas "Llaveros" y "Diseño Gráfico", y el cliente menciona "quiero un diseño para mi logo",
                        la IA priorizará "Diseño Gráfico" automáticamente.
                    </p>
                </div>

                <div class="space-y-3">
                    ${availableProducts.map((product, idx) => `
                        <label class="flex items-start gap-4 p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                            <input type="checkbox" name="recommended-product" value="${product.id}"
                                   class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mt-1"
                                   ${idx === 0 ? 'checked' : ''}>
                            <div class="flex-1">
                                <div class="flex items-center justify-between mb-2">
                                    <h4 class="font-bold text-slate-900">${product.product_name}</h4>
                                    <span class="text-sm font-bold text-purple-600">$${product.price}</span>
                                </div>
                                ${product.description ? `
                                    <p class="text-xs text-slate-600 line-clamp-2">${product.description}</p>
                                ` : ''}
                                <div class="mt-2 flex gap-2">
                                    ${idx === 0 ? `
                                        <span class="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                                            ✓ Recomendado (por defecto)
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        </label>
                    `).join('')}
                </div>

                <div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p class="text-xs text-amber-800 flex items-start gap-2">
                        <i data-lucide="lightbulb" class="w-4 h-4 shrink-0 mt-0.5"></i>
                        <span>
                            <strong>Consejo:</strong> Selecciona productos relacionados con las palabras clave del template.
                            Puedes cambiar la selección más tarde en el editor.
                        </span>
                    </p>
                </div>
            </div>

            <div class="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                <button onclick="document.getElementById('product-selector-modal').remove()"
                        class="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-all">
                    Cancelar
                </button>
                <button onclick="window.confirmProductSelection('${templateKey}')"
                        class="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    Continuar con Template
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
};

window.confirmProductSelection = (templateKey) => {
    const checkboxes = document.querySelectorAll('input[name="recommended-product"]:checked');
    const selectedProductIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    document.getElementById('product-selector-modal')?.remove();
    window.useTemplate(templateKey, selectedProductIds);
};

window.useTemplate = (templateKey, productIds = []) => {
    const template = FLOW_TEMPLATES[templateKey];
    if (!template) return;

    currentFlow = {
        id: null,
        name: template.name,
        triggerKeywords: [...template.keywords],
        steps: JSON.parse(JSON.stringify(template.steps)),
        recommended_products: productIds
    };

    renderFlowEditor();
    window.showToast?.(`Template "${template.name}" cargado con ${productIds.length} producto(s) recomendado(s)`, 'success');
};

// ==================== MODAL DE TEMPLATES ====================

window.showTemplatesModal = () => {
    const modal = document.createElement('div');
    modal.id = 'templates-modal';
    modal.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4';

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

            <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    ${Object.entries(FLOW_TEMPLATES).map(([key, template]) => `
                        <div class="border-2 border-slate-200 rounded-2xl p-6 hover:border-${template.color}-400 hover:shadow-xl transition-all group">
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

                            <div class="mb-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                ${template.steps.slice(0, 4).map((step, idx) => {
                                    const stepType = STEP_TYPES[step.type];
                                    return `
                                        <div class="flex items-center gap-2 text-xs text-slate-600">
                                            <span class="w-5 h-5 rounded-full bg-${stepType?.color || 'slate'}-100 text-${stepType?.color || 'slate'}-700 flex items-center justify-center font-bold text-[10px]">${idx + 1}</span>
                                            <i data-lucide="${stepType?.icon || 'circle'}" class="w-3 h-3 text-${stepType?.color || 'slate'}-600"></i>
                                            <span class="truncate">${stepType?.title || step.type}</span>
                                        </div>
                                    `;
                                }).join('')}
                                ${template.steps.length > 4 ? `
                                    <p class="text-[10px] text-slate-400 pl-7">+ ${template.steps.length - 4} pasos más...</p>
                                ` : ''}
                            </div>

                            <button onclick="document.getElementById('templates-modal').remove(); window.selectProductsForTemplate('${key}')"
                                    class="w-full py-2.5 bg-gradient-to-r from-${template.color}-500 to-${template.color}-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                <i data-lucide="check" class="w-4 h-4"></i>
                                Usar este Template
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="px-8 py-4 border-t border-slate-200 bg-white">
                <button onclick="document.getElementById('templates-modal').remove()"
                        class="w-full px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
};

// ==================== EDITOR PRINCIPAL ====================

window.openFlowEditorV3 = async (flowId = null) => {
    currentFlow = {
        id: flowId,
        name: '',
        triggerKeywords: [],
        steps: [],
        recommended_products: [],
        mode: 'step_by_step'
    };

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
            currentFlow.recommended_products = flowData?.recommended_products || [];
            currentFlow.mode = flowData?.mode || 'step_by_step';
        } catch (e) {
            console.error('[Flow Builder V3] Error loading flow:', e);
            window.showToast?.('Error al cargar el flow', 'error');
            return;
        }
    }

    renderFlowEditor();
};

function renderFlowEditor() {
    const modalId = 'flow-editor-v3-modal';
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    // Update collected variables for dropdown
    updateCollectedVariables();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200';

    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] h-[92vh] flex flex-col overflow-hidden">
            ${renderEditorHeader(modalId)}

            <div class="flex-1 overflow-hidden flex">
                ${renderEditorMainArea()}
                ${renderEditorSidebar()}
            </div>

            ${renderEditorFooter(modalId)}
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
}

function renderEditorHeader(modalId) {
    return `
        <div class="px-4 py-2 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
                    </div>
                    <div>
                        <h2 class="text-sm font-bold text-slate-900">${currentFlow.id ? 'Editar Flow' : 'Crear Flow'}</h2>
                        <p class="text-[9px] text-slate-600">Conversaciones automatizadas</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    ${currentFlow.recommended_products.length > 0 ? `
                        <button onclick="window.editRecommendedProducts()"
                                class="px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded-lg text-[10px] font-bold text-purple-700 flex items-center gap-1 border border-purple-200">
                            <i data-lucide="package" class="w-3 h-3"></i>
                            ${currentFlow.recommended_products.length}
                        </button>
                    ` : ''}
                    <button onclick="window.showVariablesGuide()"
                            class="px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg text-[10px] font-bold text-blue-700 flex items-center gap-1 border border-blue-200">
                        <i data-lucide="book-open" class="w-3 h-3"></i>
                        Variables
                    </button>
                    <button onclick="window.toggleAiSimulator()" id="toggle-simulator-btn"
                            class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[10px] font-bold text-emerald-700 flex items-center gap-1 border border-emerald-200">
                        <i data-lucide="play-circle" class="w-3 h-3"></i>
                        <span id="simulator-btn-text">Simulador</span>
                    </button>
                    <button onclick="document.getElementById('${modalId}').remove()"
                            class="w-6 h-6 rounded-full hover:bg-white/50 flex items-center justify-center transition-colors text-slate-600 hover:text-slate-900">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderEditorMainArea() {
    return `
        <div id="editor-area" class="flex-1 overflow-y-auto p-4 bg-slate-50 custom-scrollbar transition-all duration-300">
            <div class="max-w-5xl mx-auto space-y-3">
                <div id="basic-settings-container-v3">
                    ${renderBasicSettingsV3()}
                </div>
                ${renderStepsBuilderV3()}
            </div>
        </div>

        <div id="simulator-area" class="hidden border-l-2 border-indigo-200 bg-gradient-to-br from-slate-50 to-indigo-50 overflow-y-auto p-3 custom-scrollbar transition-all duration-300">
            ${renderAiSimulator()}
        </div>
    `;
}

function renderEditorSidebar() {
    return `
        <div id="palette-sidebar" class="w-64 border-l border-slate-200 bg-white overflow-y-auto p-3 custom-scrollbar">
            <h3 class="font-bold text-xs text-slate-500 uppercase tracking-wide mb-2">Tipos</h3>
            <p class="text-[10px] text-slate-400 mb-2">Click para agregar →</p>
            ${renderStepTypesPalette()}
        </div>
    `;
}

function renderEditorFooter(modalId) {
    return `
        <div class="px-4 py-2 border-t border-slate-200 bg-white flex items-center justify-between">
            <button onclick="document.getElementById('${modalId}').remove()"
                    class="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-all">
                Cancelar
            </button>
            <div class="flex gap-2">
                <button onclick="window.saveFlowV3(false)"
                        class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-all flex items-center gap-1">
                    <i data-lucide="save" class="w-3 h-3"></i>
                    Guardar
                </button>
                <button onclick="window.saveFlowV3(true)"
                        class="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold hover:shadow-lg transition-all flex items-center gap-1">
                    <i data-lucide="rocket" class="w-3 h-3"></i>
                    Activar
                </button>
            </div>
        </div>
    `;
}

function renderBasicSettingsV3() {
    return `
        <div class="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <i data-lucide="settings" class="w-4 h-4 text-indigo-600"></i>
                </div>
                <div>
                    <h3 class="font-bold text-sm text-slate-900">Configuración</h3>
                    <p class="text-[10px] text-slate-500">¿Cuándo se activa?</p>
                </div>
            </div>

            <!-- Modo del Flow -->
            <div class="mb-3 p-2 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <label class="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <i data-lucide="brain" class="w-3 h-3 text-indigo-600"></i>
                    Modo
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="window.setFlowMode('step_by_step')"
                            class="p-2 rounded-lg border transition-all ${currentFlow.mode === 'step_by_step' ? 'bg-white border-indigo-500 shadow' : 'bg-white/50 border-slate-200 hover:border-indigo-300'}">
                        <div class="flex items-center gap-1 mb-1">
                            <i data-lucide="list-checks" class="w-3 h-3 ${currentFlow.mode === 'step_by_step' ? 'text-indigo-600' : 'text-slate-400'}"></i>
                            <span class="font-bold text-[10px] ${currentFlow.mode === 'step_by_step' ? 'text-indigo-900' : 'text-slate-600'}">Paso a Paso</span>
                        </div>
                        <p class="text-[9px] text-slate-600">Una pregunta a la vez</p>
                    </button>
                    <button onclick="window.setFlowMode('get_all')"
                            class="p-4 rounded-xl border-2 transition-all ${currentFlow.mode === 'get_all' ? 'bg-white border-purple-500 shadow-md' : 'bg-white/50 border-slate-200 hover:border-purple-300'}">
                        <div class="flex items-center gap-2 mb-2">
                            <i data-lucide="sparkles" class="w-5 h-5 ${currentFlow.mode === 'get_all' ? 'text-purple-600' : 'text-slate-400'}"></i>
                            <span class="font-bold text-sm ${currentFlow.mode === 'get_all' ? 'text-purple-900' : 'text-slate-600'}">Get All (IA)</span>
                        </div>
                        <p class="text-xs text-slate-600">IA extrae múltiples datos de una respuesta.</p>
                    </button>
                </div>
                <div class="mt-3 p-2 bg-white/80 rounded-lg">
                    <p class="text-[10px] text-slate-600 leading-relaxed">
                        ${currentFlow.mode === 'step_by_step'
                            ? '📝 <strong>Paso a Paso:</strong> El bot hace una pregunta, espera respuesta, luego la siguiente. Ideal para procesos simples.'
                            : '🤖 <strong>Get All:</strong> El bot analiza toda la respuesta del cliente, extrae múltiples datos a la vez, y solo pide lo que falta. Ideal para conversaciones naturales.'
                        }
                    </p>
                </div>
            </div>

            <!-- Panel de campos a recolectar (solo modo get_all) -->
            ${currentFlow.mode === 'get_all' ? renderGetAllFieldsPanel() : ''}

            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-700 mb-2">
                    🎯 Palabras Clave (Disparadores)
                </label>
                <p class="text-xs text-slate-500 mb-3">Cuando el cliente escriba alguna de estas palabras, el flow se activará automáticamente</p>

                <div id="keywords-container" class="flex flex-wrap gap-2 mb-3 min-h-[40px] p-2 bg-slate-50 rounded-lg border border-slate-200">
                    ${currentFlow.triggerKeywords.length === 0 ? `
                        <span class="text-xs text-slate-400 italic">Agrega al menos una palabra clave...</span>
                    ` : currentFlow.triggerKeywords.map((kw, idx) => `
                        <div class="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-sm hover:shadow-md transition-all animate-in">
                            <span class="text-sm font-medium">${kw}</span>
                            <button onclick="window.removeKeywordV3(${idx})" class="text-white/70 hover:text-white">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div class="flex gap-2">
                    <input type="text" id="new-keyword-input-v3" placeholder="Ej: llaveros, cotización, 3d..."
                           class="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm"
                           onkeypress="if(event.key==='Enter') window.addKeywordV3()">
                    <button onclick="window.addKeywordV3()"
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

function renderGetAllFieldsPanel() {
    // Extraer campos de los steps tipo question y collect_image
    const fieldsToCollect = currentFlow.steps
        .filter(s => s.type === 'question' || s.type === 'collect_image')
        .map(s => ({
            variable: s.variable || 'sin_variable',
            description: s.content || 'Sin descripción',
            type: s.type === 'collect_image' ? 'imagen' : (s.validation?.type || 'texto')
        }));

    if (fieldsToCollect.length === 0) {
        return `
            <div class="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                <div class="flex items-start gap-3">
                    <i data-lucide="alert-circle" class="w-5 h-5 text-purple-600 mt-0.5 shrink-0"></i>
                    <div class="flex-1">
                        <p class="font-bold text-sm text-purple-900 mb-1">⚡ Modo Get All Activado</p>
                        <p class="text-xs text-purple-700 mb-2">La IA extraerá múltiples datos de una sola respuesta del usuario.</p>
                        <p class="text-xs text-purple-600 bg-white/50 p-2 rounded border border-purple-200">
                            💡 <strong>Tip:</strong> Agrega steps tipo "Hacer una Pregunta" o "Recolectar Imagen" para definir qué datos quieres conseguir.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="mb-6 p-5 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl border-2 border-purple-300 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
                <i data-lucide="list-checks" class="w-5 h-5 text-purple-600"></i>
                <h4 class="font-bold text-purple-900">¿Qué necesitas conseguir?</h4>
                <span class="ml-auto px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">${fieldsToCollect.length}</span>
            </div>

            <p class="text-xs text-purple-700 mb-3">
                Con modo <strong>Get All</strong>, la IA extraerá estos campos de las respuestas del usuario:
            </p>

            <div class="space-y-2">
                ${fieldsToCollect.map((field, idx) => `
                    <div class="flex items-start gap-2 p-2 bg-white/70 rounded-lg border border-purple-200 hover:border-purple-400 transition-all">
                        <div class="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            ${idx + 1}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <code class="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">{{${field.variable}}}</code>
                                <span class="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">${field.type}</span>
                            </div>
                            <p class="text-xs text-slate-600 line-clamp-2">${field.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p class="text-[10px] text-emerald-800 flex items-start gap-1">
                    <i data-lucide="sparkles" class="w-3 h-3 mt-0.5 shrink-0"></i>
                    <span>
                        <strong>Magia IA:</strong> Si el usuario menciona varios de estos datos en una sola respuesta,
                        la IA los extraerá automáticamente y solo preguntará por lo que falte.
                    </span>
                </p>
            </div>
        </div>
    `;
}

function renderStepsBuilderV3() {
    return `
        <div class="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i data-lucide="list-ordered" class="w-4 h-4 text-purple-600"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-sm text-slate-900">Pasos</h3>
                        <p class="text-[10px] text-slate-500">Arrastra • Click editar</p>
                    </div>
                </div>
                <div class="text-xs font-bold text-slate-600 px-2 py-0.5 bg-slate-100 rounded">
                    ${currentFlow.steps.length}
                </div>
            </div>

            <div id="steps-container-v3" class="space-y-2 mb-2">
                ${currentFlow.steps.length === 0 ? `
                    <div class="text-center py-8 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                        <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <i data-lucide="mouse-pointer-click" class="w-6 h-6 text-purple-600"></i>
                        </div>
                        <p class="text-slate-600 font-bold text-xs mb-0.5">Click en tipo de paso →</p>
                        <p class="text-[10px] text-slate-400">Agrega tu primer bloque</p>
                    </div>
                ` : currentFlow.steps.map((step, idx) => renderStepBlockV3(step, idx)).join('')}
            </div>
        </div>
    `;
}

function renderStepBlockV3(step, index) {
    const stepType = STEP_TYPES[step.type] || STEP_TYPES.message;
    const hasAiMode = stepType.supportsAiMode;
    const aiModeActive = step.ai_mode === true;

    // Detectar variables usadas
    const variablesUsed = extractVariablesFromText(step.content || step.message_template || '');

    return `
        <div class="step-block group border border-slate-200 rounded-lg p-2 hover:border-${stepType.color}-400 hover:shadow-md transition-all bg-white cursor-move"
             draggable="true"
             ondragstart="window.handleDragStartV3(event, ${index})"
             ondragover="window.handleDragOverV3(event)"
             ondrop="window.handleDropV3(event, ${index})"
             ondragend="window.handleDragEndV3(event)">

            <div class="flex items-start gap-2">
                <div class="flex flex-col items-center gap-1 shrink-0">
                    <div class="cursor-move touch-none">
                        <div class="w-6 h-6 rounded-full bg-${stepType.color}-100 text-${stepType.color}-700 flex items-center justify-center font-bold text-[10px]">
                            ${index + 1}
                        </div>
                        <div class="flex gap-0.5 justify-center mt-0.5">
                            <div class="w-0.5 h-0.5 bg-slate-300 rounded-full"></div>
                            <div class="w-0.5 h-0.5 bg-slate-300 rounded-full"></div>
                        </div>
                    </div>
                    ${index < currentFlow.steps.length - 1 ? `
                        <div class="w-0.5 h-8 bg-slate-200 group-hover:bg-${stepType.color}-300 transition-colors"></div>
                    ` : ''}
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <i data-lucide="${stepType.icon}" class="w-5 h-5 text-${stepType.color}-600 shrink-0"></i>
                            <h4 class="font-bold text-slate-900 truncate">${stepType.title}</h4>

                            ${hasAiMode ? `
                                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${aiModeActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                                    ${aiModeActive ? '🤖 IA' : '📝 Exacto'}
                                </span>
                            ` : ''}
                        </div>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                            <!-- Reordenar -->
                            <div class="flex flex-col gap-0.5 mr-1 border-r border-slate-200 pr-2">
                                <button onclick="window.moveStepUpV3(${index})"
                                        class="p-0.5 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-700 transition-all ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}"
                                        title="Mover arriba ↑"
                                        ${index === 0 ? 'disabled' : ''}>
                                    <i data-lucide="chevron-up" class="w-4 h-4"></i>
                                </button>
                                <button onclick="window.moveStepDownV3(${index})"
                                        class="p-0.5 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-700 transition-all ${index === currentFlow.steps.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}"
                                        title="Mover abajo ↓"
                                        ${index === currentFlow.steps.length - 1 ? 'disabled' : ''}>
                                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                                </button>
                            </div>

                            <button onclick="window.editStepV3(${index})" class="p-1.5 hover:bg-${stepType.color}-100 rounded-lg text-slate-500 hover:text-${stepType.color}-700 transition-all" title="Editar">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.duplicateStepV3(${index})" class="p-1.5 hover:bg-purple-100 rounded-lg text-slate-500 hover:text-purple-700 transition-all" title="Duplicar">
                                <i data-lucide="copy" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.deleteStepV3(${index})" class="p-1.5 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 transition-all" title="Eliminar">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                    <div class="mt-3 p-3 bg-gradient-to-br from-slate-50 to-white rounded-lg border border-slate-200">
                        ${renderStepPreviewV3(step)}

                        ${variablesUsed.length > 0 ? `
                            <div class="mt-2 pt-2 border-t border-slate-200">
                                <p class="text-[10px] font-bold text-slate-500 mb-1">Variables usadas:</p>
                                <div class="flex flex-wrap gap-1">
                                    ${variablesUsed.map(v => `
                                        <code class="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">${v}</code>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStepPreviewV3(step) {
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
            const typeLabel = {
                'text': '📝 Texto',
                'number': '🔢 Número',
                'email': '📧 Email',
                'phone': '📞 Teléfono'
            }[step.validation_type || 'text'] || '📝 Texto';

            return `
                <div class="space-y-2">
                    <div class="flex items-start gap-2">
                        <i data-lucide="help-circle" class="w-4 h-4 text-purple-500 mt-0.5 shrink-0"></i>
                        <p class="text-sm text-slate-700"><strong>Pregunta:</strong> ${truncate(step.content) || '<em class="text-slate-400">Sin pregunta</em>'}</p>
                    </div>
                    <p class="text-xs text-slate-500 pl-6">
                        Guardar en: <code class="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">${step.variable || 'sin_variable'}</code>
                        • Tipo: ${typeLabel}
                        <span class="ml-1 text-purple-600">🧠 IA validará</span>
                    </p>
                </div>
            `;

        case 'create_quote':
            let productMode = '';
            if (step.products === 'recommended') {
                productMode = `📌 Fijos (${currentFlow.recommended_products.length} producto(s))`;
            } else if (step.products === 'smart_ai') {
                productMode = '🧠 Smart - IA con fallback seguro';
            } else {
                productMode = '🧠 Smart (default)';
            }

            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="file-text" class="w-4 h-4 text-amber-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Crear cotización:</strong> ${productMode}</p>
                    </div>
                </div>
            `;

        case 'send_payment_info':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="credit-card" class="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Enviar datos de pago</strong></p>
                        ${step.message_template ? `<p class="text-xs text-slate-500 mt-1 italic font-mono">"${truncate(step.message_template, 60)}"</p>` : ''}
                    </div>
                </div>
            `;

        case 'collect_image':
            const actionText = step.image_action === 'analyze' ? '🔍 Analizar con IA' : '💾 Solo guardar';
            return `
                <div class="space-y-2">
                    <div class="flex items-start gap-2">
                        <i data-lucide="image" class="w-4 h-4 text-green-500 mt-0.5 shrink-0"></i>
                        <p class="text-sm text-slate-700">${truncate(step.content) || '<em class="text-slate-400">Solicitar imagen</em>'}</p>
                    </div>
                    <p class="text-xs text-slate-500 pl-6">
                        Guardar en: <code class="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">${step.variable || 'imagen'}</code>
                        • Máx: ${step.max_images || 1} imagen(es) • ${actionText}
                    </p>
                </div>
            `;

        case 'wait_for_file':
            const fileTypeLabels = {
                'image': '📸 Imágenes',
                'pdf': '📄 PDF',
                'any': '📎 Cualquier archivo'
            };
            const fileValidation = step.file_action === 'validate' ? '✅ Con validación IA' : '💾 Sin validación';
            return `
                <div class="space-y-2">
                    <div class="flex items-start gap-2">
                        <i data-lucide="file-plus" class="w-4 h-4 text-cyan-500 mt-0.5 shrink-0"></i>
                        <p class="text-sm text-slate-700">${truncate(step.content) || '<em class="text-slate-400">Esperando archivo...</em>'}</p>
                    </div>
                    <p class="text-xs text-slate-500 pl-6">
                        Guardar en: <code class="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">${step.variable || 'archivo'}</code>
                        • ${fileTypeLabels[step.file_type] || '📎 Cualquier archivo'} • ${fileValidation}
                    </p>
                    ${step.file_action === 'validate' && step.validation_prompt ? `
                        <p class="text-xs text-cyan-700 pl-6 italic">🎯 "${truncate(step.validation_prompt, 50)}"</p>
                    ` : ''}
                </div>
            `;

        case 'generate_image':
            const modelLabel = step.image_model?.includes('flux') ? '🎨 IA Rápida' : '✨ IA Múltiple';
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="sparkles" class="w-4 h-4 text-pink-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Generar con:</strong> ${modelLabel}</p>
                        <p class="text-xs text-slate-500 mt-1">
                            Base: <code class="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">${step.source_variable || 'imagen'}</code>
                            → Guardar en: <code class="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">${step.result_variable || 'imagen_generada'}</code>
                        </p>
                        ${step.generation_prompt ? `<p class="text-xs text-pink-700 mt-1 italic">"${truncate(step.generation_prompt, 60)}"</p>` : ''}
                    </div>
                </div>
            `;

        case 'trigger_critical':
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="alert-circle" class="w-4 h-4 text-red-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>🚨 Alerta crítica</strong></p>
                        <p class="text-xs text-slate-500 mt-1">${truncate(step.reason || 'Sin motivo especificado', 60)}</p>
                        ${step.notify_admin ? '<p class="text-xs text-red-600 mt-1">📧 Notificar administrador</p>' : ''}
                    </div>
                </div>
            `;

        case 'create_task':
            const priorityLabels = {
                'high': '🔴 Alta',
                'medium': '🟡 Media',
                'low': '🟢 Baja'
            };
            const priority = priorityLabels[step.priority] || '🟡 Media';
            return `
                <div class="flex items-start gap-2">
                    <i data-lucide="check-circle" class="w-4 h-4 text-blue-500 mt-0.5 shrink-0"></i>
                    <div class="text-sm text-slate-700">
                        <p><strong>Crear tarea:</strong> ${truncate(step.task_title || 'Sin título', 50)}</p>
                        <p class="text-xs text-slate-500 mt-1">
                            Prioridad: ${priority}
                            ${step.due_date_offset_days ? ` • Vence en: ${step.due_date_offset_days} día(s)` : ''}
                        </p>
                    </div>
                </div>
            `;

        default:
            return `<p class="text-xs text-slate-500">Tipo: ${step.type}</p>`;
    }
}

function renderStepTypesPalette() {
    return Object.entries(STEP_TYPES).map(([type, config]) => `
        <button onclick="window.addStepV3('${type}')"
                class="step-type-btn w-full mb-1.5 p-2 border border-slate-200 rounded-lg hover:border-${config.color}-400 hover:bg-${config.color}-50 transition-all group text-left active:scale-95">
            <div class="flex items-start gap-2">
                <div class="w-6 h-6 bg-${config.color}-100 rounded flex items-center justify-center group-hover:bg-${config.color}-200 transition-colors shrink-0">
                    <i data-lucide="${config.icon}" class="w-3.5 h-3.5 text-${config.color}-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-[10px] text-slate-900 mb-0.5">${config.title}</h4>
                    <p class="text-[9px] text-slate-600 leading-snug">${config.description}</p>
                    ${config.supportsAiMode ? `
                        <div class="mt-0.5 flex items-center gap-0.5 text-[8px] text-emerald-600">
                            <i data-lucide="sparkles" class="w-2.5 h-2.5"></i>
                            IA
                        </div>
                    ` : ''}
                </div>
            </div>
        </button>
    `).join('');
}

// ==================== FUNCIONES AUXILIARES ====================

function updateCollectedVariables() {
    // Actualizar lista de variables recolectadas dinámicamente
    AVAILABLE_VARIABLES.collected.vars = [];
    AVAILABLE_VARIABLES.image.vars = [];

    currentFlow.steps.forEach((step, idx) => {
        if (step.type === 'question' && step.variable) {
            AVAILABLE_VARIABLES.collected.vars.push({
                name: step.variable,
                description: `Respuesta del paso ${idx + 1}`,
                example: step.validation?.type === 'number' ? '50' : 'Respuesta del usuario',
                sourceStep: idx + 1
            });
        }

        if (step.type === 'collect_image' && step.variable) {
            AVAILABLE_VARIABLES.collected.vars.push({
                name: step.variable,
                description: `Imagen del paso ${idx + 1}`,
                example: '[URL de imagen]',
                sourceStep: idx + 1
            });

            // Si tiene análisis de IA, agregar también la variable de análisis
            if (step.image_action === 'analyze' && step.analysis_variable) {
                AVAILABLE_VARIABLES.collected.vars.push({
                    name: step.analysis_variable,
                    description: `Análisis IA del paso ${idx + 1}`,
                    example: 'Descripción del contenido de la imagen...',
                    sourceStep: idx + 1
                });
            }
        }

        if (step.type === 'wait_for_file' && step.variable) {
            AVAILABLE_VARIABLES.collected.vars.push({
                name: step.variable,
                description: `Archivo del paso ${idx + 1}`,
                example: '[URL de archivo]',
                sourceStep: idx + 1
            });
        }
    });
}

function extractVariablesFromText(text) {
    if (!text) return [];
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
}

function refreshEditorV3() {
    updateCollectedVariables();

    // Actualizar configuración básica (para reflejar cambios de modo)
    const basicSettingsContainer = document.getElementById('basic-settings-container-v3');
    if (basicSettingsContainer) {
        basicSettingsContainer.innerHTML = renderBasicSettingsV3();
    }

    const stepsContainer = document.getElementById('steps-container-v3');
    const keywordsContainer = document.getElementById('keywords-container');

    if (stepsContainer) {
        stepsContainer.innerHTML = currentFlow.steps.length === 0 ? `
            <div class="text-center py-16 border-2 border-dashed border-slate-300 rounded-xl bg-gradient-to-br from-slate-50 to-white">
                <div class="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md animate-float">
                    <i data-lucide="mouse-pointer-click" class="w-10 h-10 text-purple-600"></i>
                </div>
                <p class="text-slate-600 font-bold text-lg mb-1">Haz clic en un tipo de paso →</p>
                <p class="text-xs text-slate-400">para agregar el primer bloque de tu conversación</p>
            </div>
        ` : currentFlow.steps.map((step, idx) => renderStepBlockV3(step, idx)).join('');
    }

    if (keywordsContainer) {
        keywordsContainer.innerHTML = currentFlow.triggerKeywords.length === 0 ? `
            <span class="text-xs text-slate-400 italic">Agrega al menos una palabra clave...</span>
        ` : currentFlow.triggerKeywords.map((kw, idx) => `
            <div class="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-sm hover:shadow-md transition-all animate-in">
                <span class="text-sm font-medium">${kw}</span>
                <button onclick="window.removeKeywordV3(${idx})" class="text-white/70 hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
    }

    if (window.lucide) lucide.createIcons();
}

// ==================== HANDLERS DE INTERACCIÓN ====================

window.addKeywordV3 = () => {
    const input = document.getElementById('new-keyword-input-v3');
    const keyword = input.value.trim();

    if (keyword && !currentFlow.triggerKeywords.includes(keyword)) {
        currentFlow.triggerKeywords.push(keyword);
        input.value = '';
        refreshEditorV3();
    }
};

window.removeKeywordV3 = (index) => {
    currentFlow.triggerKeywords.splice(index, 1);
    refreshEditorV3();
};

window.addStepV3 = (stepType) => {
    // Si hay una simulación activa, resetearla porque el flow cambió
    if (simulatorState.active) {
        window.resetSimulator();
        window.showToast?.('⚠️ Simulación reiniciada por cambios en el flow', 'warning');
    }

    const stepTypeConfig = STEP_TYPES[stepType];
    const newStep = {
        id: `step_${Date.now()}`,
        type: stepType,
        content: stepTypeConfig?.defaultContent || '',
        next_step: null
    };

    // Modo IA por defecto si lo soporta
    if (stepTypeConfig?.supportsAiMode) {
        newStep.ai_mode = true;
    }

    // Configuración por defecto según tipo
    switch (stepType) {
        case 'question':
            newStep.variable = 'respuesta';
            newStep.validation_type = 'text';
            newStep.ai_validation = true;
            newStep.ai_mode = false; // Preguntas exactas por defecto
            break;
        case 'collect_image':
            newStep.variable = 'imagen';
            newStep.max_images = 1;
            newStep.optional = false;
            newStep.read_content = false;
            break;
        case 'wait_for_file':
            newStep.variable = 'archivo';
            newStep.file_type = 'image'; // image, pdf, any
            newStep.optional = false;
            newStep.allow_conversation = true; // Permite seguir conversando
            newStep.ai_mode = true; // IA puede responder mientras espera
            newStep.file_action = 'save_only'; // save_only, validate
            newStep.validation_prompt = ''; // Prompt para validar con IA
            break;
        case 'generate_image':
            newStep.image_model = 'flux-2/pro-image-to-image';
            newStep.source_variable = 'imagen'; // Variable con URL de imagen base
            newStep.generation_prompt = 'Recrea esta imagen en estilo profesional';
            newStep.image_size = '1024x1024';
            newStep.output_format = 'jpeg';
            newStep.result_variable = 'imagen_generada';
            newStep.wait_for_response = false;
            break;
        case 'create_quote':
            // Siempre usar modo smart por defecto (analiza conversación con fallback a recomendados)
            newStep.products = 'smart_ai';
            newStep.send_to_customer = true;
            newStep.ask_feedback = false; // Opcional preguntar si tiene dudas
            newStep.feedback_message = '¿Qué te parece? ¿Tienes alguna duda?';
            break;
        case 'send_payment_info':
            newStep.message_template = '💰 Total: {{total_estimate}}\n\nPara confirmar:\n🏦 {{bank_name}}\n💳 {{bank_account}}\n👤 {{account_holder}}';
            newStep.payment_method = 'transfer';
            newStep.ai_mode = false; // Datos de pago siempre exactos
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
    refreshEditorV3();

    setTimeout(() => {
        const stepsContainer = document.getElementById('steps-container-v3');
        if (stepsContainer) {
            stepsContainer.scrollTop = stepsContainer.scrollHeight;
        }
    }, 100);
};

window.setFlowMode = (mode) => {
    currentFlow.mode = mode;
    refreshEditorV3();
};

window.editStepV3 = (index) => {
    const step = currentFlow.steps[index];
    const stepType = STEP_TYPES[step.type];

    const modal = document.createElement('div');
    modal.id = 'edit-step-modal';
    modal.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4';

    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-${stepType.color}-50 to-${stepType.color}-100">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-${stepType.color}-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <i data-lucide="${stepType.icon}" class="w-6 h-6 text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900">Editar: ${stepType.title}</h2>
                            <p class="text-sm text-slate-600">Paso ${index + 1} del flow</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('edit-step-modal').remove()"
                            class="w-10 h-10 rounded-full hover:bg-white/50 flex items-center justify-center">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                ${renderStepEditor(step, index, stepType)}
            </div>

            <!-- Footer -->
            <div class="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                <button onclick="document.getElementById('edit-step-modal').remove()"
                        class="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-all">
                    Cancelar
                </button>
                <button onclick="window.saveStepEdit(${index})"
                        class="px-8 py-2.5 bg-gradient-to-r from-${stepType.color}-600 to-${stepType.color}-700 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    Guardar Cambios
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    // Si es send_payment_info, cargar y mostrar datos de pago
    if (step.type === 'send_payment_info') {
        window.loadPaymentPreview(index);
    }
};

function renderStepEditor(step, index, stepType) {
    let html = '';

    // Toggle AI/Exact (si aplica)
    if (stepType.supportsAiMode) {
        const isAi = step.ai_mode !== false;
        html += `
            <div class="mb-6 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                <label class="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <i data-lucide="sparkles" class="w-4 h-4 text-emerald-600"></i>
                    Modo de Envío
                </label>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="window.toggleStepAiMode(${index}, false)" type="button"
                            class="p-3 rounded-xl border-2 transition-all ${!isAi ? 'bg-white border-slate-500 shadow-md' : 'bg-white/50 border-slate-200'}">
                        <div class="text-2xl mb-1">📝</div>
                        <div class="font-bold text-sm ${!isAi ? 'text-slate-900' : 'text-slate-500'}">Exacto</div>
                        <p class="text-[10px] text-slate-600 mt-1">Envía el texto tal cual</p>
                    </button>
                    <button onclick="window.toggleStepAiMode(${index}, true)" type="button"
                            class="p-3 rounded-xl border-2 transition-all ${isAi ? 'bg-white border-emerald-500 shadow-md' : 'bg-white/50 border-slate-200'}">
                        <div class="text-2xl mb-1">🤖</div>
                        <div class="font-bold text-sm ${isAi ? 'text-emerald-900' : 'text-slate-500'}">IA Adaptativa</div>
                        <p class="text-[10px] text-slate-600 mt-1">IA adapta al contexto</p>
                    </button>
                </div>
                <p class="text-xs text-slate-600 mt-3">
                    ${isAi ? '🤖 La IA usará tu texto como inspiración y lo personalizará según la conversación' : '📝 El mensaje se enviará exactamente como lo escribas'}
                </p>
            </div>
        `;
    }

    // Campos específicos según tipo
    switch (step.type) {
        case 'message':
        case 'question':
        case 'collect_image':
        case 'wait_for_file':
            const messageLabel = step.type === 'question' ? 'Pregunta' :
                                step.type === 'collect_image' ? 'Mensaje para pedir imagen' :
                                step.type === 'wait_for_file' ? 'Mensaje mientras espera el archivo' :
                                'Mensaje';
            const messagePlaceholder = step.type === 'wait_for_file' ?
                'Ej: Cuando tengas el archivo listo, envíalo. Mientras tanto puedo responder tus dudas...' :
                'Escribe el mensaje aquí... Usa {{variables}} para datos dinámicos';

            html += `
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <i data-lucide="message-square" class="w-4 h-4 text-${stepType.color}-600"></i>
                            ${messageLabel}
                        </label>
                        <button onclick="window.insertVariableAtCursor('step-content-${index}')" type="button"
                                class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 flex items-center gap-1.5 shadow-sm transition-all">
                            <i data-lucide="braces" class="w-3.5 h-3.5"></i>
                            Insertar Variable
                        </button>
                    </div>
                    <textarea id="step-content-${index}" rows="4"
                              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-${stepType.color}-500 outline-none text-sm resize-none"
                              placeholder="${messagePlaceholder}"
                    >${step.content || ''}</textarea>

                    <!-- Quick access variables -->
                    <div class="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Variables rápidas</p>
                            <button onclick="window.showVariablesGuide()" type="button"
                                    class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                <i data-lucide="book-open" class="w-3 h-3"></i>
                                Ver todas
                            </button>
                        </div>
                        <div id="quick-vars-step-${index}">
                            ${window.generateQuickVariableButtons('step-content-' + index, index)}
                        </div>
                    </div>
                </div>
            `;

            // Adjuntar imágenes (solo para message)
            if (step.type === 'message') {
                const attachType = step.attach_images?.type || 'none';
                const selectedProductId = step.attach_images?.product_id || '';
                const selectedImageIndices = step.attach_images?.image_indices || [0];

                html += `
                    <div class="mb-6 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                        <label class="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <i data-lucide="paperclip" class="w-5 h-5 text-blue-600"></i>
                            Adjuntar imágenes (opcional)
                        </label>
                        <select id="step-attach-type-${index}" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm bg-white mb-3" onchange="window.toggleAttachImageOptions(${index})">
                            <option value="none" ${attachType === 'none' ? 'selected' : ''}>No adjuntar imágenes</option>
                            <option value="upload" ${attachType === 'upload' ? 'selected' : ''}>📤 Cargar imagen</option>
                            <option value="product" ${attachType === 'product' ? 'selected' : ''}>🛍️ Imágenes de producto</option>
                        </select>

                        <!-- Opción: Cargar imagen -->
                        <div id="attach-upload-${index}" style="display: ${attachType === 'upload' ? 'block' : 'none'};" class="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                            <label class="block text-sm font-medium text-slate-700 mb-2">Subir imagen</label>
                            <input type="file" id="step-attach-image-file-${index}" accept="image/*"
                                   class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                            <p class="text-xs text-slate-500 mt-2">La imagen se subirá a Bunny CDN y se enviará con el mensaje</p>
                            ${step.attach_images?.uploaded_url ? `<img src="${step.attach_images.uploaded_url}" class="mt-2 w-32 h-32 object-cover rounded-lg border">` : ''}
                        </div>

                        <!-- Opción: Imágenes de producto -->
                        <div id="attach-product-${index}" style="display: ${attachType === 'product' ? 'block' : 'none'};" class="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                            <label class="block text-sm font-medium text-slate-700 mb-2">Buscar producto</label>
                            <div class="relative">
                                <input type="text"
                                       id="step-attach-product-search-${index}"
                                       class="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm pr-10"
                                       placeholder="Escribe para buscar producto..."
                                       autocomplete="off"
                                       oninput="window.searchProducts(${index})"
                                       onfocus="window.searchProducts(${index})"
                                       value="${selectedProductId ? (window.getAllProducts().find(p => p.id === selectedProductId)?.name || '') : ''}">
                                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>

                                <!-- Dropdown de resultados -->
                                <div id="product-search-results-${index}" class="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto hidden">
                                    <!-- Se llena dinámicamente -->
                                </div>

                                <!-- ID seleccionado (hidden) -->
                                <input type="hidden" id="step-attach-product-${index}" value="${selectedProductId || ''}">
                            </div>
                            <p class="text-xs text-slate-500 mt-2">💡 Total de productos: ${window.getAllProducts().length || 0}</p>

                            <div id="product-images-selector-${index}" class="mt-3">
                                ${selectedProductId ? window.renderProductImageSelector(index, selectedProductId, selectedImageIndices) : '<p class="text-xs text-slate-500">Busca y selecciona un producto para ver sus imágenes</p>'}
                            </div>
                        </div>

                        <p class="text-xs text-blue-700 mt-2">💡 Las imágenes se enviarán junto con el mensaje de texto</p>
                    </div>
                `;
            }

            if (step.type === 'question') {
                html += `
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Guardar respuesta en variable</label>
                            <input type="text" id="step-variable-${index}" value="${step.variable || ''}"
                                   class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none text-sm"
                                   placeholder="nombre_variable">
                            <p class="text-xs text-slate-500 mt-2">Ejemplo: {{${step.variable || 'nombre_variable'}}}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Tipo de respuesta</label>
                            <select id="step-validation-type-${index}"
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none text-sm">
                                <option value="text" ${(step.validation_type || 'text') === 'text' ? 'selected' : ''}>Texto</option>
                                <option value="number" ${step.validation_type === 'number' ? 'selected' : ''}>Número</option>
                                <option value="email" ${step.validation_type === 'email' ? 'selected' : ''}>Email</option>
                                <option value="phone" ${step.validation_type === 'phone' ? 'selected' : ''}>Teléfono</option>
                            </select>
                            <p class="text-xs text-slate-500 mt-2">🧠 La IA validará automáticamente</p>
                        </div>
                    </div>
                `;
            }

            if (step.type === 'collect_image') {
                const imageAction = step.image_action || 'save_only';
                const imageModel = step.image_model || 'flux-2/pro-image-to-image';
                const waitTime = step.wait_time || 25;

                html += `
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Guardar en variable</label>
                            <input type="text" id="step-variable-${index}" value="${step.variable || ''}"
                                   class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 outline-none text-sm"
                                   placeholder="imagen">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Máximo de imágenes</label>
                            <input type="number" id="step-max-images-${index}" value="${step.max_images || 1}" min="1" max="10"
                                   class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 outline-none text-sm">
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-bold text-slate-700 mb-2">
                            <i data-lucide="clock" class="w-4 h-4 inline"></i>
                            Tiempo de espera para más imágenes (segundos)
                        </label>
                        <input type="number" id="step-wait-time-${index}" value="${waitTime}" min="10" max="60" step="5"
                               class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-500 outline-none text-sm">
                        <p class="text-xs text-slate-500 mt-2">⏱️ Si el usuario puede enviar varias imágenes, esperará este tiempo antes de procesar</p>
                    </div>

                    <div class="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                        <label class="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <i data-lucide="sparkles" class="w-5 h-5 text-green-600"></i>
                            ¿Qué hacer con la(s) imagen(es)?
                        </label>

                        <div class="space-y-3">
                            <label class="flex items-start gap-3 p-3 bg-white rounded-lg border-2 ${imageAction === 'save_only' ? 'border-green-500 bg-green-50' : 'border-slate-200'} cursor-pointer hover:border-green-300 transition-all">
                                <input type="radio" name="image-action-${index}" value="save_only" ${imageAction === 'save_only' ? 'checked' : ''}
                                       onchange="window.updateImageActionUI(${index}, 'save_only')"
                                       class="mt-1 w-4 h-4 text-green-600">
                                <div class="flex-1">
                                    <div class="font-bold text-sm text-slate-800">💾 Solo guardar URL</div>
                                    <p class="text-xs text-slate-600 mt-1">Rápido y gratis. Guarda el link de la imagen para usar después.</p>
                                </div>
                            </label>

                            <label class="flex items-start gap-3 p-3 bg-white rounded-lg border-2 ${imageAction === 'analyze' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'} cursor-pointer hover:border-purple-300 transition-all">
                                <input type="radio" name="image-action-${index}" value="analyze" ${imageAction === 'analyze' ? 'checked' : ''}
                                       onchange="window.updateImageActionUI(${index}, 'analyze')"
                                       class="mt-1 w-4 h-4 text-purple-600">
                                <div class="flex-1">
                                    <div class="font-bold text-sm text-slate-800">🔍 Analizar con IA</div>
                                    <p class="text-xs text-slate-600 mt-1">La IA lee y describe la imagen. Útil para extraer información visual.</p>
                                </div>
                            </label>

                            <div class="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                <p class="text-xs text-blue-800">
                                    💡 <strong>¿Quieres generar/recrear imagen?</strong> Usa el step <strong>"Generar Imagen con IA"</strong> en pasos posteriores.
                                    Podrás usar estas imágenes guardadas + variables recolectadas para crear nuevas imágenes.
                                </p>
                            </div>
                        </div>

                        <!-- Campos condicionales según la acción -->
                        <div id="image-action-fields-${index}" class="mt-4">
                            ${imageAction !== 'save_only' ? `
                                <div class="p-3 bg-white rounded-lg border-2 border-slate-200">
                                    <label class="block text-sm font-bold text-slate-700 mb-2">
                                        ${imageAction === 'analyze' ? '🔍 Prompt para análisis' : '🎨 Prompt para generación'}
                                    </label>
                                    <textarea id="step-image-prompt-${index}" rows="3"
                                              class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-green-500 outline-none text-sm resize-none"
                                              placeholder="${imageAction === 'analyze' ? 'Describe la imagen en detalle, identifica colores, elementos principales...' : 'Crea una versión mejorada con estilo moderno y colores vibrantes...'}"
                                    >${step.image_prompt || ''}</textarea>

                                    ${imageAction === 'analyze' ? `
                                        <div class="mt-3">
                                            <label class="block text-sm font-bold text-slate-700 mb-2">Guardar análisis en variable</label>
                                            <input type="text" id="step-analysis-variable-${index}" value="${step.analysis_variable || 'analisis_imagen'}"
                                                   class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-purple-500 outline-none text-sm"
                                                   placeholder="analisis_imagen">
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }

            if (step.type === 'wait_for_file') {
                const fileAction = step.file_action || 'save_only';

                html += `
                    <!-- Separador visual -->
                    <div class="my-6 border-t-2 border-dashed border-slate-300"></div>

                    <!-- Sección de configuración de archivo -->
                    <div class="mb-6 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
                        <h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <i data-lucide="settings" class="w-4 h-4 text-slate-600"></i>
                            Configuración del archivo
                        </h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Guardar en variable</label>
                                <input type="text" id="step-variable-${index}" value="${step.variable || ''}"
                                       class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-cyan-500 outline-none text-sm"
                                       placeholder="archivo">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Tipo de archivo</label>
                                <select id="step-file-type-${index}" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-cyan-500 outline-none text-sm">
                                    <option value="image" ${step.file_type === 'image' ? 'selected' : ''}>📸 Solo imágenes</option>
                                    <option value="pdf" ${step.file_type === 'pdf' ? 'selected' : ''}>📄 Solo PDF</option>
                                    <option value="any" ${step.file_type === 'any' ? 'selected' : ''}>📎 Cualquier archivo</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Sección PRINCIPAL: Cómo interpretar el archivo -->
                    <div class="mb-6 p-5 bg-gradient-to-br from-purple-50 via-cyan-50 to-blue-50 rounded-2xl border-3 border-purple-300 shadow-lg">
                        <div class="mb-4 pb-3 border-b-2 border-purple-200">
                            <h3 class="text-base font-black text-purple-900 flex items-center gap-2">
                                <i data-lucide="brain" class="w-6 h-6 text-purple-600"></i>
                                🎯 ¿CÓMO INTERPRETAR EL ARCHIVO QUE LLEGUE?
                            </h3>
                            <p class="text-xs text-purple-700 mt-1 font-medium">Esta es la configuración más importante de este step</p>
                        </div>

                        <div class="space-y-3">
                            <label class="flex items-start gap-3 p-4 bg-white rounded-xl border-3 ${fileAction === 'save_only' ? 'border-slate-500 bg-slate-50 shadow-md' : 'border-slate-200'} cursor-pointer hover:border-slate-400 transition-all">
                                <input type="radio" name="file-action-${index}" value="save_only" ${fileAction === 'save_only' ? 'checked' : ''}
                                       onchange="window.updateFileActionUI(${index}, 'save_only')"
                                       class="mt-1 w-5 h-5 text-slate-600">
                                <div class="flex-1">
                                    <div class="font-bold text-base text-slate-900">💾 Solo recibir y guardar</div>
                                    <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">Acepta cualquier archivo sin validación. Guarda la URL del archivo en la variable y continúa al siguiente paso automáticamente.</p>
                                </div>
                            </label>

                            <label class="flex items-start gap-3 p-4 bg-white rounded-xl border-3 ${fileAction === 'validate' ? 'border-purple-600 bg-purple-50 shadow-lg' : 'border-slate-200'} cursor-pointer hover:border-purple-400 transition-all">
                                <input type="radio" name="file-action-${index}" value="validate" ${fileAction === 'validate' ? 'checked' : ''}
                                       onchange="window.updateFileActionUI(${index}, 'validate')"
                                       class="mt-1 w-5 h-5 text-purple-600">
                                <div class="flex-1">
                                    <div class="font-bold text-base text-purple-900">✅ Validar con IA antes de continuar</div>
                                    <p class="text-xs text-purple-700 mt-1.5 leading-relaxed">La IA lee el archivo y verifica si cumple con los criterios que definas. Si NO es válido, le pide al cliente que envíe otro archivo.</p>
                                </div>
                            </label>
                        </div>

                        <!-- Campo condicional de validación -->
                        <div id="file-action-fields-${index}" class="mt-4 ${fileAction === 'validate' ? '' : 'hidden'}">
                            <div class="p-4 bg-white rounded-xl border-2 border-purple-300 shadow-md">
                                <label class="block text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                                    <i data-lucide="file-search" class="w-4 h-4 text-purple-600"></i>
                                    🎯 Prompt de validación (Instrucciones para la IA)
                                </label>
                                <textarea id="step-validation-prompt-${index}" rows="4"
                                          class="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 outline-none text-sm resize-none font-mono"
                                          placeholder="Ejemplo para comprobante de pago:&#10;&#10;Verifica si es un comprobante de pago válido. Debe contener:&#10;- Monto de la transferencia&#10;- Fecha y hora&#10;- Referencia o número de operación&#10;- Nombre del banco&#10;&#10;Si falta algún dato, NO es válido."
                                >${step.validation_prompt || ''}</textarea>
                                <div class="mt-3 p-3 bg-purple-100 rounded-lg border border-purple-200">
                                    <p class="text-xs text-purple-800 leading-relaxed">
                                        <strong>💡 Tip:</strong> Sé específico sobre qué debe contener el archivo para ser válido. La IA analizará la imagen/documento y determinará si cumple con tus criterios.
                                    </p>
                                    <p class="text-xs text-purple-700 mt-2">
                                        ⚠️ Si la IA detecta que NO es válido → automáticamente le pedirá al cliente que envíe otro archivo
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-cyan-50 rounded-xl border-2 border-cyan-200 mb-6">
                        <div class="flex items-start gap-3">
                            <i data-lucide="info" class="w-5 h-5 text-cyan-600 mt-0.5"></i>
                            <div class="flex-1">
                                <p class="text-sm font-bold text-cyan-900 mb-1">💬 Modo conversación activa</p>
                                <p class="text-xs text-cyan-800 leading-relaxed">
                                    Mientras espera el archivo, el cliente puede seguir escribiendo preguntas y la IA responderá.
                                    Útil para comprobantes de pago, donde el cliente puede tener dudas antes de enviar.
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            }
            break;

        case 'create_quote':
            const showProductSelector = step.products === 'recommended' || step.products === 'smart_ai';
            html += `
                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i data-lucide="package" class="w-4 h-4 text-amber-600"></i>
                        Modo de selección de productos
                    </label>
                    <select id="step-products-${index}"
                            onchange="window.toggleProductSelector(${index})"
                            class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none text-sm">
                        <option value="recommended" ${step.products === 'recommended' ? 'selected' : ''}>📌 Fijos - Solo productos recomendados (${currentFlow.recommended_products.length})</option>
                        <option value="smart_ai" ${step.products === 'smart_ai' ? 'selected' : ''}>🧠 Smart (Recomendado) - IA con fallback seguro</option>
                    </select>
                    <div class="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                        <p class="text-xs text-amber-800 leading-relaxed">
                            <strong>Smart:</strong> La IA analiza la conversación completa. Si menciona un producto específico → lo usa. Si no → usa productos recomendados como fallback seguro.
                        </p>
                    </div>
                </div>

                <!-- Selector de productos recomendados -->
                <div id="product-selector-${index}" class="mb-6 ${showProductSelector ? '' : 'hidden'}">
                    <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i data-lucide="shopping-bag" class="w-4 h-4 text-purple-600"></i>
                        Productos recomendados para este flow
                        <span class="text-xs font-normal text-slate-500">(${currentFlow.recommended_products.length} seleccionados)</span>
                    </label>

                    <!-- Buscador -->
                    <div class="mb-3 relative">
                        <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text"
                               id="product-search-${index}"
                               oninput="window.filterProductsInStep(${index})"
                               placeholder="Buscar productos..."
                               class="w-full pl-10 pr-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-purple-500 outline-none">
                    </div>

                    <!-- Lista de productos -->
                    <div id="products-list-${index}" class="max-h-64 overflow-y-auto space-y-2 border-2 border-slate-200 rounded-lg p-2 bg-white custom-scrollbar">
                        ${availableProducts.length === 0 ? `
                            <p class="text-sm text-slate-500 text-center py-4">No tienes productos registrados</p>
                        ` : availableProducts.map(product => {
                            const isSelected = currentFlow.recommended_products.includes(product.id);
                            const hasTiers = product.tiers && Array.isArray(product.tiers) && product.tiers.length > 0;
                            const priceInfo = hasTiers
                                ? `Desde $${product.tiers[0].price}`
                                : `$${product.price || '0.00'}`;

                            return `
                                <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors product-item" data-product-name="${product.product_name.toLowerCase()}">
                                    <input type="checkbox"
                                           value="${product.id}"
                                           ${isSelected ? 'checked' : ''}
                                           onchange="window.updateRecommendedProducts(${index})"
                                           class="w-4 h-4 text-purple-600 rounded">
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-bold text-slate-800 truncate">${product.product_name}</p>
                                        <div class="flex items-center gap-2 text-xs text-slate-500">
                                            <span class="font-bold text-emerald-600">${priceInfo}</span>
                                            ${hasTiers ? '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">TIERS</span>' : ''}
                                        </div>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>

                    ${currentFlow.recommended_products.length === 0 ? `
                        <p class="mt-2 text-xs text-orange-600 font-bold">⚠️ Selecciona al menos un producto para usar este modo</p>
                    ` : ''}
                </div>

                <div class="mb-6 space-y-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="step-send-to-customer-${index}" ${step.send_to_customer !== false ? 'checked' : ''}
                               class="w-4 h-4 text-amber-600">
                        <span class="text-sm font-bold text-slate-700">Enviar cotización al cliente automáticamente</span>
                    </label>

                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="step-ask-feedback-${index}" ${step.ask_feedback ? 'checked' : ''}
                               onchange="window.toggleQuoteFeedback(${index})"
                               class="w-4 h-4 text-emerald-600">
                        <span class="text-sm font-bold text-slate-700">Preguntar si tiene dudas después de cotizar</span>
                    </label>

                    <div id="feedback-options-${index}" class="${step.ask_feedback ? '' : 'hidden'} ml-6 space-y-3">
                        <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <label class="block text-xs font-bold text-emerald-900 mb-2">Mensaje de seguimiento:</label>
                            <input type="text" id="step-feedback-message-${index}" value="${step.feedback_message || '¿Qué te parece? ¿Tienes alguna duda?'}"
                                   class="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg text-sm focus:border-emerald-500 outline-none"
                                   placeholder="¿Qué te parece? ¿Tienes alguna duda?">
                            <p class="text-xs text-emerald-700 mt-2">La respuesta se guardará en <code class="bg-emerald-200 px-1 py-0.5 rounded">{{respuesta_cotizacion}}</code></p>
                        </div>

                        <div class="p-3 bg-blue-50 rounded-lg border-2 border-blue-300">
                            <div class="flex items-start gap-2">
                                <i data-lucide="brain" class="w-4 h-4 text-blue-600 mt-0.5 shrink-0"></i>
                                <div class="flex-1">
                                    <p class="text-xs font-bold text-blue-900 mb-1">🤖 Sistema Inteligente Automático</p>
                                    <p class="text-xs text-blue-800 leading-relaxed">
                                        Si el cliente responde con una pregunta o duda, la IA (elina-v5) responderá automáticamente usando todo su conocimiento antes de continuar con el flow. <strong>No necesitas configurar nada.</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'send_payment_info':
            html += `
                <!-- Aviso de Configuración de Pagos -->
                <div class="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
                            <i data-lucide="info" class="w-5 h-5 text-white"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-slate-900 text-sm mb-1">💡 Configura tus datos de pago</h4>
                            <p class="text-xs text-slate-700 mb-3">
                                Las variables {{bank_name}}, {{bank_account}}, etc. se llenan automáticamente con la información que configures en <strong>Settings → Pagos</strong>
                            </p>
                            <button type="button" onclick="window.goToPaymentSettings()"
                                class="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg text-xs hover:bg-blue-600 transition-all flex items-center gap-2">
                                <i data-lucide="settings" class="w-3.5 h-3.5"></i>
                                Ir a Configurar Pagos
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Preview de Datos Reales de Pago -->
                <div id="payment-preview-${index}" class="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                            <i data-lucide="credit-card" class="w-5 h-5 text-white"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-slate-900 text-sm mb-2">📋 Datos que se enviarán</h4>
                            <div id="payment-data-display-${index}" class="space-y-1.5 text-xs">
                                <p class="text-slate-500 italic">Cargando datos de pago...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-2">Plantilla del mensaje</label>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs text-slate-500">Personaliza el mensaje con variables</span>
                        <button onclick="window.insertVariableAtCursor('step-message-template-${index}')" type="button"
                                class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 flex items-center gap-1.5 shadow-sm transition-all">
                            <i data-lucide="braces" class="w-3.5 h-3.5"></i>
                            Variables
                        </button>
                    </div>
                    <textarea id="step-message-template-${index}" rows="6"
                              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm resize-none font-mono"
                              placeholder="💰 Total: {{total_estimate}}\n\n🏦 {{bank_name}}\n💳 {{bank_account}}\n👤 {{account_holder}}"
                    >${step.message_template || ''}</textarea>

                    <!-- Quick access variables para payment -->
                    <div class="mt-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">💳 Variables de pago</p>
                            <button onclick="window.showVariablesGuide()" type="button"
                                    class="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                                <i data-lucide="book-open" class="w-3 h-3"></i>
                                Ver todas
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            ${AVAILABLE_VARIABLES.payment.vars.map(v => `
                                <button type="button"
                                        onclick="window.insertQuickVariable('step-message-template-${index}', '{{${v.name}}}')"
                                        class="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-700 rounded-full text-[11px] font-medium transition-all hover:scale-105"
                                        title="${v.description}">
                                    <code class="font-mono">{{${v.name}}}</code>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'create_task':
            html += `
                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-2">Título de la tarea</label>
                    <input type="text" id="step-task-title-${index}" value="${step.task_title || ''}"
                           class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm"
                           placeholder="Seguimiento de pedido - {{contact_name}}">
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-2">Descripción</label>
                    <textarea id="step-task-description-${index}" rows="3"
                              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm resize-none"
                              placeholder="Detalles de la tarea...">${step.description || ''}</textarea>

                    <!-- Quick access variables -->
                    <div class="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Variables rápidas</p>
                            <button onclick="window.showVariablesGuide()" type="button"
                                    class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                <i data-lucide="book-open" class="w-3 h-3"></i>
                                Ver todas
                            </button>
                        </div>
                        ${window.generateQuickVariableButtons('step-task-description-' + index, index)}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Vencimiento (días)</label>
                        <input type="number" id="step-due-offset-${index}" value="${step.due_date_offset_days || 7}" min="1"
                               class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Prioridad</label>
                        <select id="step-priority-${index}" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm">
                            <option value="low" ${step.priority === 'low' ? 'selected' : ''}>Baja</option>
                            <option value="medium" ${step.priority === 'medium' ? 'selected' : ''}>Media</option>
                            <option value="high" ${step.priority === 'high' ? 'selected' : ''}>Alta</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'generate_image':
            const genModel = step.image_model || 'flux-2/pro-image-to-image';
            html += `
                <div class="mb-6 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200">
                    <label class="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <i data-lucide="sparkles" class="w-5 h-5 text-pink-600"></i>
                        Modelo de IA para generar
                    </label>
                    <select id="step-image-model-${index}" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pink-500 outline-none text-sm bg-white">
                        <option value="flux-2/pro-image-to-image" ${genModel === 'flux-2/pro-image-to-image' ? 'selected' : ''}>🎨 IA Rápida (1 imagen)</option>
                        <option value="google/nano-banana-edit" ${genModel === 'google/nano-banana-edit' ? 'selected' : ''}>✨ IA Múltiple (Hasta 10 imágenes)</option>
                    </select>
                    <p class="text-xs text-pink-700 mt-2">💡 IA Múltiple es mejor para editar varias imágenes a la vez</p>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-2">
                        <i data-lucide="link" class="w-4 h-4 inline"></i>
                        Variable con URLs de imágenes
                    </label>
                    <input type="text" id="step-source-variable-${index}" value="${step.source_variable || ''}"
                           class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pink-500 outline-none text-sm"
                           placeholder="imagen_referencia">
                    <p class="text-xs text-slate-500 mt-2">Variable que contiene las URLs de imágenes guardadas en pasos anteriores</p>
                </div>

                <div class="mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <i data-lucide="wand-2" class="w-4 h-4 text-pink-600"></i>
                            Prompt de generación
                        </label>
                        <button onclick="window.insertVariableAtCursor('step-gen-prompt-${index}')" type="button"
                                class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 flex items-center gap-1.5 shadow-sm transition-all">
                            <i data-lucide="braces" class="w-3.5 h-3.5"></i>
                            Insertar Variable
                        </button>
                    </div>
                    <textarea id="step-gen-prompt-${index}" rows="4"
                              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pink-500 outline-none text-sm resize-none"
                              placeholder="Crea una versión {{estilo}} de este diseño con colores {{color_favorito}}..."
                    >${step.generation_prompt || ''}</textarea>
                    <div class="mt-2 flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <i data-lucide="info" class="w-4 h-4 text-blue-600 mt-0.5 shrink-0"></i>
                        <p class="text-xs text-blue-800">
                            Puedes usar <code class="bg-white px-1.5 py-0.5 rounded">{{variables}}</code> de pasos anteriores.
                        </p>
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <i data-lucide="maximize-2" class="w-4 h-4 text-pink-600"></i>
                        Tamaño de salida
                    </label>
                    <input type="hidden" id="step-gen-image-size-${index}" value="${step.image_size || '1:1'}">
                    <div class="grid grid-cols-4 gap-2">
                        ${['1:1', '16:9', '9:16', '4:3'].map(size => {
                            const selected = (step.image_size || '1:1') === size;
                            const labels = {
                                '1:1': { icon: '◼️', name: 'Cuadrado', desc: '1:1' },
                                '16:9': { icon: '▬', name: 'Horizontal', desc: '16:9' },
                                '9:16': { icon: '▮', name: 'Vertical', desc: '9:16' },
                                '4:3': { icon: '▭', name: 'Clásico', desc: '4:3' }
                            };
                            const label = labels[size];
                            return `
                                <button onclick="window.setImageSize(${index}, '${size}')" type="button"
                                        class="p-3 rounded-xl border-2 transition-all ${selected ? 'bg-white border-pink-500 shadow-md' : 'bg-white/50 border-slate-200 hover:border-pink-300'}">
                                    <div class="text-2xl mb-1">${label.icon}</div>
                                    <div class="font-bold text-xs ${selected ? 'text-pink-900' : 'text-slate-600'}">${label.name}</div>
                                    <p class="text-[10px] text-slate-500 mt-0.5">${label.desc}</p>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-2">Formato</label>
                    <select id="step-gen-output-format-${index}" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pink-500 outline-none text-sm">
                        <option value="png" ${(step.output_format || 'png') === 'png' ? 'selected' : ''}>PNG (Mayor calidad)</option>
                        <option value="jpeg" ${step.output_format === 'jpeg' ? 'selected' : ''}>JPEG (Menor tamaño)</option>
                    </select>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-2">Guardar imagen generada en variable</label>
                    <input type="text" id="step-gen-result-variable-${index}" value="${step.result_variable || 'imagen_generada'}"
                           class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pink-500 outline-none text-sm"
                           placeholder="imagen_generada">
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i data-lucide="clock" class="w-4 h-4"></i>
                        Mensaje mientras se genera (opcional)
                    </label>
                    <input type="text" id="step-gen-loading-message-${index}" value="${step.loading_message || ''}"
                           class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm"
                           placeholder="Dame un momento, estoy generando tu imagen...">
                    <p class="text-xs text-slate-500 mt-2">Este mensaje se enviará al cliente mientras se genera la imagen (puede demorar hasta 3 minutos). Si está vacío, no se enviará nada.</p>
                </div>

                <div class="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" id="step-gen-wait-response-${index}" ${step.wait_for_response ? 'checked' : ''}
                               class="w-5 h-5 text-indigo-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                        <div>
                            <span class="text-sm font-bold text-slate-800">⏸️ Pausar y esperar respuesta después de mostrar imagen</span>
                            <p class="text-xs text-slate-600 mt-1">Si está activado, el flow se pausará después de mostrar la imagen generada, esperando la reacción del cliente antes de continuar.</p>
                        </div>
                    </label>
                </div>

                <div class="mb-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                    <label class="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <i data-lucide="repeat" class="w-5 h-5 text-amber-600"></i>
                        Generaciones totales permitidas
                    </label>
                    <input type="number" id="step-gen-max-regenerations-${index}" value="${step.max_regenerations || 2}" min="1" max="10"
                           class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none text-sm">
                    <p class="text-xs text-amber-700 mt-2">
                        ⚠️ Cada generación consume 1 crédito de IA.<br>
                        💡 <strong>Ejemplo:</strong> 2 = 1 generación original + 1 regeneración (si el cliente no está satisfecho)<br>
                        📌 Si pones 1, solo se generará una vez sin posibilidad de regenerar
                    </p>
                </div>
            `;
            break;
    }

    return html;
}

window.toggleStepAiMode = (index, aiMode) => {
    currentFlow.steps[index].ai_mode = aiMode;
    document.getElementById('edit-step-modal')?.remove();
    window.editStepV3(index);
};

window.setImageSize = (index, size) => {
    currentFlow.steps[index].image_size = size;
    document.getElementById('edit-step-modal')?.remove();
    window.editStepV3(index);
};

window.insertVariableAtCursor = (textareaId) => {
    window.showVariablesGuide();
    // Al hacer click en una variable en la guía, se insertará en el textarea activo
    window.activeTextareaForInsert = textareaId;
};

window.updateImageActionUI = (index, action) => {
    const fieldsContainer = document.getElementById(`image-action-fields-${index}`);
    if (!fieldsContainer) return;

    let fieldsHTML = '';

    if (action === 'analyze') {
        const step = currentFlow.steps[index];
        fieldsHTML = `
            <div class="p-3 bg-white rounded-lg border-2 border-slate-200">
                <label class="block text-sm font-bold text-slate-700 mb-2">
                    🔍 Prompt para análisis
                </label>
                <textarea id="step-image-prompt-${index}" rows="3"
                          class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-green-500 outline-none text-sm resize-none"
                          placeholder="Describe la imagen en detalle, identifica colores, elementos principales..."
                >${step.image_prompt || ''}</textarea>

                <div class="mt-3">
                    <label class="block text-sm font-bold text-slate-700 mb-2">Guardar análisis en variable</label>
                    <input type="text" id="step-analysis-variable-${index}" value="${step.analysis_variable || 'analisis_imagen'}"
                           class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-purple-500 outline-none text-sm"
                           placeholder="analisis_imagen">
                </div>
            </div>
        `;
    }

    // Smooth transition using opacity and max-height
    fieldsContainer.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';

    if (fieldsHTML === '') {
        // Fade out and collapse
        fieldsContainer.style.opacity = '0';
        fieldsContainer.style.maxHeight = '0';
        fieldsContainer.style.overflow = 'hidden';
        setTimeout(() => {
            fieldsContainer.innerHTML = '';
            fieldsContainer.style.maxHeight = '';
        }, 300);
    } else {
        // First set content, then fade in
        fieldsContainer.style.opacity = '0';
        fieldsContainer.style.maxHeight = '0';
        fieldsContainer.innerHTML = fieldsHTML;

        requestAnimationFrame(() => {
            fieldsContainer.style.overflow = 'hidden';
            fieldsContainer.style.maxHeight = '500px';
            fieldsContainer.style.opacity = '1';

            setTimeout(() => {
                fieldsContainer.style.overflow = 'visible';
                fieldsContainer.style.maxHeight = '';
            }, 300);
        });
    }
};

// Helper para obtener todos los productos del usuario
window.getAllProducts = () => {
    return window.userProducts || [];
};

// Helper para toggle de opciones de adjuntar imágenes
window.toggleAttachImageOptions = (index) => {
    const attachType = document.getElementById(`step-attach-type-${index}`)?.value;
    const uploadDiv = document.getElementById(`attach-upload-${index}`);
    const productDiv = document.getElementById(`attach-product-${index}`);

    if (uploadDiv) uploadDiv.style.display = attachType === 'upload' ? 'block' : 'none';
    if (productDiv) productDiv.style.display = attachType === 'product' ? 'block' : 'none';
};

// Helper para actualizar preview de imágenes de producto
window.updateProductImagesPreview = (index) => {
    const productId = document.getElementById(`step-attach-product-${index}`)?.value;
    const container = document.getElementById(`product-images-selector-${index}`);
    if (!container) return;

    if (!productId) {
        container.innerHTML = '<p class="text-xs text-slate-500">Selecciona un producto para ver sus imágenes</p>';
        return;
    }

    container.innerHTML = window.renderProductImageSelector(index, productId, [0]);
};

// Helper para renderizar selector de imágenes de producto
window.renderProductImageSelector = (index, productId, selectedIndices = [0]) => {
    const product = window.getAllProducts().find(p => p.id === productId);
    if (!product || !product.images || product.images.length === 0) {
        return '<p class="text-xs text-slate-500">Este producto no tiene imágenes</p>';
    }

    const maxImages = Math.min(product.images.length, 5);
    let html = `
        <label class="block text-sm font-medium text-slate-700 mb-2">Seleccionar imágenes a enviar (máx 5)</label>
        <div class="grid grid-cols-2 gap-2">
    `;

    product.images.slice(0, maxImages).forEach((imgUrl, imgIndex) => {
        const isChecked = selectedIndices.includes(imgIndex);
        html += `
            <label class="relative cursor-pointer group">
                <input type="checkbox"
                       class="absolute top-2 left-2 w-5 h-5 rounded border-2 border-white shadow-lg z-10"
                       data-image-index="${imgIndex}"
                       data-step-index="${index}"
                       ${isChecked ? 'checked' : ''}>
                <img src="${imgUrl}"
                     class="w-full h-24 object-cover rounded-lg border-2 ${isChecked ? 'border-blue-500' : 'border-slate-200'} group-hover:border-blue-400 transition-all">
            </label>
        `;
    });

    html += `
        </div>
        <p class="text-xs text-slate-500 mt-2">Selecciona las imágenes que quieres enviar. Si seleccionas más de las disponibles o ninguna, se enviará la primera.</p>
    `;

    return html;
};

// Helper para buscar productos
window.searchProducts = (index) => {
    const searchInput = document.getElementById(`step-attach-product-search-${index}`);
    const resultsDiv = document.getElementById(`product-search-results-${index}`);
    const hiddenInput = document.getElementById(`step-attach-product-${index}`);

    if (!searchInput || !resultsDiv) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    const allProducts = window.getAllProducts();

    // Si no hay término de búsqueda, mostrar todos
    let filteredProducts = searchTerm
        ? allProducts.filter(p => p.name.toLowerCase().includes(searchTerm))
        : allProducts;

    // Limitar a 50 resultados para mejor performance
    filteredProducts = filteredProducts.slice(0, 50);

    if (filteredProducts.length === 0) {
        resultsDiv.innerHTML = '<div class="px-4 py-3 text-sm text-slate-500">No se encontraron productos</div>';
        resultsDiv.classList.remove('hidden');
        return;
    }

    // Renderizar resultados
    resultsDiv.innerHTML = filteredProducts.map(product => `
        <div class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
             onclick="window.selectProduct(${index}, '${product.id}', '${product.name.replace(/'/g, "\\'")}')">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <p class="text-sm font-medium text-slate-800">${product.name}</p>
                    <p class="text-xs text-slate-500">${product.images?.length || 0} imágenes disponibles</p>
                </div>
                ${product.images?.[0] ? `
                    <img src="${product.images[0]}" class="w-10 h-10 object-cover rounded border border-slate-200 ml-2">
                ` : ''}
            </div>
        </div>
    `).join('');

    resultsDiv.classList.remove('hidden');
};

// Helper para seleccionar un producto del buscador
window.selectProduct = (index, productId, productName) => {
    const searchInput = document.getElementById(`step-attach-product-search-${index}`);
    const resultsDiv = document.getElementById(`product-search-results-${index}`);
    const hiddenInput = document.getElementById(`step-attach-product-${index}`);

    // Actualizar valores
    if (searchInput) searchInput.value = productName;
    if (hiddenInput) hiddenInput.value = productId;

    // Ocultar resultados
    if (resultsDiv) resultsDiv.classList.add('hidden');

    // Actualizar preview de imágenes
    window.updateProductImagesPreview(index);
};

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', (e) => {
    const searchInputs = document.querySelectorAll('[id^="step-attach-product-search-"]');
    searchInputs.forEach(input => {
        const index = input.id.match(/step-attach-product-search-(\d+)/)?.[1];
        if (!index) return;

        const resultsDiv = document.getElementById(`product-search-results-${index}`);
        if (!resultsDiv) return;

        // Si el click no fue en el input ni en el dropdown, cerrar
        if (!input.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.add('hidden');
        }
    });
});

window.saveStepEdit = (index) => {
    const step = currentFlow.steps[index];

    // Si hay una simulación activa, resetearla porque el flow cambió
    if (simulatorState.active) {
        window.resetSimulator();
        window.showToast?.('⚠️ Simulación reiniciada por cambios en el flow', 'warning');
    }

    // Guardar campos comunes
    const contentField = document.getElementById(`step-content-${index}`);
    if (contentField) step.content = contentField.value;

    const variableField = document.getElementById(`step-variable-${index}`);
    if (variableField) step.variable = variableField.value;

    // Campos específicos por tipo
    switch (step.type) {
        case 'message':
            // Guardar configuración de imágenes adjuntas
            const attachType = document.getElementById(`step-attach-type-${index}`)?.value || 'none';

            if (!step.attach_images) step.attach_images = {};
            step.attach_images.type = attachType;

            if (attachType === 'upload') {
                const fileInput = document.getElementById(`step-attach-image-file-${index}`);
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    // Subir a Bunny CDN inmediatamente
                    const file = fileInput.files[0];

                    // Hacer la subida async
                    (async () => {
                        try {
                            window.showToast?.('📤 Subiendo imagen a CDN...', 'info');

                            const { data: { user } } = await window.auth.sb.auth.getUser();
                            const userId = user?.id;
                            const userEmail = user?.email;

                            // Convertir archivo a ArrayBuffer
                            const arrayBuffer = await file.arrayBuffer();

                            // Subir a Bunny usando la Edge Function
                            const { data: { session } } = await window.auth.sb.auth.getSession();
                            const supabaseUrl = window.auth.sb.supabaseUrl;

                            const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/bunny-upload`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${session.access_token}`,
                                    'Content-Type': file.type,
                                    'X-User-Id': userId || 'anonymous',
                                    'X-User-Email': userEmail || 'anonymous',
                                    'X-Folder': 'flows/messages',
                                    'X-File-Name': encodeURIComponent(file.name)
                                },
                                body: arrayBuffer
                            });

                            if (!uploadResponse.ok) {
                                const errorData = await uploadResponse.json();
                                throw new Error(errorData.error || `Error ${uploadResponse.status}`);
                            }

                            const uploadData = await uploadResponse.json();
                            step.attach_images.uploaded_url = uploadData.cdnUrl;
                            step.attach_images.uploaded_filename = file.name;

                            window.showToast?.('✅ Imagen subida exitosamente', 'success');

                            // Actualizar el flow en la DB
                            await window.saveFlowToDatabase();

                            // Refrescar el editor para mostrar el preview de la imagen subida
                            window.renderStepEditor(index);
                        } catch (uploadError) {
                            console.error('[Upload Error]', uploadError);
                            window.showToast?.(`❌ Error al subir imagen: ${uploadError.message}`, 'error');
                        }
                    })();
                }
            } else if (attachType === 'product') {
                const productId = document.getElementById(`step-attach-product-${index}`)?.value;
                step.attach_images.product_id = productId;

                // Obtener indices seleccionados
                const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-step-index="${index}"]`);
                const selectedIndices = Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => parseInt(cb.dataset.imageIndex));

                step.attach_images.image_indices = selectedIndices.length > 0 ? selectedIndices : [0];
            } else {
                step.attach_images = { type: 'none' };
            }
            break;

        case 'question':
            // Validación con IA SIEMPRE activa
            step.ai_validation = true;

            // Obtener tipo de validación seleccionado
            const validationTypeField = document.getElementById(`step-validation-type-${index}`);
            const validationType = validationTypeField?.value || 'text';
            step.validation_type = validationType;

            // Auto-generar validation_prompt basado en el tipo
            switch (validationType) {
                case 'number':
                    step.validation_prompt = 'Un número válido. Si la respuesta no es un número, reformula la pregunta explicando que necesitas un número.';
                    break;
                case 'email':
                    step.validation_prompt = 'Un email válido con formato correcto (usuario@dominio.com). Si no es un email válido, reformula la pregunta explicando el formato correcto.';
                    break;
                case 'phone':
                    step.validation_prompt = 'Un número de teléfono válido con 10 dígitos (puede incluir lada). Si no es un teléfono válido, reformula la pregunta explicando el formato esperado.';
                    break;
                case 'text':
                default:
                    // Para texto, analizar la pregunta con IA para generar validación inteligente
                    step.validation_prompt = `Una respuesta útil y relevante a la pregunta "${step.content}". Si la respuesta es incoherente, irrelevante, o claramente no responde lo que se pregunta, reformula la pregunta de forma amable.`;
                    break;
            }
            break;

        case 'collect_image':
            const maxImagesField = document.getElementById(`step-max-images-${index}`);
            if (maxImagesField) step.max_images = parseInt(maxImagesField.value);

            const waitTimeField = document.getElementById(`step-wait-time-${index}`);
            if (waitTimeField) step.wait_time = parseInt(waitTimeField.value);

            // Obtener acción seleccionada
            const actionRadios = document.getElementsByName(`image-action-${index}`);
            const selectedAction = Array.from(actionRadios).find(r => r.checked)?.value || 'save_only';
            step.image_action = selectedAction;

            // Guardar campos según la acción
            if (selectedAction !== 'save_only') {
                const imagePromptField = document.getElementById(`step-image-prompt-${index}`);
                if (imagePromptField) step.image_prompt = imagePromptField.value;

                if (selectedAction === 'analyze') {
                    const analysisVarField = document.getElementById(`step-analysis-variable-${index}`);
                    if (analysisVarField) step.analysis_variable = analysisVarField.value;
                }
            }
            break;

        case 'wait_for_file':
            const fileTypeField = document.getElementById(`step-file-type-${index}`);
            if (fileTypeField) step.file_type = fileTypeField.value;

            // Obtener acción seleccionada
            const fileActionRadios = document.getElementsByName(`file-action-${index}`);
            const selectedFileAction = Array.from(fileActionRadios).find(r => r.checked)?.value || 'save_only';
            step.file_action = selectedFileAction;

            // Guardar prompt de validación si está en modo validate
            if (selectedFileAction === 'validate') {
                const validationPromptField = document.getElementById(`step-validation-prompt-${index}`);
                if (validationPromptField) step.validation_prompt = validationPromptField.value;
            }
            break;

        case 'generate_image':
            const imageModelField = document.getElementById(`step-image-model-${index}`);
            if (imageModelField) step.image_model = imageModelField.value;

            const sourceVarField = document.getElementById(`step-source-variable-${index}`);
            if (sourceVarField) step.source_variable = sourceVarField.value;

            const genPromptField = document.getElementById(`step-gen-prompt-${index}`);
            if (genPromptField) step.generation_prompt = genPromptField.value;

            const genImageSizeField = document.getElementById(`step-gen-image-size-${index}`);
            if (genImageSizeField) step.image_size = genImageSizeField.value;

            const genOutputFormatField = document.getElementById(`step-gen-output-format-${index}`);
            if (genOutputFormatField) step.output_format = genOutputFormatField.value;

            const genResultVarField = document.getElementById(`step-gen-result-variable-${index}`);
            if (genResultVarField) step.result_variable = genResultVarField.value;

            const genLoadingMessageField = document.getElementById(`step-gen-loading-message-${index}`);
            if (genLoadingMessageField) step.loading_message = genLoadingMessageField.value;

            const genWaitResponseField = document.getElementById(`step-gen-wait-response-${index}`);
            if (genWaitResponseField) step.wait_for_response = genWaitResponseField.checked;

            const genMaxRegenerationsField = document.getElementById(`step-gen-max-regenerations-${index}`);
            if (genMaxRegenerationsField) step.max_regenerations = parseInt(genMaxRegenerationsField.value) || 1;
            break;

        case 'create_quote':
            const productsField = document.getElementById(`step-products-${index}`);
            if (productsField) step.products = productsField.value;

            const sendToCustomerField = document.getElementById(`step-send-to-customer-${index}`);
            if (sendToCustomerField) step.send_to_customer = sendToCustomerField.checked;

            const askFeedbackField = document.getElementById(`step-ask-feedback-${index}`);
            if (askFeedbackField) step.ask_feedback = askFeedbackField.checked;

            const feedbackMessageField = document.getElementById(`step-feedback-message-${index}`);
            if (feedbackMessageField) step.feedback_message = feedbackMessageField.value;
            break;

        case 'send_payment_info':
            const messageTemplateField = document.getElementById(`step-message-template-${index}`);
            if (messageTemplateField) step.message_template = messageTemplateField.value;
            step.ai_mode = false; // Siempre modo exacto para datos de pago
            break;

        case 'create_task':
            const taskTitleField = document.getElementById(`step-task-title-${index}`);
            if (taskTitleField) step.task_title = taskTitleField.value;

            const taskDescField = document.getElementById(`step-task-description-${index}`);
            if (taskDescField) step.description = taskDescField.value;

            const dueOffsetField = document.getElementById(`step-due-offset-${index}`);
            if (dueOffsetField) step.due_date_offset_days = parseInt(dueOffsetField.value);

            const priorityTaskField = document.getElementById(`step-priority-${index}`);
            if (priorityTaskField) step.priority = priorityTaskField.value;
            break;
    }

    document.getElementById('edit-step-modal')?.remove();
    refreshEditorV3();
    window.showToast?.('Paso actualizado', 'success');
};

window.duplicateStepV3 = (index) => {
    // Si hay una simulación activa, resetearla
    if (simulatorState.active) {
        window.resetSimulator();
        window.showToast?.('⚠️ Simulación reiniciada por cambios en el flow', 'warning');
    }
    const step = JSON.parse(JSON.stringify(currentFlow.steps[index]));
    step.id = `step_${Date.now()}`;
    currentFlow.steps.splice(index + 1, 0, step);
    refreshEditorV3();
    window.showToast?.('Paso duplicado', 'success');
};

window.deleteStepV3 = (index) => {
    const step = currentFlow.steps[index];
    const stepType = STEP_TYPES[step.type];

    showConfirmModal({
        title: '¿Eliminar este paso?',
        message: `Estás a punto de eliminar el paso "${stepType?.title || step.type}".\n\nEsta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        confirmClass: 'bg-red-600 hover:bg-red-700',
        icon: 'trash-2',
        iconClass: 'text-red-600',
        onConfirm: () => {
            // Si hay una simulación activa, resetearla
            if (simulatorState.active) {
                window.resetSimulator();
            }
            currentFlow.steps.splice(index, 1);
            refreshEditorV3();
            window.showToast?.('Paso eliminado', 'success');
        }
    });
};

// ==================== REORDENAR STEPS ====================

window.moveStepUpV3 = (index) => {
    if (index === 0) return; // Ya está arriba

    // Si hay una simulación activa, resetearla
    if (simulatorState.active) {
        window.resetSimulator();
        window.showToast?.('⚠️ Simulación reiniciada por cambios en el flow', 'warning');
    }

    const temp = currentFlow.steps[index];
    currentFlow.steps[index] = currentFlow.steps[index - 1];
    currentFlow.steps[index - 1] = temp;

    refreshEditorV3();
    window.showToast?.('Paso movido arriba', 'success');
};

window.moveStepDownV3 = (index) => {
    if (index === currentFlow.steps.length - 1) return; // Ya está abajo

    // Si hay una simulación activa, resetearla
    if (simulatorState.active) {
        window.resetSimulator();
        window.showToast?.('⚠️ Simulación reiniciada por cambios en el flow', 'warning');
    }

    const temp = currentFlow.steps[index];
    currentFlow.steps[index] = currentFlow.steps[index + 1];
    currentFlow.steps[index + 1] = temp;

    refreshEditorV3();
    window.showToast?.('Paso movido abajo', 'success');
};

// ==================== DRAG & DROP ====================

let draggedStepIndexV3 = null;

window.handleDragStartV3 = (e, index) => {
    draggedStepIndexV3 = index;
    e.currentTarget.style.opacity = '0.5';
    e.currentTarget.classList.add('dragging');
};

window.handleDragOverV3 = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
};

window.handleDropV3 = (e, targetIndex) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (draggedStepIndexV3 === null || draggedStepIndexV3 === targetIndex) return;

    // Si hay una simulación activa, resetearla
    if (simulatorState.active) {
        window.resetSimulator();
        window.showToast?.('⚠️ Simulación reiniciada por cambios en el flow', 'warning');
    }

    const [draggedStep] = currentFlow.steps.splice(draggedStepIndexV3, 1);
    currentFlow.steps.splice(targetIndex, 0, draggedStep);

    draggedStepIndexV3 = null;
    refreshEditorV3();
};

window.handleDragEndV3 = (e) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.classList.remove('dragging', 'drag-over');
    draggedStepIndexV3 = null;
};

// ==================== MODAL DE VARIABLES ====================

// Generar botones de variables quick-access
window.generateQuickVariableButtons = (textareaId, currentStepIndex = null) => {
    updateCollectedVariables();

    const quickVars = [];

    // Variables básicas del flow (siempre disponibles)
    quickVars.push(...AVAILABLE_VARIABLES.flow.vars.map(v => ({
        name: v.name,
        description: v.description,
        category: 'flow',
        color: 'purple'
    })));

    // Variables recolectadas de steps anteriores
    if (currentStepIndex !== null) {
        const collectedVars = AVAILABLE_VARIABLES.collected.vars
            .filter(v => {
                // Solo mostrar variables de steps anteriores
                if (!v.sourceStep) return false;

                // Manejar diferentes formatos de sourceStep
                let sourceIndex = -1;
                if (typeof v.sourceStep === 'number') {
                    sourceIndex = v.sourceStep - 1; // Si es número directo
                } else if (typeof v.sourceStep === 'string') {
                    // Si es string como "Paso 1" o "1"
                    const match = v.sourceStep.match(/\d+/);
                    sourceIndex = match ? parseInt(match[0]) - 1 : -1;
                }

                return sourceIndex >= 0 && sourceIndex < currentStepIndex;
            })
            .map(v => ({
                name: v.name,
                description: v.description,
                sourceStep: v.sourceStep,
                category: 'collected',
                color: 'blue'
            }));
        quickVars.push(...collectedVars);
    }

    if (quickVars.length === 0) {
        return '<p class="text-xs text-slate-400 italic">Recolecta variables en steps anteriores para usarlas aquí</p>';
    }

    return `
        <div class="flex flex-wrap gap-1.5">
            ${quickVars.map(v => `
                <button type="button"
                        onclick="window.insertQuickVariable('${textareaId}', '{{${v.name}}}')"
                        class="px-2.5 py-1 bg-${v.color}-100 hover:bg-${v.color}-200 border border-${v.color}-300 text-${v.color}-700 rounded-full text-[11px] font-medium transition-all hover:scale-105 flex items-center gap-1 group"
                        title="${v.description}${v.sourceStep ? ' (Del paso ' + v.sourceStep + ')' : ''}">
                    <i data-lucide="plus-circle" class="w-3 h-3"></i>
                    <code class="font-mono">{{${v.name}}}</code>
                </button>
            `).join('')}
        </div>
    `;
};

window.insertQuickVariable = (textareaId, variable) => {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Insertar variable en la posición del cursor
    textarea.value = text.substring(0, start) + variable + text.substring(end);

    // Mover cursor después de la variable insertada
    const newPosition = start + variable.length;
    textarea.focus();
    textarea.setSelectionRange(newPosition, newPosition);

    window.showToast?.(`Variable ${variable} insertada`, 'success');
};

window.showVariablesGuide = () => {
    updateCollectedVariables();

    const modal = document.createElement('div');
    modal.id = 'variables-guide-modal';
    modal.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4';

    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div class="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <i data-lucide="book-open" class="w-6 h-6 text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900">Guía de Variables</h2>
                            <p class="text-sm text-slate-600">Placeholders disponibles para usar en tus mensajes</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('variables-guide-modal').remove()"
                            class="w-10 h-10 rounded-full hover:bg-white/50 flex items-center justify-center">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div class="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <h3 class="font-bold text-sm text-indigo-900 mb-2 flex items-center gap-2">
                        <i data-lucide="info" class="w-4 h-4"></i>
                        ¿Cómo usar variables?
                    </h3>
                    <p class="text-xs text-indigo-800 leading-relaxed mb-2">
                        Las variables se escriben entre dobles llaves: <code class="bg-white px-2 py-0.5 rounded">{{nombre_variable}}</code>
                    </p>
                    <p class="text-xs text-indigo-700">
                        <strong>Ejemplo:</strong> "Hola {{contact_name}}, tu total es {{total_estimate}}"
                        <br>
                        <strong>Resultado:</strong> "Hola Juan Pérez, tu total es $1,250.00"
                    </p>
                </div>

                ${Object.entries(AVAILABLE_VARIABLES).map(([key, category]) => {
                    if (category.vars.length === 0) return '';

                    return `
                        <div class="mb-6">
                            <div class="flex items-center gap-2 mb-3">
                                <i data-lucide="${category.icon}" class="w-5 h-5 text-${category.color}-600"></i>
                                <h3 class="font-bold text-lg text-slate-900">${category.title}</h3>
                            </div>

                            <div class="space-y-2">
                                ${category.vars.map(v => `
                                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-${category.color}-400 hover:bg-${category.color}-50 transition-all group cursor-pointer"
                                         onclick="window.copyVariable('{{${v.name}}}')">
                                        <div class="flex items-start justify-between mb-1">
                                            <code class="text-sm font-bold text-${category.color}-700 bg-white px-2 py-1 rounded border border-${category.color}-200">
                                                {{${v.name}}}
                                            </code>
                                            <button class="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-${category.color}-600 text-white rounded hover:bg-${category.color}-700 transition-all">
                                                <i data-lucide="copy" class="w-3 h-3 inline"></i> Copiar
                                            </button>
                                        </div>
                                        <p class="text-xs text-slate-600 mb-1">${v.description}</p>
                                        <p class="text-xs text-slate-400">
                                            <strong>Ejemplo:</strong> <span class="italic">${v.example}</span>
                                        </p>
                                        ${v.source ? `
                                            <p class="text-[10px] text-slate-400 mt-1">
                                                📍 Origen: <code>${v.source}</code>
                                            </p>
                                        ` : ''}
                                        ${v.sourceStep ? `
                                            <p class="text-[10px] text-slate-400 mt-1">
                                                📍 Del paso ${v.sourceStep}
                                            </p>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}

                <div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p class="text-xs text-amber-800 flex items-start gap-2">
                        <i data-lucide="alert-triangle" class="w-4 h-4 shrink-0 mt-0.5"></i>
                        <span>
                            <strong>Importante:</strong> Si usas una variable que no existe o no se ha recolectado aún,
                            se mostrará vacía en el mensaje. Asegúrate de usar variables de pasos anteriores.
                        </span>
                    </p>
                </div>
            </div>

            <div class="px-8 py-4 border-t border-slate-200 bg-white">
                <button onclick="document.getElementById('variables-guide-modal').remove()"
                        class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
                    Entendido
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
};

window.copyVariable = (variable) => {
    // Si hay un textarea activo, insertar directamente
    if (window.activeTextareaForInsert) {
        const textarea = document.getElementById(window.activeTextareaForInsert);
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            textarea.value = text.substring(0, start) + variable + text.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + variable.length, start + variable.length);
            window.showToast?.(`Variable insertada: ${variable}`, 'success');
            window.activeTextareaForInsert = null;
            document.getElementById('variables-guide-modal')?.remove();
            return;
        }
    }

    // Si no hay textarea activo, solo copiar
    navigator.clipboard.writeText(variable).then(() => {
        window.showToast?.(`Copiado: ${variable}`, 'success');
    });
};

// ==================== SIMULADOR IA ====================

function renderAiSimulator() {
    return `
        <div class="h-full flex flex-col">
            <div class="mb-4 flex items-center justify-between">
                <h3 class="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <i data-lucide="play-circle" class="w-5 h-5 text-emerald-600"></i>
                    Simulador con IA
                </h3>
                <button onclick="window.startSimulation()" id="start-simulation-btn"
                        class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2">
                    <i data-lucide="play" class="w-4 h-4"></i>
                    Iniciar
                </button>
            </div>

            <div class="flex-1 bg-white rounded-2xl shadow-inner border-2 border-slate-200 overflow-hidden flex gap-2">
                <!-- Chat del Cliente (vista principal) -->
                <div class="flex-1 flex flex-col">
                    <div class="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-3 flex items-center gap-3">
                        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                            E
                        </div>
                        <div class="flex-1">
                            <p class="font-bold text-sm">Chat Cliente</p>
                            <p class="text-xs text-white/80">Vista del Cliente</p>
                        </div>
                        <button onclick="window.resetSimulator()" class="p-2 hover:bg-white/10 rounded-lg transition-all" title="Reiniciar">
                            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-slate-50 to-slate-100 space-y-3 custom-scrollbar" id="simulator-messages">
                        <div class="text-center py-8 text-slate-400 text-sm">
                            <i data-lucide="info" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                            <p class="font-medium">Agrega pasos y click "Iniciar Simulación"</p>
                        </div>
                    </div>
                </div>

                <!-- Panel de Debug (admin/IA) -->
                <div class="w-[340px] flex flex-col border-l-2 border-slate-200 bg-slate-50">
                    <div class="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2.5">
                        <div class="flex items-center gap-2">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                            <div class="flex-1">
                                <p class="font-bold text-xs">Admin/Debug</p>
                                <p class="text-[10px] text-white/80">Solo tú</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar" id="simulator-debug">
                        <div class="text-center py-4 text-slate-400">
                            <i data-lucide="bug" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                            <p class="text-[11px]">Detalles internos</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Input section (separado) -->
            <div class="bg-white rounded-2xl shadow-inner border-2 border-slate-200 overflow-hidden">
                <div class="p-4 bg-white">
                    <!-- Preview de imágenes seleccionadas -->
                    <div id="simulator-image-preview" class="mb-2 hidden">
                        <div class="flex gap-2 flex-wrap p-2 bg-slate-50 rounded-lg border border-slate-200" id="simulator-preview-container">
                        </div>
                    </div>

                    <div class="flex gap-2 mb-2">
                        <input type="text" id="simulator-input" placeholder="Escribe como cliente..."
                               class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none"
                               onkeypress="if(event.key==='Enter') window.sendSimulatorMessage()"
                               disabled>
                        <input type="file" id="simulator-image-input" accept="image/*" multiple class="hidden"
                               onchange="window.handleSimulatorImageSelect(event)">
                        <button onclick="document.getElementById('simulator-image-input').click()" id="simulator-image-btn"
                                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
                                title="Enviar imagen"
                                disabled>
                            <i data-lucide="image" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.sendSimulatorMessage()" id="simulator-send-btn"
                                class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                                disabled>
                            <i data-lucide="send" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.toggleAiSimulator = () => {
    const editorArea = document.getElementById('editor-area');
    const simulatorArea = document.getElementById('simulator-area');
    const paletteSidebar = document.getElementById('palette-sidebar');
    const btnText = document.getElementById('simulator-btn-text');

    // Add smooth fade transition
    const transition = 'opacity 0.25s ease, width 0.3s ease, flex 0.3s ease';
    simulatorArea.style.transition = transition;
    paletteSidebar.style.transition = transition;
    editorArea.style.transition = transition;

    if (simulatorArea.classList.contains('hidden')) {
        // Switch to simulator - 50/50 split
        paletteSidebar.style.opacity = '0';

        setTimeout(() => {
            simulatorArea.classList.remove('hidden');
            paletteSidebar.classList.add('hidden');
            simulatorArea.style.opacity = '0';

            // Ajustar anchos a 50/50
            editorArea.style.flex = '0 0 50%';
            editorArea.style.width = '50%';
            simulatorArea.style.flex = '0 0 50%';
            simulatorArea.style.width = '50%';

            requestAnimationFrame(() => {
                simulatorArea.style.opacity = '1';
                btnText.textContent = 'Editor';
            });
        }, 250);
    } else {
        // Switch to editor/palette - editor full width
        simulatorArea.style.opacity = '0';

        setTimeout(() => {
            simulatorArea.classList.add('hidden');
            paletteSidebar.classList.remove('hidden');
            paletteSidebar.style.opacity = '0';

            // Editor vuelve a usar todo el espacio
            editorArea.style.flex = '1';
            editorArea.style.width = '';
            simulatorArea.style.flex = '';
            simulatorArea.style.width = '';

            requestAnimationFrame(() => {
                paletteSidebar.style.opacity = '1';
                btnText.textContent = 'Simulador IA';
            });
        }, 250);
    }
};

let simulatorState = {
    active: false,
    currentStepIndex: 0,
    collectedData: {}
};

window.startSimulation = async () => {
    if (currentFlow.steps.length === 0) {
        window.showToast?.('Agrega al menos un paso para simular', 'warning');
        return;
    }

    // Cargar datos de pago del perfil del usuario
    let paymentData = {};
    try {
        const { data: { user } } = await window.auth.sb.auth.getUser();
        if (user) {
            const { data: profile } = await window.auth.sb
                .from('profiles')
                .select('payment_info')
                .eq('id', user.id)
                .single();

            if (profile?.payment_info) {
                paymentData = profile.payment_info;
                console.log('[Simulator] Datos de pago cargados:', paymentData);
            } else {
                console.warn('[Simulator] No hay datos de pago configurados en el perfil');
            }
        }
    } catch (error) {
        console.warn('[Simulator] Error cargando datos de pago:', error);
    }

    simulatorState = {
        active: true,
        currentStepIndex: 0,
        collectedData: {
            contact_name: 'Cliente de Prueba',
            contact_phone: '+52 999 123 4567',
            // Agregar datos de pago del perfil
            ...paymentData
        }
    };

    const messagesContainer = document.getElementById('simulator-messages');
    messagesContainer.innerHTML = '';

    const debugContainer = document.getElementById('simulator-debug');
    debugContainer.innerHTML = '';

    document.getElementById('simulator-input').disabled = false;
    document.getElementById('simulator-send-btn').disabled = false;
    document.getElementById('simulator-image-btn').disabled = false;
    document.getElementById('start-simulation-btn').textContent = '⏸️ Detener Simulación';
    document.getElementById('start-simulation-btn').onclick = window.stopSimulation;

    // Ejecutar primer paso
    executeSimulatorStep();
};

window.stopSimulation = () => {
    simulatorState.active = false;
    document.getElementById('simulator-input').disabled = true;
    document.getElementById('simulator-send-btn').disabled = true;
    document.getElementById('simulator-image-btn').disabled = true;
    document.getElementById('start-simulation-btn').textContent = '🎬 Iniciar Simulación';
    document.getElementById('start-simulation-btn').onclick = window.startSimulation;
};

window.resetSimulator = () => {
    window.stopSimulation();
    simulatorSelectedImages = [];
    document.getElementById('simulator-image-preview')?.classList.add('hidden');
    document.getElementById('simulator-preview-container').innerHTML = '';
    document.getElementById('simulator-messages').innerHTML = `
        <div class="text-center py-8 text-slate-400 text-sm">
            <i data-lucide="info" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
            <p class="font-medium">Simulación reiniciada</p>
        </div>
    `;
    document.getElementById('simulator-debug').innerHTML = `
        <div class="text-center py-4 text-slate-400 text-[11px]">
            <i data-lucide="bug" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <p>Aquí verás detalles internos</p>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
};

function executeSimulatorStep() {
    if (!simulatorState.active || simulatorState.currentStepIndex >= currentFlow.steps.length) {
        addSimulatorMessage('bot', '✅ Flow completado!', 'system');
        window.stopSimulation();
        return;
    }

    const step = currentFlow.steps[simulatorState.currentStepIndex];
    const stepType = STEP_TYPES[step.type];

    // Simular procesamiento
    addSimulatorMessage('bot', `🔄 Ejecutando: ${stepType?.title}...`, 'system');

    setTimeout(() => {
        const lastSystemMsg = document.querySelector('#simulator-messages .system-message:last-child');
        if (lastSystemMsg) lastSystemMsg.remove();

        switch (step.type) {
            case 'message':
            case 'question':
            case 'collect_image':
            case 'wait_for_file':
                const content = replacePlaceholders(step.content);

                // Preparar imágenes adjuntas (solo para message)
                let attachedImages = [];
                if (step.type === 'message' && step.attach_images && step.attach_images.type !== 'none') {
                    if (step.attach_images.type === 'upload' && step.attach_images.uploaded_url) {
                        attachedImages = [step.attach_images.uploaded_url];
                    } else if (step.attach_images.type === 'product' && step.attach_images.product_id) {
                        const product = window.getAllProducts().find(p => p.id === step.attach_images.product_id);
                        if (product && product.images && product.images.length > 0) {
                            const indices = step.attach_images.image_indices || [0];
                            attachedImages = indices
                                .map(idx => product.images[idx])
                                .filter(Boolean)
                                .slice(0, 5); // Máximo 5 imágenes

                            if (attachedImages.length === 0) {
                                attachedImages = [product.images[0]]; // Fallback a la primera
                            }
                        }
                    }
                }

                // Solo enviar mensaje si hay contenido (wait_for_file puede ser sin mensaje)
                if (content && content.trim()) {
                    addSimulatorMessage('bot', content, step.ai_mode ? 'ai' : 'exact', attachedImages.length > 0 ? attachedImages : undefined);
                } else if (attachedImages.length > 0) {
                    // Si solo hay imágenes sin texto, enviarlas solas
                    addSimulatorMessage('bot', '', step.ai_mode ? 'ai' : 'exact', attachedImages);
                }

                if (step.type === 'wait_for_file') {
                    // Nota para el admin
                    addSimulatorMessage('bot', '💬 En modo espera de archivo. El cliente puede seguir escribiendo y la IA responderá.', 'admin');
                }

                if (step.type === 'question' || step.type === 'collect_image' || step.type === 'wait_for_file') {
                    // Esperar respuesta del usuario
                    return;
                }
                break;

            case 'create_quote':
                // Lógica inteligente de búsqueda de productos
                let selectedProduct = null;
                let aiReasoning = '';
                const productsMode = step.products || 'smart_ai';

                if (productsMode === 'recommended' && currentFlow.recommended_products.length > 0) {
                    // Modo fijo: usar el primer producto recomendado
                    selectedProduct = availableProducts.find(p =>
                        currentFlow.recommended_products.includes(p.id)
                    );
                    aiReasoning = `📌 Modo Fijo: Usando producto recomendado "${selectedProduct?.product_name}"`;
                } else if (productsMode === 'auto_detect' || productsMode === 'smart_ai') {
                    // Modo libre o smart: buscar en catálogo completo
                    // Extraer palabras clave de la conversación (trigger + respuestas)
                    const conversationText = [
                        (currentFlow.trigger_keywords || []).join(' '),
                        ...Object.values(simulatorState.collectedData).filter(v => typeof v === 'string')
                    ].join(' ').toLowerCase();

                    // Buscar productos que coincidan con palabras clave
                    const matches = availableProducts.map(product => {
                        const productText = `${product.product_name} ${product.description || ''}`.toLowerCase();
                        const keywords = conversationText.split(/\s+/);
                        let score = 0;

                        // Contar coincidencias de palabras
                        keywords.forEach(keyword => {
                            if (keyword.length > 3 && productText.includes(keyword)) {
                                score += keyword.length; // Palabras más largas = más relevantes
                            }
                        });

                        // Bonus si el nombre del producto está en la conversación
                        if (conversationText.includes(product.product_name.toLowerCase())) {
                            score += 50;
                        }

                        return { product, score };
                    }).filter(m => m.score > 0)
                      .sort((a, b) => b.score - a.score);

                    if (matches.length > 0) {
                        selectedProduct = matches[0].product;
                        aiReasoning = `🧠 IA detectó "${selectedProduct.product_name}" por coincidencia con palabras clave de la conversación (score: ${matches[0].score})`;

                        if (matches.length > 1) {
                            aiReasoning += `\n\nOtras opciones consideradas: ${matches.slice(1, 3).map(m => m.product.product_name).join(', ')}`;
                        }
                    } else if (productsMode === 'smart_ai' && currentFlow.recommended_products.length > 0) {
                        // Fallback a recomendados
                        selectedProduct = availableProducts.find(p =>
                            currentFlow.recommended_products.includes(p.id)
                        );
                        aiReasoning = `🤖 No se detectó producto específico. Usando fallback → producto recomendado "${selectedProduct?.product_name}"`;
                    } else {
                        selectedProduct = availableProducts[0];
                        aiReasoning = `⚠️ No se encontraron coincidencias. Usando primer producto del catálogo "${selectedProduct?.product_name}"`;
                    }
                }

                // Mostrar razonamiento de IA (solo en simulador)
                if (aiReasoning) {
                    addSimulatorMessage('bot', aiReasoning, 'ai-reasoning');
                }

                // Calcular precio con soporte para tiers
                const quantity = parseInt(simulatorState.collectedData.cantidad || 1);
                let unitPrice = parseFloat(selectedProduct?.price || 25);
                let tierInfo = '';

                console.log('[Tier Pricing Debug] Producto:', selectedProduct?.product_name);
                console.log('[Tier Pricing Debug] Cantidad:', quantity);
                console.log('[Tier Pricing Debug] Precio base:', selectedProduct?.price);
                console.log('[Tier Pricing Debug] Pricing tiers:', selectedProduct?.pricing_tiers);

                // Si el producto tiene pricing_tiers, usar el tier correcto
                if (selectedProduct?.pricing_tiers && selectedProduct.pricing_tiers.length > 0) {
                    console.log('[Tier Pricing Debug] Buscando tier para cantidad:', quantity);
                    const tier = selectedProduct.pricing_tiers.find(t =>
                        quantity >= t.min_quantity &&
                        (t.max_quantity === null || quantity <= t.max_quantity)
                    );

                    if (tier) {
                        console.log('[Tier Pricing Debug] Tier encontrado:', tier);
                        unitPrice = parseFloat(tier.price);
                        // Texto más natural en español
                        const rangeText = tier.max_quantity
                            ? `${tier.min_quantity} a ${tier.max_quantity} unidades`
                            : `${tier.min_quantity}+ unidades`;
                        tierInfo = `\n💡 Precio por volumen (${rangeText}): $${tier.price} c/u`;
                    } else {
                        console.log('[Tier Pricing Debug] No se encontró tier para cantidad:', quantity);
                    }
                } else {
                    console.log('[Tier Pricing Debug] El producto NO tiene pricing_tiers configurados');
                }

                const total = (unitPrice * quantity).toFixed(2);

                const quote = `📋 Cotización:\n\nProducto: ${selectedProduct?.product_name || 'Producto'}\nCantidad: ${quantity}\nPrecio unitario: $${unitPrice.toFixed(2)}${tierInfo}\n\nTotal: $${total}`;
                simulatorState.collectedData.total_estimate = `$${total}`;
                addSimulatorMessage('bot', quote, 'exact');

                // Si ask_feedback está activado, preguntar si tiene dudas
                if (step.ask_feedback) {
                    setTimeout(() => {
                        const feedbackMsg = step.feedback_message || '¿Qué te parece? ¿Tienes alguna duda?';
                        addSimulatorMessage('bot', feedbackMsg, 'ai');
                        // Marcar que esperamos respuesta
                        simulatorState.waitingForQuoteFeedback = true;
                    }, 800);
                    return; // No avanzar automáticamente, esperar respuesta
                }
                break;

            case 'send_payment_info':
                const paymentMsg = replacePlaceholders(step.message_template);
                addSimulatorMessage('bot', paymentMsg, step.ai_mode ? 'ai' : 'exact');
                break;

            case 'generate_image':
                // Generar imagen con IA - Llamada real a sistema de generación
                const genPrompt = replacePlaceholders(step.generation_prompt || 'Imagen generada');
                const imageModel = step.image_model || 'flux-2/pro-image-to-image';
                const modelName = imageModel.includes('flux') ? 'IA Rápida' : 'IA Múltiple';

                // LIMPIAR llaves {{ }} del nombre de la variable (por si el usuario las puso)
                let sourceVar = (step.source_variable || 'imagen').replace(/\{\{|\}\}/g, '').trim();
                let resultVar = (step.result_variable || 'imagen_generada').replace(/\{\{|\}\}/g, '').trim();

                console.log(`[generate_image] Buscando imagen en variable: "${sourceVar}"`);
                console.log(`[generate_image] Variables disponibles:`, Object.keys(simulatorState.collectedData));

                let sourceImageUrl = simulatorState.collectedData[sourceVar];
                const waitForResponse = step.wait_for_response || false;

                // Si sourceImageUrl es un array, usar el primer elemento
                if (Array.isArray(sourceImageUrl)) {
                    console.log(`[Simulator] Variable ${sourceVar} es un array, usando primer elemento`);
                    sourceImageUrl = sourceImageUrl[0];
                }

                // Verificar que hay imagen base
                if (!sourceImageUrl && imageModel !== 'flux-2/pro-text-to-image') {
                    // Mostrar TODAS las variables con imágenes disponibles
                    const imageVars = Object.entries(simulatorState.collectedData)
                        .filter(([key, value]) => {
                            if (typeof value === 'string' && value.match(/https?:\/\//)) return true;
                            if (Array.isArray(value) && value.some(v => typeof v === 'string' && v.match(/https?:\/\//))) return true;
                            return false;
                        })
                        .map(([key, value]) => `  - {{${key}}}: ${Array.isArray(value) ? `[${value.length} URLs]` : 'URL'}`);

                    addSimulatorMessage('system', `❌ Error: No hay imagen en la variable {{${sourceVar}}}`, 'system');
                    addSimulatorMessage('admin',
                        `⚠️ El modelo ${imageModel} requiere una imagen base pero la variable {{${sourceVar}}} está vacía.\n\n` +
                        `🔍 Buscando en: {{${sourceVar}}}\n` +
                        `💡 Valor encontrado: ${JSON.stringify(simulatorState.collectedData[sourceVar])}\n\n` +
                        `📦 Variables con imágenes disponibles:\n${imageVars.length > 0 ? imageVars.join('\n') : '  (ninguna)'}`,
                        'admin'
                    );
                    simulatorState.currentStepIndex++;
                    setTimeout(executeSimulatorStep, 500);
                    return;
                }

                // Mostrar debug info
                addSimulatorMessage('system', `🎨 Generando imagen con ${modelName}...\n📝 Prompt: "${genPrompt}"`, 'system');

                if (sourceImageUrl) {
                    addSimulatorMessage('admin', `🖼️ Imagen base:`, 'admin', [sourceImageUrl]);
                }

                // Llamar a KIE para generar la imagen REAL
                (async () => {
                    try {
                        // VERIFICAR Y CONSUMIR CRÉDITOS DE IA ANTES DE GENERAR
                        const { data: { user } } = await window.auth.sb.auth.getUser();
                        const userId = user?.id;

                        if (!userId) {
                            throw new Error('No se pudo obtener el ID del usuario');
                        }

                        // Verificar cuántas veces ya se ha regenerado esta imagen en esta sesión
                        if (!simulatorState.imageRegenerationCount) {
                            simulatorState.imageRegenerationCount = {};
                        }
                        const regenerationKey = `${step.id}_${resultVar}`;
                        const currentRegenerations = simulatorState.imageRegenerationCount[regenerationKey] || 0;
                        const maxRegenerations = step.max_regenerations || 1;

                        if (currentRegenerations >= maxRegenerations) {
                            addSimulatorMessage('system', `⚠️ Límite de regeneraciones alcanzado (${maxRegenerations} máximo)`, 'system');
                            addSimulatorMessage('bot', `Ya has alcanzado el límite de ${maxRegenerations} ${maxRegenerations === 1 ? 'generación' : 'generaciones'} para esta imagen. ¿Quieres continuar con esta versión?`, 'ai');
                            simulatorState.currentStepIndex++;
                            setTimeout(executeSimulatorStep, 500);
                            return;
                        }

                        // Intentar consumir un crédito de IA
                        addSimulatorMessage('admin', `🔄 Verificando créditos de IA...`, 'admin');
                        const { data: usageCheck, error: usageError } = await window.auth.sb.rpc('increment_image_usage', {
                            p_user_id: userId
                        });

                        if (usageError || !usageCheck?.success) {
                            const errorMsg = usageCheck?.message || usageError?.message || 'No tienes créditos disponibles para generar imágenes';
                            addSimulatorMessage('system', `❌ ${errorMsg}`, 'system');
                            addSimulatorMessage('bot', `Lo siento, no pude generar la imagen. ${errorMsg}`, 'ai');
                            simulatorState.currentStepIndex++;
                            setTimeout(executeSimulatorStep, 500);
                            return;
                        }

                        // Incrementar contador de regeneraciones
                        simulatorState.imageRegenerationCount[regenerationKey] = currentRegenerations + 1;
                        addSimulatorMessage('admin', `✅ Crédito consumido (${currentRegenerations + 1}/${maxRegenerations} generaciones para esta imagen)`, 'admin');

                        // Preparar payload según el modelo
                        let payload = {
                            model: imageModel,
                            prompt: genPrompt,
                            aspect_ratio: step.image_size || '1:1',
                            output_format: step.output_format || 'png'
                        };

                        if (imageModel === 'flux-2/pro-image-to-image') {
                            payload.input_urls = [sourceImageUrl];
                            payload.resolution = '1K';
                        } else if (imageModel === 'google/nano-banana-edit') {
                            payload.image_urls = Array.isArray(sourceImageUrl) ? sourceImageUrl : [sourceImageUrl];
                            payload.image_size = step.image_size || '1:1';
                        }

                        addSimulatorMessage('admin', `🔄 Enviando solicitud al sistema de IA...`, 'admin');

                        // Crear tarea en sistema de IA - OBTENER SESSION TOKEN
                        const { data: { session } } = await window.auth.sb.auth.getSession();
                        if (!session) {
                            throw new Error('No hay sesión activa. Por favor inicia sesión.');
                        }

                        // USAR SUPABASE URL DIRECTA (no window.auth.sbUrl que puede ser localhost)
                        const supabaseUrl = window.auth.sb.supabaseUrl; // Esto es la URL real de Supabase
                        console.log('[ImageGen] Enviando payload:', payload);
                        console.log('[ImageGen] Supabase URL:', supabaseUrl);
                        console.log('[ImageGen] Full URL:', `${supabaseUrl}/functions/v1/kie-image-proxy`);

                        const createResponse = await fetch(`${supabaseUrl}/functions/v1/kie-image-proxy`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                            },
                            body: JSON.stringify(payload)
                        });

                        console.log('[ImageGen] Response status:', createResponse.status);
                        console.log('[ImageGen] Response headers:', Object.fromEntries(createResponse.headers.entries()));

                        // Intentar leer como texto primero
                        const responseText = await createResponse.text();
                        console.log('[ImageGen] Response text (primeros 500 chars):', responseText.substring(0, 500));

                        if (!createResponse.ok) {
                            // Intentar parsear como JSON
                            let errorMsg = `Error ${createResponse.status} al crear tarea de generación`;
                            try {
                                const errorData = JSON.parse(responseText);
                                errorMsg = errorData.error || errorMsg;
                            } catch (e) {
                                // Si no es JSON, mostrar el texto HTML/plano
                                if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
                                    errorMsg = `La Edge Function devolvió HTML (probablemente no está desplegada o hay un error 404/500). Status: ${createResponse.status}`;
                                } else {
                                    errorMsg = `${errorMsg}: ${responseText.substring(0, 200)}`;
                                }
                            }
                            throw new Error(errorMsg);
                        }

                        // Parsear respuesta exitosa
                        let createData;
                        try {
                            createData = JSON.parse(responseText);
                        } catch (e) {
                            throw new Error(`La respuesta no es JSON válido: ${responseText.substring(0, 200)}`);
                        }

                        const taskId = createData.data?.taskId;

                        if (!taskId) {
                            throw new Error('No se recibió taskId del sistema de generación');
                        }

                        addSimulatorMessage('admin', `✅ Tarea creada: ${taskId}\n⏳ Esperando generación... <span class="inline-block animate-spin">⚙️</span>`, 'admin');

                        // Mostrar mensaje personalizado al cliente (si está configurado)
                        const loadingMsg = step.loading_message?.trim();
                        if (loadingMsg) {
                            addSimulatorMessage('bot', loadingMsg, step.ai_mode ? 'ai' : 'exact');
                        }

                        // Poll para obtener el resultado
                        let attempts = 0;
                        const maxAttempts = 60; // 60 intentos x 3 segundos = 3 minutos
                        const pollInterval = setInterval(async () => {
                            attempts++;

                            if (attempts > maxAttempts) {
                                clearInterval(pollInterval);
                                addSimulatorMessage('system', `⚠️ Timeout esperando generación de imagen`, 'system');
                                simulatorState.currentStepIndex++;
                                setTimeout(executeSimulatorStep, 500);
                                return;
                            }

                            try {
                                const statusResponse = await fetch(`${supabaseUrl}/functions/v1/kie-image-proxy?taskId=${taskId}`, {
                                    method: 'GET',
                                    headers: {
                                        'Authorization': `Bearer ${session.access_token}`
                                    }
                                });

                                const statusData = await statusResponse.json();
                                const state = statusData.data?.state;

                                if (state === 'success') {
                                    clearInterval(pollInterval);

                                    // Parsear resultJson que viene como JSON string
                                    const resultJson = JSON.parse(statusData.data.resultJson || '{}');
                                    const generatedUrl = resultJson.resultUrls?.[0];

                                    if (!generatedUrl) {
                                        throw new Error('No se recibió URL de imagen generada');
                                    }

                                    // Guardar en variables
                                    simulatorState.collectedData[resultVar] = generatedUrl;

                                    // Guardar en profiles.gallery_images (como en designer-ai)
                                    try {
                                        const { data: profile } = await window.auth.sb
                                            .from('profiles')
                                            .select('gallery_images')
                                            .eq('id', userId)
                                            .single();

                                        const currentGallery = profile?.gallery_images || [];
                                        const updatedGallery = [generatedUrl, ...currentGallery]; // Agregar al inicio

                                        await window.auth.sb
                                            .from('profiles')
                                            .update({ gallery_images: updatedGallery })
                                            .eq('id', userId);

                                        addSimulatorMessage('admin', `💾 Imagen guardada en galería del perfil`, 'admin');
                                    } catch (galleryError) {
                                        console.warn('[ImageGen] No se pudo guardar en galería:', galleryError);
                                    }

                                    // Mostrar la imagen generada AL CLIENTE
                                    if (waitForResponse) {
                                        // Agregar botones de acción para decidir
                                        addSimulatorMessage('bot', `✨ Aquí está tu imagen generada:`, 'ai', [generatedUrl], [
                                            {
                                                label: '✅ Me gusta, continuar',
                                                className: 'bg-emerald-500 hover:bg-emerald-600 text-white',
                                                onClick: 'window.continueAfterImageGeneration()'
                                            },
                                            {
                                                label: '🔄 Regenerar',
                                                className: 'bg-amber-500 hover:bg-amber-600 text-white',
                                                onClick: 'window.regenerateCurrentImage()'
                                            }
                                        ]);

                                        // Guardar información del step actual para regeneración
                                        simulatorState.pendingImageRegeneration = {
                                            stepIndex: simulatorState.currentStepIndex,
                                            step: step,
                                            sourceVar: sourceVar,
                                            resultVar: resultVar,
                                            imageModel: imageModel,
                                            genPrompt: genPrompt,
                                            sourceImageUrl: sourceImageUrl
                                        };

                                        // Info admin
                                        addSimulatorMessage('admin', `✅ Imagen generada exitosamente\n📦 Guardada en {{${resultVar}}}\n🔗 URL: ${generatedUrl}\n⏸️ Esperando decisión del cliente`, 'admin');
                                        return; // NO avanzar, esperar respuesta
                                    } else {
                                        // Sin wait, solo mostrar
                                        addSimulatorMessage('bot', `✨ Aquí está tu imagen generada:`, 'ai', [generatedUrl]);
                                        addSimulatorMessage('admin', `✅ Imagen generada exitosamente\n📦 Guardada en {{${resultVar}}}\n🔗 URL: ${generatedUrl}`, 'admin');
                                    }

                                    // Avanzar automáticamente si no espera respuesta
                                    simulatorState.currentStepIndex++;
                                    setTimeout(executeSimulatorStep, 500);
                                } else if (state === 'fail') {
                                    clearInterval(pollInterval);
                                    const error = statusData.data?.error || 'Error desconocido';
                                    addSimulatorMessage('system', `❌ Error generando imagen: ${error}`, 'system');
                                    simulatorState.currentStepIndex++;
                                    setTimeout(executeSimulatorStep, 500);
                                }
                                // Si está waiting, seguir esperando
                            } catch (pollError) {
                                console.error('[Simulator] Error en polling:', pollError);
                            }
                        }, 3000); // Check cada 3 segundos

                    } catch (error) {
                        console.error('[Simulator] Error generando imagen:', error);
                        addSimulatorMessage('system', `❌ Error: ${error.message}`, 'system');
                        addSimulatorMessage('admin', `⚠️ No se pudo generar la imagen. Usando placeholder.`, 'admin');

                        // Fallback a placeholder si falla
                        const placeholderUrl = sourceImageUrl || `https://placehold.co/512x512/8b5cf6/white?text=${encodeURIComponent(modelName)}`;
                        simulatorState.collectedData[resultVar] = placeholderUrl;
                        addSimulatorMessage('bot', `✨ Aquí está tu imagen:`, 'ai', [placeholderUrl]);

                        if (!waitForResponse) {
                            simulatorState.currentStepIndex++;
                            setTimeout(executeSimulatorStep, 500);
                        }
                    }
                })();

                return; // No avanzar automáticamente, el async handler lo hará

            case 'create_task':
                // Crear tarea
                const taskTitle = replacePlaceholders(step.task_title || 'Nueva tarea');
                const taskDesc = replacePlaceholders(step.description || '');
                const taskPriority = step.priority || 'medium';
                const taskDays = step.due_date_offset_days || 7;

                addSimulatorMessage('system', '📋 Creando tarea...', 'system');
                addSimulatorMessage('bot', `✅ Tarea creada:\n\n📌 ${taskTitle}\n📝 ${taskDesc}\n⏰ Vence en ${taskDays} días\n🔥 Prioridad: ${taskPriority}`, 'admin');
                break;

            case 'trigger_critical':
                // Modo urgente
                const reason = replacePlaceholders(step.reason || 'Atención requerida');
                const autoResponse = replacePlaceholders(step.auto_response_to_customer || 'Un asesor te contactará pronto.');

                addSimulatorMessage('system', '🚨 MODO CRÍTICO ACTIVADO', 'system');
                addSimulatorMessage('bot', `⚠️ Razón: ${reason}\n\n🔔 Admin notificado\n🏷️ Etiqueta agregada: ${step.add_label || 'urgente'}`, 'admin');
                addSimulatorMessage('bot', autoResponse, 'ai');

                // El flow se pausa aquí en producción
                addSimulatorMessage('system', '⏸️ Flow pausado. Esperando intervención manual.', 'system');
                window.stopSimulation();
                return;
        }

        // Avanzar al siguiente paso automáticamente
        simulatorState.currentStepIndex++;
        setTimeout(executeSimulatorStep, 1000);
    }, 500);
}

/**
 * Valida una respuesta con IA y reformula la pregunta si es necesario
 */
window.validateResponseWithAI = async (userResponse, expectedResponseType, originalQuestion) => {
    try {
        console.log('[AI Validation] 🧠 Starting validation...');
        console.log('[AI Validation] User response:', userResponse);
        console.log('[AI Validation] Expected type:', expectedResponseType);
        console.log('[AI Validation] Original question:', originalQuestion);

        // Usar Edge Function proxy segura en lugar de API key hardcodeada
        const supabaseUrl = window.auth?.sb?.supabaseUrl || 'https://mytvwfbijlgbihlegmfg.supabase.co';
        const supabaseKey = window.auth?.sb?.supabaseKey;

        if (!supabaseKey) {
            console.warn('[AI Validation] No Supabase key available');
            return { valid: true, reason: 'Validation disabled (no auth)' };
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/validate-response`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userResponse,
                expectedResponseType,
                originalQuestion
            })
        });

        if (!response.ok) {
            console.warn('[AI Validation] Validation service error:', response.status);
            return { valid: true, reason: 'Validation service unavailable' };
        }

        const validation = await response.json();
        console.log('[AI Validation] ✅ Validation result:', validation);
        return validation;

    } catch (error) {
        console.error('[AI Validation] Error:', error);
        return { valid: true }; // Fallback: aceptar respuesta en caso de error
    }
};

/**
 * Continuar después de que el usuario acepta la imagen generada
 */
window.continueAfterImageGeneration = () => {
    if (!simulatorState.pendingImageRegeneration) {
        console.warn('[Simulator] No hay regeneración pendiente');
        return;
    }

    addSimulatorMessage('user', '✅ Me gusta, continuar', 'exact');
    addSimulatorMessage('admin', '✅ Cliente aceptó la imagen. Continuando flow...', 'admin');

    // Limpiar estado de regeneración pendiente
    delete simulatorState.pendingImageRegeneration;

    // Avanzar al siguiente paso
    simulatorState.currentStepIndex++;
    setTimeout(executeSimulatorStep, 500);
};

/**
 * Regenerar la imagen actual
 */
window.regenerateCurrentImage = () => {
    if (!simulatorState.pendingImageRegeneration) {
        console.warn('[Simulator] No hay regeneración pendiente');
        return;
    }

    const regenerationInfo = simulatorState.pendingImageRegeneration;
    const { step, resultVar } = regenerationInfo;

    addSimulatorMessage('user', '🔄 Quiero regenerar', 'exact');
    addSimulatorMessage('admin', '🔄 Regenerando imagen...', 'admin');

    // NO incrementar currentStepIndex, mantener en el mismo step
    // NO limpiar pendingImageRegeneration aún, se limpiará después de regenerar

    // Ejecutar el step nuevamente (esto manejará el contador de regeneraciones)
    setTimeout(executeSimulatorStep, 500);
};

window.sendSimulatorMessage = () => {
    const input = document.getElementById('simulator-input');
    const message = input.value.trim();
    const step = currentFlow.steps[simulatorState.currentStepIndex];

    // Si hay imágenes seleccionadas o es un step de collect_image o wait_for_file
    if (simulatorSelectedImages.length > 0 && (step.type === 'collect_image' || step.type === 'wait_for_file')) {
        // Enviar imágenes - MOSTRARLAS REALMENTE
        console.log('[Simulator] Enviando imágenes:', simulatorSelectedImages);
        addSimulatorMessage('user', '', 'exact', simulatorSelectedImages);

        // Guardar URLs en variable
        if (step.variable) {
            // LIMPIAR llaves {{ }} del nombre de la variable
            const varName = step.variable.replace(/\{\{|\}\}/g, '').trim();

            const maxImages = step.max_images || 1;
            console.log(`[Simulator] Step type: ${step.type}`);
            console.log(`[Simulator] Variable (limpia): "${varName}"`);
            console.log(`[Simulator] Step.max_images configurado:`, step.max_images);
            console.log(`[Simulator] maxImages a usar:`, maxImages);
            console.log(`[Simulator] simulatorSelectedImages:`, simulatorSelectedImages);

            // Si max_images es 1, guardar como string; si es más, guardar como array
            if (maxImages === 1) {
                simulatorState.collectedData[varName] = simulatorSelectedImages[0];
                console.log(`[Simulator] Guardando como STRING (maxImages=1)`);
            } else {
                simulatorState.collectedData[varName] = simulatorSelectedImages;
                console.log(`[Simulator] Guardando como ARRAY (maxImages=${maxImages})`);
            }
            console.log(`[Simulator] Guardado en ${varName}:`, simulatorState.collectedData[varName]);
        }

        // Mensaje admin-only indicando donde se guardó
        addSimulatorMessage('bot', `✅ ${simulatorSelectedImages.length} imagen(es) guardada(s) en {{${step.variable}}}`, 'admin');

        // Simular procesamiento según la acción
        const imageAction = step.image_action || 'save_only';

        setTimeout(async () => {
            if (imageAction === 'analyze') {
                // ANÁLISIS REAL con IA de visión
                const realPrompt = step.image_prompt || 'Describe la imagen en detalle, identifica colores, elementos principales...';
                addSimulatorMessage('system', '🤖 Analizando imagen con IA de visión...', 'system');
                addSimulatorMessage('bot', `📋 Prompt: "${realPrompt}"`, 'ai-reasoning');

                try {
                    // Llamar a la Edge Function de análisis
                    const { data: { session } } = await window.auth.sb.auth.getSession();
                    const response = await fetch(
                        `${window.auth.sb.supabaseUrl}/functions/v1/vision-analyze`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                imageUrl: simulatorSelectedImages[0],
                                prompt: realPrompt
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`Error ${response.status}: ${await response.text()}`);
                    }

                    const result = await response.json();
                    const analysis = result.analysis;

                    // LIMPIAR llaves {{ }} del nombre de la variable
                    const analysisVar = (step.analysis_variable || 'analisis_imagen').replace(/\{\{|\}\}/g, '').trim();
                    simulatorState.collectedData[analysisVar] = analysis;

                    console.log(`[Simulator] Análisis guardado en "${analysisVar}":`, analysis.substring(0, 100) + '...');

                    // Mostrar análisis REAL (SOLO en panel admin, NO al cliente)
                    addSimulatorMessage('admin', `✅ Análisis de IA:\n\n${analysis}\n\n📦 Guardado en {{${analysisVar}}}`, 'admin');

                } catch (error) {
                    console.error('[Simulator] Error analyzing image:', error);
                    addSimulatorMessage('bot', `❌ Error al analizar imagen: ${error.message}\n\n⚠️ Asegúrate de haber desplegado la Edge Function "vision-analyze"`, 'admin');
                }

                // Avanzar
                simulatorSelectedImages = [];
                document.getElementById('simulator-image-preview').classList.add('hidden');
                document.getElementById('simulator-preview-container').innerHTML = '';
                simulatorState.currentStepIndex++;
                setTimeout(executeSimulatorStep, 800);
            } else if (imageAction === 'recreate_flux' || imageAction === 'recreate_nano') {
                // Simular generación de imagen
                addSimulatorMessage('system', `🎨 Generando imagen con ${imageAction === 'recreate_flux' ? 'IA Rápida' : 'IA Múltiple'}...`, 'system');

                setTimeout(() => {
                    const generatedUrl = 'https://cdn.example.com/generated-image.jpg';
                    const generatedVar = step.generated_variable || 'imagen_generada';
                    simulatorState.collectedData[generatedVar] = generatedUrl;

                    addSimulatorMessage('bot', `✨ Imagen generada exitosamente`, 'ai');
                    addSimulatorMessage('bot', `✅ URL guardada en {{${generatedVar}}}`, 'admin');

                    // Avanzar
                    simulatorSelectedImages = [];
                    document.getElementById('simulator-image-preview').classList.add('hidden');
                    document.getElementById('simulator-preview-container').innerHTML = '';
                    simulatorState.currentStepIndex++;
                    setTimeout(executeSimulatorStep, 800);
                }, 2000);
            } else {
                // Solo guardar - ya mostramos el mensaje admin arriba, no necesitamos otro aquí
                // Avanzar
                simulatorSelectedImages = [];
                document.getElementById('simulator-image-preview').classList.add('hidden');
                document.getElementById('simulator-preview-container').innerHTML = '';
                simulatorState.currentStepIndex++;
                setTimeout(executeSimulatorStep, 800);
            }
        }, 300);

        return;
    }

    // Mensaje de texto normal
    if (!message) return;

    addSimulatorMessage('user', message);
    input.value = '';

    // Si estamos esperando feedback de cotización
    if (simulatorState.waitingForQuoteFeedback) {
        simulatorState.collectedData.respuesta_cotizacion = message;
        addSimulatorMessage('bot', `✅ Respuesta guardada en {{respuesta_cotizacion}}`, 'admin');

        // Detectar si es una pregunta (contiene ?, cómo, qué, cuándo, dónde, por qué)
        const isQuestion = message.includes('?') ||
                          /\b(cómo|como|qué|que|cuándo|cuando|dónde|donde|por qué|porque)\b/i.test(message);

        if (isQuestion) {
            // Simular que elina-v5 responde la duda
            addSimulatorMessage('bot', `🧠 IA detectó pregunta. Respondiendo con conocimiento de elina-v5...`, 'ai-reasoning');

            setTimeout(() => {
                const aiResponse = `Claro, te explico: [Aquí elina-v5 respondería usando su conocimiento completo y RAG]. Una vez aclarado, ¿deseas continuar con el pago?`;
                addSimulatorMessage('bot', aiResponse, 'ai');

                // Seguir esperando respuesta hasta que sea afirmativa
                return;
            }, 1000);
            return;
        }

        // Si no es pregunta, continuar con el flow
        simulatorState.waitingForQuoteFeedback = false;
        simulatorState.currentStepIndex++;
        setTimeout(executeSimulatorStep, 800);
        return;
    }

    // Guardar respuesta normal
    if (step.variable) {
        // LIMPIAR llaves {{ }} del nombre de la variable
        const varName = step.variable.replace(/\{\{|\}\}/g, '').trim();

        // Auto-generar validation_prompt si no existe (para steps antiguos)
        if (!step.validation_prompt || step.validation_prompt.trim() === '') {
            const validationType = step.validation_type || 'text';
            switch (validationType) {
                case 'number':
                    step.validation_prompt = 'Un número válido. Si la respuesta no es un número, reformula la pregunta explicando que necesitas un número.';
                    break;
                case 'email':
                    step.validation_prompt = 'Un email válido con formato correcto (usuario@dominio.com). Si no es un email válido, reformula la pregunta explicando el formato correcto.';
                    break;
                case 'phone':
                    step.validation_prompt = 'Un número de teléfono válido con 10 dígitos (puede incluir lada). Si no es un teléfono válido, reformula la pregunta explicando el formato esperado.';
                    break;
                case 'text':
                default:
                    step.validation_prompt = `Una respuesta útil y relevante a la pregunta "${step.content}". Si la respuesta es incoherente, irrelevante, o claramente no responde lo que se pregunta, reformula la pregunta de forma amable.`;
                    break;
            }
        }

        console.log('[Simulator] Step validation type:', step.validation_type);
        console.log('[Simulator] Step validation prompt:', step.validation_prompt);
        console.log('[Simulator] User message:', message);

        // SIEMPRE validar con IA
        if (step.validation_prompt && step.validation_prompt.trim() !== '') {
            addSimulatorMessage('system', '🧠 Validando respuesta con IA...', 'system');

            (async () => {
                try {
                    const isValid = await window.validateResponseWithAI(
                        message,
                        step.validation_prompt,
                        step.content
                    );

                    // PRIORIDAD 1: Detectar pregunta fuera de contexto
                    if (isValid.isOutOfContext) {
                        addSimulatorMessage('system', `⏸️ #PAUSA - Pregunta fuera de contexto detectada`, 'system');
                        addSimulatorMessage('system', `🤖 El agente IA (Elina-v5) respondería esta consulta en producción`, 'system');
                        addSimulatorMessage('system', `🔄 Flow permanece pausado esperando respuesta original`, 'system');
                        // NO avanzar ni guardar, mantener flow pausado
                        return;
                    }

                    // PRIORIDAD 2: Validar respuesta
                    if (isValid.valid) {
                        // Respuesta válida, guardar y avanzar
                        simulatorState.collectedData[varName] = message;
                        addSimulatorMessage('admin', `✅ Respuesta válida guardada en {{${varName}}}`, 'admin');
                        simulatorState.currentStepIndex++;
                        setTimeout(executeSimulatorStep, 800);
                    } else {
                        // Respuesta inválida, reformular pregunta
                        addSimulatorMessage('admin', `❌ Respuesta no válida: ${isValid.reason}`, 'admin');
                        addSimulatorMessage('bot', isValid.reformulatedQuestion, 'ai');
                        addSimulatorMessage('admin', `🔄 Pregunta reformulada por IA. Esperando nueva respuesta...`, 'admin');
                        // NO avanzar, esperar nueva respuesta
                    }
                } catch (error) {
                    console.error('[Simulator] Error en validación IA:', error);
                    // En caso de error, guardar de todos modos
                    simulatorState.collectedData[varName] = message;
                    addSimulatorMessage('admin', `⚠️ Error en validación IA, guardando respuesta de todos modos`, 'admin');
                    simulatorState.currentStepIndex++;
                    setTimeout(executeSimulatorStep, 800);
                }
            })();
            return; // Esperar resultado async
        }

        // Sin validación IA, guardar normalmente
        simulatorState.collectedData[varName] = message;
        console.log(`[Simulator] Respuesta guardada en "${varName}":`, message);
    }

    // Avanzar
    simulatorState.currentStepIndex++;
    setTimeout(executeSimulatorStep, 800);
};

function addSimulatorMessage(from, text, mode = 'exact', images = [], actions = []) {
    // Los mensajes admin y ai-reasoning van al panel de debug
    if (mode === 'admin' || mode === 'ai-reasoning' || mode === 'system') {
        addDebugMessage(text, mode, images);
        return;
    }

    // Los demás mensajes van al chat del cliente
    const messagesContainer = document.getElementById('simulator-messages');

    const msgClass = from === 'bot' ? 'justify-start' : 'justify-end';
    const bgClass = from === 'bot' ? 'bg-white border border-slate-200' : 'bg-emerald-600 text-white';
    const modeIndicator = mode === 'ai' ? '🤖 IA' : '';

    // Debug de imágenes
    if (images.length > 0) {
        console.log('[addSimulatorMessage] Renderizando imágenes:', images);
    }

    // Generar HTML de imágenes si existen
    const imagesHtml = images.length > 0 ? `
        <div class="grid ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 ${text ? 'mt-2' : ''}">
            ${images.map(imgUrl => `
                <img src="${imgUrl}" alt="Imagen enviada" class="rounded-lg max-w-full h-auto border border-slate-200 max-h-48 object-contain" />
            `).join('')}
        </div>
    ` : '';

    // Generar HTML de botones de acción si existen
    const actionsHtml = actions.length > 0 ? `
        <div class="flex gap-2 mt-3">
            ${actions.map(action => `
                <button onclick="${action.onClick}"
                        class="px-3 py-1.5 ${action.className || 'bg-emerald-500 hover:bg-emerald-600 text-white'} rounded-lg text-xs font-medium transition-all">
                    ${action.label}
                </button>
            `).join('')}
        </div>
    ` : '';

    const msg = `
        <div class="flex items-end gap-2 ${msgClass} animate-in slide-in-from-bottom">
            ${from === 'bot' ? `
                <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold">
                    E
                </div>
            ` : ''}
            <div class="${bgClass} p-3 rounded-2xl ${from === 'bot' ? 'rounded-bl-none' : 'rounded-br-none'} shadow-sm max-w-[75%]">
                ${modeIndicator ? `<span class="text-[10px] opacity-70 font-medium">${modeIndicator}</span><br>` : ''}
                ${text ? `<p class="text-sm whitespace-pre-wrap">${text}</p>` : ''}
                ${imagesHtml}
                ${actionsHtml}
            </div>
            ${from === 'user' ? `
                <div class="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold">
                    U
                </div>
            ` : ''}
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    if (window.lucide) lucide.createIcons();
}

function addDebugMessage(text, mode = 'system', images = []) {
    const debugContainer = document.getElementById('simulator-debug');
    if (!debugContainer) return;

    const modeConfig = {
        'admin': { icon: 'eye', color: 'amber', label: 'Admin', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900' },
        'ai-reasoning': { icon: 'brain', color: 'cyan', label: 'IA', bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-900' },
        'system': { icon: 'cog', color: 'slate', label: 'System', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' }
    };

    const config = modeConfig[mode] || modeConfig['system'];

    // Generar HTML de imágenes si existen
    const imagesHtml = images.length > 0 ? `
        <div class="grid ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1 mt-1">
            ${images.map(imgUrl => `
                <img src="${imgUrl}" alt="Debug image" class="rounded-md max-w-full h-auto border ${config.border} max-h-24 object-contain" />
            `).join('')}
        </div>
    ` : '';

    const msg = `
        <div class="p-2 ${config.bg} border ${config.border} rounded-lg animate-in slide-in-from-right">
            <div class="flex items-center gap-1 mb-1">
                <i data-lucide="${config.icon}" class="w-3 h-3 ${config.text}"></i>
                <span class="text-[10px] font-bold ${config.text} uppercase">${config.label}</span>
                <span class="ml-auto text-[9px] opacity-60">${new Date().toLocaleTimeString()}</span>
            </div>
            ${text ? `<p class="text-[11px] ${config.text} whitespace-pre-wrap leading-snug">${text}</p>` : ''}
            ${imagesHtml}
        </div>
    `;

    debugContainer.insertAdjacentHTML('beforeend', msg);
    debugContainer.scrollTop = debugContainer.scrollHeight;

    if (window.lucide) lucide.createIcons();
}

function replacePlaceholders(text) {
    if (!text) return text;

    let result = text;
    Object.entries(simulatorState.collectedData).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Payment info simulado
    result = result.replace(/{{bank_name}}/g, 'BBVA México');
    result = result.replace(/{{bank_account}}/g, '0123456789');
    result = result.replace(/{{account_holder}}/g, 'Ismael Nabte');

    return result;
}

// ==================== SIMULADOR - MANEJO DE IMÁGENES ====================

let simulatorSelectedImages = [];

window.handleSimulatorImageSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const previewContainer = document.getElementById('simulator-preview-container');
    const previewArea = document.getElementById('simulator-image-preview');

    addSimulatorMessage('system', `📤 Comprimiendo ${files.length} imagen(es)...`, 'system');

    for (const file of files) {
        try {
            // Comprimir imagen
            const compressedBlob = await compressImage(file, 800, 0.7);

            // Subir a BunnyNet en carpeta /test
            const cdnUrl = await uploadImageToBunny(compressedBlob, file.name);

            simulatorSelectedImages.push(cdnUrl);

            // Mostrar preview
            const preview = document.createElement('div');
            preview.className = 'relative group';
            preview.innerHTML = `
                <img src="${cdnUrl}" class="w-16 h-16 object-cover rounded-lg border-2 border-blue-300">
                <button onclick="window.removeSimulatorImage('${cdnUrl}')"
                        class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-all">
                    ×
                </button>
            `;
            previewContainer.appendChild(preview);
        } catch (error) {
            console.error('Error procesando imagen:', error);
            addSimulatorMessage('system', `❌ Error subiendo imagen: ${error.message}`, 'system');
        }
    }

    previewArea.classList.remove('hidden');
    addSimulatorMessage('system', `✅ ${files.length} imagen(es) lista(s) para enviar`, 'system');

    // Reset file input
    event.target.value = '';
};

window.removeSimulatorImage = (url) => {
    simulatorSelectedImages = simulatorSelectedImages.filter(img => img !== url);

    const previewArea = document.getElementById('simulator-image-preview');
    const previewContainer = document.getElementById('simulator-preview-container');

    // Buscar y eliminar el preview
    Array.from(previewContainer.children).forEach(child => {
        if (child.innerHTML.includes(url)) {
            child.remove();
        }
    });

    if (simulatorSelectedImages.length === 0) {
        previewArea.classList.add('hidden');
    }
};

async function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calcular nuevo tamaño manteniendo aspect ratio
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Error al comprimir imagen'));
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = () => reject(new Error('Error al cargar imagen'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsDataURL(file);
    });
}

async function uploadImageToBunny(blob, originalFileName) {
    try {
        const fileName = `simulator-${Date.now()}-${originalFileName}`;
        console.log('[uploadImageToBunny] Subiendo archivo:', fileName);

        // Obtener sesión para el token de autenticación
        const { data: { session } } = await window.auth.sb.auth.getSession();
        if (!session) {
            throw new Error('No hay sesión activa');
        }

        const user = session.user;
        if (!user?.id) {
            throw new Error('No se pudo obtener información del usuario. Asegúrate de estar autenticado.');
        }

        // Obtener URL de la función desde el cliente de Supabase
        const supabaseUrl = window.auth.sb.supabaseUrl;
        const functionUrl = `${supabaseUrl}/functions/v1/bunny-upload`;

        // Convertir blob a ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();
        console.log('[uploadImageToBunny] ArrayBuffer generado, tamaño:', arrayBuffer.byteLength);

        // Hacer POST con el archivo como body y metadata como headers
        console.log('[uploadImageToBunny] Llamando a bunny-upload...');
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': blob.type || 'image/jpeg',
                'X-File-Name': encodeURIComponent(fileName),
                'X-Folder': 'test',
                'X-User-Id': user.id,
                'X-User-Email': user.email || user.id
            },
            body: arrayBuffer
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[uploadImageToBunny] Error de Edge Function:', errorText);
            throw new Error(`Error al subir imagen: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('[uploadImageToBunny] Imagen subida exitosamente:', result.cdnUrl);
        return result.cdnUrl;
    } catch (err) {
        console.error('[uploadImageToBunny] Error completo:', err);
        throw err;
    }
}

// ==================== MODAL DE CONFIRMACIÓN ====================

function showConfirmModal({
    title = '¿Estás seguro?',
    message = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    confirmClass = 'bg-blue-600 hover:bg-blue-700',
    icon = 'alert-circle',
    iconClass = 'text-blue-600',
    onConfirm = () => {},
    onCancel = () => {}
}) {
    // Eliminar modal anterior si existe
    document.getElementById('confirm-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4';
    modal.innerHTML = `
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <!-- Header con icono -->
            <div class="p-6 pb-4 text-center">
                <div class="mx-auto w-16 h-16 ${iconClass} bg-current/10 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="${icon}" class="w-8 h-8"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">${title}</h3>
                ${message ? `<p class="text-sm text-slate-600 whitespace-pre-line">${message}</p>` : ''}
            </div>

            <!-- Botones -->
            <div class="px-6 pb-6 flex gap-3">
                <button id="confirm-modal-cancel"
                        class="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">
                    ${cancelText}
                </button>
                <button id="confirm-modal-confirm"
                        class="flex-1 px-4 py-3 ${confirmClass} text-white rounded-xl font-bold transition-all shadow-sm">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Renderizar iconos de Lucide
    if (window.lucide) lucide.createIcons();

    // Event listeners
    const confirmBtn = document.getElementById('confirm-modal-confirm');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    const closeModal = () => {
        modal.classList.add('animate-out', 'fade-out', 'zoom-out-95', 'duration-200');
        setTimeout(() => modal.remove(), 200);
    };

    confirmBtn.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
        closeModal();
        onCancel();
    });

    // Cerrar con Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            onCancel();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Cerrar con click en backdrop
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('backdrop-blur-sm')) {
            closeModal();
            onCancel();
        }
    });
}

// ==================== GUARDAR FLOW ====================

window.saveFlowV3 = async (activate = false) => {
    if (currentFlow.triggerKeywords.length === 0) {
        window.showToast?.('Agrega al menos una palabra clave', 'error');
        return;
    }

    if (currentFlow.steps.length === 0) {
        window.showToast?.('Agrega al menos un paso', 'error');
        return;
    }

    const flowData = {
        id: currentFlow.id || `flow_${Date.now()}`,
        mode: currentFlow.mode || 'step_by_step',
        trigger_keywords: currentFlow.triggerKeywords,
        recommended_products: currentFlow.recommended_products,
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
            response_text: `Flow V3: ${currentFlow.triggerKeywords[0]}`,
            is_active: activate,
            is_flow: true,
            flow_data: flowData
        };

        if (currentFlow.id) {
            const { error } = await window.auth.sb
                .from('auto_responses')
                .update(payload)
                .eq('id', currentFlow.id);

            if (error) throw error;
        } else {
            const { error } = await window.auth.sb
                .from('auto_responses')
                .insert(payload);

            if (error) throw error;
        }

        window.showToast?.(`Flow ${activate ? 'activado' : 'guardado'} exitosamente ✨`, 'success');
        document.getElementById('flow-editor-v3-modal')?.remove();
        initFlowBuilder(currentFlowContainerId);
    } catch (error) {
        console.error('[Flow Builder V3] Error saving flow:', error);
        window.showToast?.('Error al guardar el flow', 'error');
    }
};

window.duplicateFlowV3 = async (flowId) => {
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
        console.error('[Flow Builder V3] Error duplicating flow:', error);
        window.showToast?.('Error al duplicar el flow', 'error');
    }
};

window.deleteFlowV3 = async (flowId) => {
    showConfirmModal({
        title: '⚠️ Eliminar Flow Permanentemente',
        message: 'Esta acción eliminará el flow y todas sus configuraciones.\n\nLos datos recolectados de conversaciones previas se mantendrán, pero el flow ya no estará disponible.\n\n¿Estás seguro de continuar?',
        confirmText: 'Sí, Eliminar',
        confirmClass: 'bg-red-600 hover:bg-red-700',
        cancelText: 'Cancelar',
        icon: 'alert-triangle',
        iconClass: 'text-red-600',
        onConfirm: async () => {
            try {
                const { error } = await window.auth.sb
                    .from('auto_responses')
                    .delete()
                    .eq('id', flowId);

                if (error) throw error;

                window.showToast?.('Flow eliminado', 'success');
                initFlowBuilder(currentFlowContainerId);
            } catch (error) {
                console.error('[Flow Builder V3] Error deleting flow:', error);
                window.showToast?.('Error al eliminar el flow', 'error');
            }
        }
    });
};

// ==================== TOGGLE ACTIVO/PAUSADO ====================

window.toggleFlowActiveV3 = async (flowId, newActiveState) => {
    try {
        const { error } = await window.auth.sb
            .from('auto_responses')
            .update({ is_active: newActiveState })
            .eq('id', flowId);

        if (error) throw error;

        window.showToast?.(
            newActiveState ? 'Flow activado ✅' : 'Flow pausado ⏸️',
            'success'
        );

        // Refresh list
        initFlowBuilder(currentFlowContainerId);
    } catch (error) {
        console.error('[Flow Builder V3] Error toggling flow:', error);
        window.showToast?.('Error al cambiar estado del flow', 'error');
    }
};

// ==================== VER PASOS DEL FLOW ====================

window.viewFlowStepsV3 = async (flowId) => {
    try {
        const { data, error } = await window.auth.sb
            .from('auto_responses')
            .select('*')
            .eq('id', flowId)
            .single();

        if (error) throw error;

        const flowData = typeof data.flow_data === 'string' ? JSON.parse(data.flow_data) : data.flow_data;
        const steps = flowData?.steps || [];
        const mode = flowData?.mode || 'step_by_step';

        const modal = document.createElement('div');
        modal.id = 'view-steps-modal';
        modal.className = 'fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4';

        const modeLabel = mode === 'get_all' ? 'Get All (IA)' : 'Paso a Paso';
        const modeIcon = mode === 'get_all' ? 'sparkles' : 'list-checks';
        const modeColor = mode === 'get_all' ? 'purple' : 'indigo';

        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <div class="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-${modeColor}-50 to-${modeColor}-100">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-${modeColor}-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <i data-lucide="${modeIcon}" class="w-6 h-6 text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-slate-900">${data.trigger_text}</h2>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="px-2 py-0.5 bg-white border-2 border-${modeColor}-300 rounded text-xs font-bold text-${modeColor}-700">${modeLabel}</span>
                                    <span class="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700">${steps.length} paso${steps.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </div>
                        <button onclick="document.getElementById('view-steps-modal').remove()"
                                class="w-10 h-10 rounded-full hover:bg-white/50 flex items-center justify-center">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    ${steps.length === 0 ? `
                        <div class="text-center py-12">
                            <i data-lucide="inbox" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
                            <p class="text-slate-500">Este flow no tiene pasos configurados</p>
                        </div>
                    ` : `
                        <div class="space-y-4">
                            ${steps.map((step, idx) => {
                                const stepType = STEP_TYPES[step.type] || STEP_TYPES.message;
                                return `
                                    <div class="border-2 border-${stepType.color}-200 rounded-xl p-4 bg-gradient-to-br from-white to-${stepType.color}-50">
                                        <div class="flex items-start gap-3">
                                            <div class="w-10 h-10 rounded-full bg-${stepType.color}-100 text-${stepType.color}-700 flex items-center justify-center font-bold shrink-0">
                                                ${idx + 1}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2 mb-2">
                                                    <i data-lucide="${stepType.icon}" class="w-4 h-4 text-${stepType.color}-600"></i>
                                                    <h4 class="font-bold text-sm text-${stepType.color}-900">${stepType.title}</h4>
                                                    ${step.ai_mode ? '<span class="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">🤖 IA</span>' : ''}
                                                </div>
                                                <p class="text-sm text-slate-700 leading-relaxed">${step.content || step.message_template || '<em class="text-slate-400">Sin contenido</em>'}</p>
                                                ${step.variable ? `
                                                    <p class="mt-2 text-xs text-slate-500">
                                                        Guarda en: <code class="bg-slate-200 px-1.5 py-0.5 rounded font-mono">{{${step.variable}}}</code>
                                                    </p>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div class="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                    <button onclick="document.getElementById('view-steps-modal').remove()"
                            class="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                        Cerrar
                    </button>
                    <button onclick="document.getElementById('view-steps-modal').remove(); window.openFlowEditorV3('${flowId}')"
                            class="px-8 py-2.5 bg-gradient-to-r from-${modeColor}-600 to-${modeColor}-700 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                        Editar Flow
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    } catch (error) {
        console.error('[Flow Builder V3] Error viewing steps:', error);
        window.showToast?.('Error al cargar los pasos', 'error');
    }
};

window.editRecommendedProducts = () => {
    window.showToast?.('Editor de productos recomendados en desarrollo', 'info');
};

// Mostrar/ocultar selector de productos según el modo
window.toggleProductSelector = (stepIndex) => {
    const modeSelect = document.getElementById(`step-products-${stepIndex}`);
    const productSelector = document.getElementById(`product-selector-${stepIndex}`);

    if (!modeSelect || !productSelector) return;

    const mode = modeSelect.value;
    const shouldShow = mode === 'recommended' || mode === 'smart_ai';

    // Smooth transition
    productSelector.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';

    if (shouldShow) {
        if (productSelector.classList.contains('hidden')) {
            productSelector.classList.remove('hidden');
            productSelector.style.opacity = '0';
            productSelector.style.maxHeight = '0';
            productSelector.style.overflow = 'hidden';

            requestAnimationFrame(() => {
                productSelector.style.maxHeight = '800px';
                productSelector.style.opacity = '1';

                setTimeout(() => {
                    productSelector.style.overflow = 'visible';
                    productSelector.style.maxHeight = '';
                }, 300);
            });
        }
    } else {
        productSelector.style.opacity = '0';
        productSelector.style.maxHeight = '0';
        productSelector.style.overflow = 'hidden';

        setTimeout(() => {
            productSelector.classList.add('hidden');
            productSelector.style.maxHeight = '';
        }, 300);
    }
};

window.toggleQuoteFeedback = (stepIndex) => {
    const checkbox = document.getElementById(`step-ask-feedback-${stepIndex}`);
    const feedbackOptions = document.getElementById(`feedback-options-${stepIndex}`);

    if (!checkbox || !feedbackOptions) return;

    // Smooth transition
    feedbackOptions.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';

    if (checkbox.checked) {
        if (feedbackOptions.classList.contains('hidden')) {
            feedbackOptions.classList.remove('hidden');
            feedbackOptions.style.opacity = '0';
            feedbackOptions.style.maxHeight = '0';
            feedbackOptions.style.overflow = 'hidden';

            requestAnimationFrame(() => {
                feedbackOptions.style.maxHeight = '300px';
                feedbackOptions.style.opacity = '1';

                setTimeout(() => {
                    feedbackOptions.style.overflow = 'visible';
                    feedbackOptions.style.maxHeight = '';
                }, 300);
            });
        }
    } else {
        feedbackOptions.style.opacity = '0';
        feedbackOptions.style.maxHeight = '0';
        feedbackOptions.style.overflow = 'hidden';

        setTimeout(() => {
            feedbackOptions.classList.add('hidden');
            feedbackOptions.style.maxHeight = '';
        }, 300);
    }
};

window.updateFileActionUI = (stepIndex, action) => {
    const fieldsContainer = document.getElementById(`file-action-fields-${stepIndex}`);
    if (!fieldsContainer) return;

    // Smooth transition using opacity and max-height
    fieldsContainer.style.transition = 'opacity 0.3s ease, max-height 0.3s ease, margin-top 0.3s ease';

    if (action === 'validate') {
        // Fade in and expand
        if (fieldsContainer.classList.contains('hidden')) {
            fieldsContainer.classList.remove('hidden');
            fieldsContainer.style.opacity = '0';
            fieldsContainer.style.maxHeight = '0';
            fieldsContainer.style.overflow = 'hidden';

            requestAnimationFrame(() => {
                fieldsContainer.style.maxHeight = '300px';
                fieldsContainer.style.opacity = '1';

                setTimeout(() => {
                    fieldsContainer.style.overflow = 'visible';
                    fieldsContainer.style.maxHeight = '';
                }, 300);
            });
        }
    } else {
        // Fade out and collapse
        fieldsContainer.style.opacity = '0';
        fieldsContainer.style.maxHeight = '0';
        fieldsContainer.style.overflow = 'hidden';

        setTimeout(() => {
            fieldsContainer.classList.add('hidden');
            fieldsContainer.style.maxHeight = '';
        }, 300);
    }
};

// Filtrar productos con regex/búsqueda
window.filterProductsInStep = (stepIndex) => {
    const searchInput = document.getElementById(`product-search-${stepIndex}`);
    const productsList = document.getElementById(`products-list-${stepIndex}`);

    if (!searchInput || !productsList) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    const productItems = productsList.querySelectorAll('.product-item');

    productItems.forEach(item => {
        const productName = item.getAttribute('data-product-name') || '';

        if (searchTerm === '' || productName.includes(searchTerm)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
};

// Actualizar productos recomendados del flow
window.updateRecommendedProducts = (stepIndex) => {
    const productsList = document.getElementById(`products-list-${stepIndex}`);
    if (!productsList) return;

    const checkboxes = productsList.querySelectorAll('input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    currentFlow.recommended_products = selectedIds;

    // Actualizar el contador en el label
    const label = document.querySelector(`#product-selector-${stepIndex} label span`);
    if (label) {
        label.textContent = `(${selectedIds.length} seleccionados)`;
    }

    // Actualizar el contador en el dropdown
    const modeSelect = document.getElementById(`step-products-${stepIndex}`);
    if (modeSelect) {
        const recommendedOption = modeSelect.querySelector('option[value="recommended"]');
        const smartOption = modeSelect.querySelector('option[value="smart_ai"]');

        if (recommendedOption) {
            recommendedOption.textContent = `📌 Fijos - Solo productos recomendados (${selectedIds.length})`;
        }
        if (smartOption) {
            smartOption.textContent = `🧠 Smart - IA analiza conversación → fallback a recomendados`;
        }
    }

    // Mostrar/ocultar advertencia
    const warning = document.querySelector(`#product-selector-${stepIndex} .text-orange-600`);
    if (warning) {
        if (selectedIds.length === 0) {
            warning.classList.remove('hidden');
        } else {
            warning.classList.add('hidden');
        }
    }

    console.log('[Flow Builder V3] Updated recommended products:', selectedIds);
};

// Ir a Settings para configurar pagos
window.goToPaymentSettings = async () => {
    // 1. Guardar el flow actual (si está editando)
    if (currentFlow && currentFlow.steps.length > 0) {
        const shouldSave = await window.showConfirmModal(
            '¿Guardar cambios del flow actual?',
            'Se guardará el progreso de tu flow antes de ir a Settings',
            'Guardar y Continuar',
            'Ir sin Guardar'
        );

        if (shouldSave) {
            try {
                await window.saveFlowV3();
                window.showToast?.('Flow guardado correctamente', 'success');
            } catch (error) {
                console.error('[Flow Builder] Error saving flow:', error);
                window.showToast?.('Error al guardar el flow', 'error');
                return; // No continuar si hay error
            }
        }
    }

    // 2. Cerrar el modal del flow builder
    const modal = document.getElementById('flow-editor-v3-modal');
    if (modal) modal.remove();

    // 3. Navegar a settings.html con hash para abrir el tab de pagos
    if (typeof window.loadPage === 'function') {
        await window.loadPage('settings.html');
        // Esperar un momento a que se cargue settings
        setTimeout(() => {
            // Activar el tab de pagos
            if (typeof window.switchSettingsTab === 'function') {
                window.switchSettingsTab('payment');
            }
            window.showToast?.('Configura tus datos de pago aquí 💳', 'info');
        }, 300);
    } else {
        // Fallback si no hay loadPage
        window.location.href = 'settings.html#payment';
    }
};

/**
 * Carga y muestra los datos de pago reales del usuario
 * para el preview en el editor de send_payment_info
 */
window.loadPaymentPreview = async (index) => {
    const displayDiv = document.getElementById(`payment-data-display-${index}`);
    if (!displayDiv) return;

    try {
        // Cargar datos del usuario
        const { data: { user } } = await window.auth.sb.auth.getUser();
        if (!user) {
            displayDiv.innerHTML = '<p class="text-red-600 font-medium">⚠️ No se pudo cargar el usuario</p>';
            return;
        }

        // Cargar payment_info del profile
        const { data: profile, error } = await window.auth.sb
            .from('profiles')
            .select('payment_info')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('[PaymentPreview] Error loading payment_info:', error);
            displayDiv.innerHTML = '<p class="text-red-600 font-medium">⚠️ Error cargando datos de pago</p>';
            return;
        }

        const paymentInfo = profile?.payment_info || {};

        // Si no hay datos configurados
        if (Object.keys(paymentInfo).length === 0 || !paymentInfo.bank_name) {
            displayDiv.innerHTML = `
                <p class="text-amber-600 font-medium mb-2">⚠️ No hay datos de pago configurados</p>
                <p class="text-xs text-slate-600">Configura tus datos en Settings para que las variables se llenen automáticamente.</p>
            `;
            return;
        }

        // Mostrar datos disponibles
        let html = '<div class="space-y-1.5">';

        if (paymentInfo.business_name) {
            html += `<p class="text-slate-700"><strong>Negocio:</strong> <code class="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">${paymentInfo.business_name}</code></p>`;
        }
        if (paymentInfo.bank_name) {
            html += `<p class="text-slate-700"><strong>Banco:</strong> <code class="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">${paymentInfo.bank_name}</code></p>`;
        }
        if (paymentInfo.bank_account) {
            html += `<p class="text-slate-700"><strong>Cuenta:</strong> <code class="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">${paymentInfo.bank_account}</code></p>`;
        }
        if (paymentInfo.account_holder) {
            html += `<p class="text-slate-700"><strong>Titular:</strong> <code class="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">${paymentInfo.account_holder}</code></p>`;
        }
        if (paymentInfo.clabe) {
            html += `<p class="text-slate-700"><strong>CLABE:</strong> <code class="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">${paymentInfo.clabe}</code></p>`;
        }
        if (paymentInfo.paypal_email) {
            html += `<p class="text-slate-700"><strong>PayPal:</strong> <code class="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">${paymentInfo.paypal_email}</code></p>`;
        }

        html += '</div>';
        html += '<p class="text-xs text-emerald-600 mt-3 font-medium">✅ Estos son los datos que se enviarán al cliente</p>';

        displayDiv.innerHTML = html;

    } catch (error) {
        console.error('[PaymentPreview] Unexpected error:', error);
        displayDiv.innerHTML = '<p class="text-red-600 font-medium">⚠️ Error inesperado cargando datos</p>';
    }
};

console.log('[Flow Builder V3] Loaded successfully');
