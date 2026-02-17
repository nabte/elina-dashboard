let currentFlowContainerId = 'ai-flows-list-container';

export async function initFlowBuilder(containerId) {
    if (containerId) currentFlowContainerId = containerId;
    const container = document.getElementById(currentFlowContainerId);
    if (!container) return;

    // Initial Loading State
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

        // REMOVED: Auto-ensure Nabte Flow - causing infinite loop
        // setTimeout(() => window.ensureNabteFlowExists(), 1000);
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

window.ensureNabteFlowExists = async () => {
    try {
        const userId = await window.getUserId();
        // Check if exists by specific flow_id to avoid duplicates
        const { data: existing } = await window.auth.sb
            .from('auto_responses')
            .select('id, flow_data')
            .eq('user_id', userId)
            .eq('is_flow', true);

        // Check if any flow has the specific nabte_smart_flow ID
        const hasNabteFlow = existing?.some(flow =>
            flow.flow_data?.id === 'nabte_smart_flow'
        );

        if (hasNabteFlow) return; // Already exists

        console.log('Creando Flujo Nabte Automático...');
        const nabteTemplate = {
            id: 'nabte_smart_flow',
            trigger_keywords: ['llaveros', 'impresion 3d', 'cotizar'],
            steps: [
                {
                    id: 'step_welcome',
                    type: 'message',
                    content: '¡Hola! 👋 Bienvenido a Nabte 3D. ¿Te gustaría cotizar llaveros personalizados?',
                    next_step: 'step_ask_qty'
                },
                {
                    id: 'step_ask_qty',
                    type: 'question',
                    content: 'Para darte el mejor precio, ¿cuántas piezas necesitas aproximadamente? (Ej: 50 piezas)',
                    variable: 'quantity',
                    validation: { type: 'number', error_message: 'Por favor dime solo el número aproximado.' },
                    next_step: 'step_calc_price'
                },
                {
                    id: 'step_calc_price',
                    type: 'action',
                    action_type: 'calculate_custom',
                    payload: {
                        input_var: 'quantity',
                        output_var: 'unit_price',
                        rules: [
                            { max: 20, price: 25 },
                            { min: 21, max: 50, price: 20 },
                            { min: 51, price: 15 }
                        ]
                    },
                    next_step: 'step_calc_total'
                },
                {
                    id: 'step_calc_total',
                    type: 'action',
                    action_type: 'calculate_custom',
                    payload: {
                        input_var: 'quantity',
                        output_var: 'total_price',
                        operation: 'multiply',
                        rules: [
                            { max: 20, price: 25 },
                            { min: 21, max: 50, price: 20 },
                            { min: 51, price: 15 }
                        ]
                    },
                    next_step: 'step_quote'
                },
                {
                    id: 'step_quote',
                    type: 'message',
                    content: 'Perfecto. Para {{quantity}} piezas:\n\n💰 Precio Unitario: ${{unit_price}}\n💵 Total Estimado: ${{total_price}}',
                    next_step: null
                }
            ]
        };

        const { error: insertError } = await window.auth.sb.from('auto_responses').insert({
            user_id: userId,
            trigger_text: 'llaveros, impresion 3d',
            response_text: 'NABTE_FLOW', // Placeholder
            is_active: true,
            is_flow: true,
            flow_data: nabteTemplate // Pass object, Supabase handles JSON
        });

        if (insertError) {
            console.error('Failed to create Nabte flow:', insertError);
            // Fallback for older schema if needed, or just warn
        } else {
            console.log('Flujo Nabte creado exitosamente');
            // REMOVED: Refresh UI to prevent infinite loop
            // const container = document.getElementById(currentFlowContainerId);
            // if (container) initFlowBuilder(currentFlowContainerId);
        }

    } catch (e) {
        console.error('Error auto-creating Nabte flow:', e);
    }
};

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

function renderMiniGuide() {
    return `
        <div class="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 mb-8 relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <i data-lucide="git-merge" class="w-32 h-32 text-indigo-600"></i>
            </div>
            
            <div class="flex items-start gap-4 relative z-10">
                <div class="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
                    <i data-lucide="book-open" class="w-6 h-6"></i>
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-slate-800 text-lg mb-2">¿Cómo funcionan los Flujos Inteligentes?</h3>
                    <p class="text-slate-600 text-sm mb-4 max-w-2xl">
                        Automatiza conversaciones complejas. Cuando un cliente escribe la <strong>Palabra Clave</strong>, Elina toma el control y sigue tus pasos.
                    </p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-white/60 p-3 rounded-lg border border-indigo-50">
                            <span class="text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1 block">Paso 1</span>
                            <p class="text-sm font-medium text-slate-700">Define el Disparador</p>
                            <p class="text-xs text-slate-500">Ej: "cotizar", "info", "precios"</p>
                        </div>
                        <div class="bg-white/60 p-3 rounded-lg border border-indigo-50">
                            <span class="text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1 block">Paso 2</span>
                            <p class="text-sm font-medium text-slate-700">Diseña la Conversación</p>
                            <p class="text-xs text-slate-500">Agrega preguntas y validaciones visualmente.</p>
                        </div>
                        <div class="bg-white/60 p-3 rounded-lg border border-indigo-50">
                            <span class="text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1 block">Paso 3</span>
                            <p class="text-sm font-medium text-slate-700">Activa y Vende</p>
                            <p class="text-xs text-slate-500">Elina ejecutará el flujo 24/7.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderFlowList(container, flows) {
    const miniGuideHTML = renderMiniGuide();

    if (flows.length === 0) {
        container.innerHTML = `
            ${miniGuideHTML}
            <div class="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div class="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                    <i data-lucide="git-branch" class="w-10 h-10 text-indigo-500"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">Tu primer flujo te espera</h3>
                <p class="text-slate-500 mb-8 max-w-md mx-auto">Crea una experiencia automatizada para tus clientes. Es tan fácil como diseñar una historia.</p>
                <button onclick="window.openFlowEditor()" class="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 mx-auto">
                    <i data-lucide="plus" class="w-5 h-5"></i>
                    Crear Nuevo Flujo
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            ${miniGuideHTML}
            <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold text-slate-800 text-xl">Tus Flujos Activos</h3>
                <button onclick="window.openFlowEditor()" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm shadow-md">
                    <i data-lucide="plus" class="w-4 h-4"></i> Nuevo
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${flows.map(flow => createFlowCard(flow)).join('')}
            </div>
        `;
    }

    if (window.lucide) lucide.createIcons();
}

function createFlowCard(flow) {
    const isActive = flow.is_active;
    const statusColor = isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200';
    const statusText = isActive ? 'Activo' : 'Pausado';
    const statusIcon = isActive ? 'activity' : 'pause-circle';

    // Parse flow data safely
    let stepsCount = 0;
    try {
        const flowData = typeof flow.flow_data === 'string' ? JSON.parse(flow.flow_data) : flow.flow_data;
        stepsCount = flowData?.steps?.length || 0;
    } catch (e) {
        console.warn('Error parsing flow data for count', e);
    }

    return `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:border-indigo-200 transition-all relative group flex flex-col h-full">
            <div class="flex justify-between items-start mb-4">
                <div class="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <i data-lucide="git-branch" class="w-6 h-6"></i>
                </div>
                <div class="flex items-center gap-2">
                     <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${statusColor}">
                        <i data-lucide="${statusIcon}" class="w-3 h-3"></i>
                        ${statusText}
                     </span>
                     <div class="relative">
                        <button onclick="window.toggleFlowMenu('${flow.id}')" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <i data-lucide="more-horizontal" class="w-5 h-5"></i>
                        </button>
                        <!-- Dropdown Menu -->
                        <div id="flow-menu-${flow.id}" class="hidden absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                            <button onclick="window.toggleFlowStatus('${flow.id}', ${!isActive})" class="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700 border-b border-slate-50">
                                <i data-lucide="${isActive ? 'pause' : 'play'}" class="w-4 h-4 text-slate-400"></i>
                                ${isActive ? 'Pausar Flujo' : 'Activar Flujo'}
                            </button>
                            <button onclick="window.deleteFlow('${flow.id}')" class="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 font-medium">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                Eliminar
                            </button>
                        </div>
                     </div>
                </div>
            </div>
            
            <div class="flex-1 mb-4">
                <h3 class="font-bold text-slate-900 text-lg mb-1 truncate" title="${flow.trigger_text}">
                    "${flow.trigger_text}"
                </h3>
                <p class="text-xs text-slate-500">Disparador automático</p>
            </div>
            
            <div class="flex items-center gap-4 text-xs text-slate-500 mb-5 bg-slate-50 p-3 rounded-lg">
                <div class="flex items-center gap-1.5 font-medium">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-indigo-400"></i>
                    <span>${stepsCount} pasos</span>
                </div>
                <div class="w-px h-3 bg-slate-300"></div>
                <div class="flex items-center gap-1.5">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i>
                    <span>${new Date(flow.updated_at || flow.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            
            <button onclick="window.openFlowEditor('${flow.id}')" class="w-full py-3 rounded-xl border-2 border-slate-100 text-slate-700 font-bold text-sm hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group-hover:shadow-sm">
                Diseñar Flujo <i data-lucide="arrow-right" class="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform"></i>
            </button>
        </div>
    `;
}

// Global functions for interactions
window.toggleFlowMenu = (flowId) => {
    const menu = document.getElementById(`flow-menu-${flowId}`);
    document.querySelectorAll('[id^="flow-menu-"]').forEach(el => {
        if (el.id !== `flow-menu-${flowId}`) el.classList.add('hidden');
    });

    if (menu) menu.classList.toggle('hidden');

    const closeMenu = (e) => {
        if (!e.target.closest(`#flow-menu-${flowId}`) && !e.target.closest(`button[onclick="window.toggleFlowMenu('${flowId}')"]`)) {
            menu?.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
        }
    };
    if (menu && !menu.classList.contains('hidden')) {
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
};


window.openFlowEditor = async (flowId = null) => {
    // 1. Template "Nabte" (Smart Flow)
    const nabteTemplate = {
        id: 'llaveros_3d_design_pro',
        trigger_keywords: ['llaveros', 'impresion 3d', 'cotizar'],
        steps: [
            {
                id: 'step_welcome',
                type: 'message',
                content: '¡Hola! 👋 Bienvenido a Nabte 3D. ¿Te gustaría cotizar una impresión 3D personalizada?',
                next_step: 'step_ask_design'
            },
            {
                id: 'step_ask_design',
                type: 'question',
                content: 'Para empezar, por favor envía una imagen o foto del diseño que te gustaría hacer. 📸',
                variable: 'diseno_img',
                validation: { type: 'image', error_message: 'Por favor, envía una imagen o archivo para procesar tu diseño.' },
                next_step: 'step_ask_qty'
            },
            {
                id: 'step_ask_qty',
                type: 'question',
                content: '¿Cuántas piezas necesitas aproximadamente? (Ej: 50 piezas)',
                variable: 'cantidad',
                validation: { type: 'number', error_message: 'Dime solo el número aproximado.' },
                next_step: 'step_calc_total'
            },
            {
                id: 'step_calc_total',
                type: 'action',
                action_type: 'calculate_quote',
                payload: {
                    auto_detect_product: true,
                    input_var: 'cantidad',
                    output_var: 'total_estimate'
                },
                next_step: 'step_quote'
            },
            {
                id: 'step_quote',
                type: 'message',
                content: '¡Listo! Según tus datos:\n\n- Diseño: Recibido ✅\n- Cantidad: {{cantidad}} pzs.\n\n💰 **Cotización Estimada**: {{total_estimate}}\n\n¿Deseas confirmar tu pedido e ir al pago?',
                next_step: 'step_payment_info'
            },
            {
                id: 'step_payment_info',
                type: 'message',
                media_url: 'https://mytvwfbijlgbihlegmfg.supabase.co/storage/v1/object/public/gallery/qr_example.png',
                content: 'Perfecto. Puedes realizar tu depósito en:\n\n🏦 **Nabte 3D Solutions**\n💳 CLABE: 0123 4567 8901 2345 67\n\nEnvía tu comprobante por aquí para iniciar producción. 👋',
                next_step: null
            }
        ]
    };

    window.loadNabteTemplate = () => {
        document.getElementById('flow-trigger').value = nabteTemplate.trigger_keywords[0];
        document.getElementById('flow-json-editor').value = JSON.stringify(nabteTemplate, null, 2);
        window.updateFlowVisuals();
        window.switchFlowMode('advanced');
        window.showToast?.('Plantilla Nabte cargada', 'success');
    };

    let flowData = {
        trigger_text: '',
        flow_data: JSON.stringify(nabteTemplate, null, 2),
        is_active: true
    };

    if (flowId) {
        try {
            window.showToast?.('Cargando flujo...', 'info');
            const { data, error } = await window.auth.sb
                .from('auto_responses')
                .select('*')
                .eq('id', flowId)
                .single();

            if (error) throw error;

            flowData = {
                ...data,
                flow_data: typeof data.flow_data === 'string' ? data.flow_data : JSON.stringify(data.flow_data, null, 2)
            };
        } catch (e) {
            console.error(e);
            window.showToast?.('Error al cargar flujo', 'error');
            return;
        }
    }

    const userId = await window.getUserId();

    // Fetch Products for Simple Mode
    let products = [];
    try {
        const { data: productsData } = await window.auth.sb
            .from('products')
            .select('id, product_name, price, gallery, faq')
            .eq('user_id', userId)
            .order('product_name');
        products = productsData || [];
    } catch (e) {
        console.warn('Error fetching products', e);
    }

    // Prepare steps for visualization
    let steps = [];
    try {
        const parsed = JSON.parse(flowData.flow_data);
        steps = parsed.steps || [];
    } catch (e) { }

    const modalId = 'flow-editor-modal';
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200';

    // UI Structure
    modal.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-100 relative">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div class="flex items-center gap-4">
                    <div class="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <i data-lucide="git-branch" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-xl text-slate-900">${flowId ? 'Diseñador de Flujos' : 'Nuevo Flujo'}</h3>
                        <p class="text-xs text-slate-500 font-medium tracking-wide uppercase">Configuración de Inteligencia</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                     <button onclick="window.toggleJsonEditor()" id="btn-json-toggle" class="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2">
                        <i data-lucide="code-2" class="w-4 h-4"></i>
                        <span id="json-toggle-text">Ver Código JSON</span>
                    </button>
                    <button onclick="document.getElementById('${modalId}').remove()" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>
            
            <!-- Quick Actions Toolbar -->
            <div id="flow-toolbar" class="px-8 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                <button onclick="window.loadNabteTemplate()" class="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    <i data-lucide="layout-template" class="w-3.5 h-3.5"></i> Plantilla Llaveros Nabte
                </button>
                <div class="w-px h-4 bg-slate-300 mx-2"></div>
                <button onclick="window.addStep('message')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    <i data-lucide="message-square" class="w-3.5 h-3.5"></i> + Mensaje
                </button>
                 <button onclick="window.addStep('question')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    <i data-lucide="help-circle" class="w-3.5 h-3.5"></i> + Pregunta
                </button>
                 <button onclick="window.addStep('action')" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    <i data-lucide="calculator" class="w-3.5 h-3.5"></i> + Cálculo
                </button>
                <!-- NEW STEP TYPES -->
                <div class="w-px h-4 bg-slate-300 mx-2"></div>
                <button onclick="window.addStep('collect_image')" class="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Recolectar imagen del usuario">
                    <i data-lucide="image" class="w-3.5 h-3.5"></i> + Imagen
                </button>
                <button onclick="window.addStep('create_quote')" class="px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Crear cotización">
                    <i data-lucide="file-text" class="w-3.5 h-3.5"></i> + Cotización
                </button>
                <button onclick="window.addStep('send_payment_info')" class="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Enviar info de pago">
                    <i data-lucide="credit-card" class="w-3.5 h-3.5"></i> + Pago
                </button>
                <button onclick="window.addStep('create_task')" class="px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Crear tarea">
                    <i data-lucide="check-square" class="w-3.5 h-3.5"></i> + Tarea
                </button>
                <button onclick="window.addStep('trigger_critical')" class="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Activar modo crítico">
                    <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> + Crítico
                </button>
            </div>

            <div class="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
                
                <!-- UNIFIED MODE UI -->
                <div id="unified-mode-ui" class="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                     <div class="max-w-3xl mx-auto space-y-8">
                        
                        <!-- 1. Trigger -->
                        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                             <div class="flex items-center gap-3 mb-4">
                                <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">1</span>
                                <div>
                                    <h4 class="font-bold text-slate-800">¿Qué activa este flujo?</h4>
                                    <p class="text-xs text-slate-500">Palabras clave que el cliente debe escribir.</p>
                                </div>
                            </div>
                            <div class="relative">
                                <i data-lucide="zap" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500"></i>
                                <input type="text" id="simple-trigger" value="${flowData.trigger_text}" placeholder="Ej: llaveros, cotizacion, 3d" class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all">
                            </div>
                            <p class="mt-2 text-xs text-slate-400 flex items-center gap-1">
                                <i data-lucide="info" class="w-3 h-3"></i> Se detectará automáticamente en frases como "¿Vendes <strong>llaveros</strong>?"
                            </p>
                        </div>

                        <!-- 1.5 Flow Strategy -->
                        <div class="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border-2 border-purple-200 shadow-sm">
                             <div class="flex items-center gap-3 mb-4">
                                <span class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">⚡</span>
                                <div>
                                    <h4 class="font-bold text-slate-800">Estrategia del Flujo</h4>
                                    <p class="text-xs text-slate-500">¿Cómo debe comportarse la IA?</p>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <!-- Step by Step -->
                                <label class="relative cursor-pointer group">
                                    <input type="radio" name="flow-strategy" value="step_by_step" checked class="peer sr-only">
                                    <div class="p-4 bg-white border-2 border-slate-200 rounded-xl peer-checked:border-indigo-500 peer-checked:bg-indigo-50 transition-all hover:shadow-md">
                                        <div class="flex items-start gap-3">
                                            <div class="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 peer-checked:bg-indigo-600 peer-checked:text-white transition-all">
                                                <i data-lucide="list-ordered" class="w-5 h-5"></i>
                                            </div>
                                            <div class="flex-1">
                                                <h5 class="font-bold text-slate-800 mb-1">Step-by-Step</h5>
                                                <p class="text-xs text-slate-600 leading-relaxed">La IA pregunta <strong>1 dato a la vez</strong>, confirma y avanza al siguiente paso.</p>
                                                <div class="mt-2 flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                                                    <i data-lucide="check-circle" class="w-3 h-3"></i>
                                                    Más control, menos errores
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </label>

                                <!-- Smart GetAll -->
                                <label class="relative cursor-pointer group">
                                    <input type="radio" name="flow-strategy" value="smart_getall" class="peer sr-only">
                                    <div class="p-4 bg-white border-2 border-slate-200 rounded-xl peer-checked:border-purple-500 peer-checked:bg-purple-50 transition-all hover:shadow-md">
                                        <div class="flex items-start gap-3">
                                            <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 peer-checked:bg-purple-600 peer-checked:text-white transition-all">
                                                <i data-lucide="sparkles" class="w-5 h-5"></i>
                                            </div>
                                            <div class="flex-1">
                                                <h5 class="font-bold text-slate-800 mb-1">Smart GetAll</h5>
                                                <p class="text-xs text-slate-600 leading-relaxed">La IA <strong>detecta qué falta</strong> y lo solicita de forma inteligente en la conversación.</p>
                                                <div class="mt-2 flex items-center gap-1 text-[10px] text-purple-600 font-bold">
                                                    <i data-lucide="zap" class="w-3 h-3"></i>
                                                    Más natural, conversacional
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div class="mt-4 p-3 bg-white/60 rounded-lg border border-purple-100">
                                <p class="text-[11px] text-slate-600 flex items-start gap-2">
                                    <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-500"></i>
                                    <span><strong>Step-by-Step:</strong> "¿Cuántas piezas?" → Usuario responde → "¿Qué diseño?" <br>
                                    <strong>Smart GetAll:</strong> "Necesito cantidad y diseño para cotizar" → IA detecta qué ya tiene</span>
                                </p>
                            </div>
                        </div>

                        <!-- 2. Requirements Checklist -->
                        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                             <div class="flex items-center gap-3 mb-4">
                                <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">2</span>
                                <div>
                                    <h4 class="font-bold text-slate-800">¿Qué datos necesitas?</h4>
                                    <p class="text-xs text-slate-500">Elina pedirá estos datos si el cliente no los da.</p>
                                </div>
                            </div>
                            
                            <div id="requirements-list" class="space-y-3 mb-4">
                                <!-- Dynamic Requirements -->
                            </div>

                            <div class="flex flex-wrap gap-2 mb-4">
                                <button onclick="window.addRequirementRow('Imagen del diseño', 'image')" class="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1">
                                    <i data-lucide="image" class="w-3 h-3"></i> + Solicitar Diseño (Imagen)
                                </button>
                                <button onclick="window.addRequirementRow('Cantidad', 'number')" class="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-1">
                                    <i data-lucide="hash" class="w-3 h-3"></i> + Cantidad (Número)
                                </button>
                                 <button onclick="window.addRequirementRow()" class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-1">
                                    <i data-lucide="plus-circle" class="w-3 h-3"></i> + Personalizado
                                </button>
                            </div>
                        </div>

                            <!-- 3. Outcome -->
                        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                             <div class="flex items-center gap-3 mb-4">
                                <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">3</span>
                                <div>
                                    <h4 class="font-bold text-slate-800">¿Qué pasa al final?</h4>
                                    <p class="text-xs text-slate-500">Selecciona una o varias acciones.</p>
                                </div>
                            </div>
                            
                             <div class="grid grid-cols-1 gap-4">
                                <!-- Quote Option -->
                                <div class="border border-slate-200 rounded-xl hover:border-indigo-300 transition-all">
                                    <label class="flex items-center gap-3 p-4 cursor-pointer select-none">
                                        <input type="checkbox" id="check-outcome-quote" onchange="window.toggleOutcomeOptions()" class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300">
                                        <span class="text-sm font-bold text-slate-700">Cotizar Producto Automáticamente</span>
                                    </label>
                                    
                                    <div id="product-select-container" class="hidden px-4 pb-4 pl-11 animate-in fade-in slide-in-from-top-1">
                                        <p class="text-xs text-slate-500 mb-2">Selecciona el producto a cotizar (debe tener precio configurado)</p>
                                        <select id="simple-product-id" onchange="window.updateProductPreview()" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 outline-none mb-2">
                                            <option value="">-- Seleccionar Producto --</option>
                                            ${products.map(p => `<option value="${p.id}" data-price="${p.price}" data-gallery="${(p.gallery || []).length}" data-faq="${(p.faq || []).length > 0}">${p.product_name} ($${p.price || 0})</option>`).join('')}
                                        </select>
                                        
                                        <!-- Product Capabilities Preview -->
                                        <div id="product-capabilities" class="hidden flex gap-2 mb-2">
                                            <span id="badge-gallery" class="hidden px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full font-bold border border-blue-100">📸 Galería: 0</span>
                                            <span id="badge-faq" class="hidden px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-full font-bold border border-purple-100">🧠 IA FAQ</span>
                                        </div>

                                        <div class="space-y-2">
                                            <label class="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" id="simple-product-use-gallery" checked class="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300">
                                                <span class="text-xs text-slate-600">Enviar Galería del Producto (si existe)</span>
                                            </label>
                                            <label class="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" id="simple-product-use-faq" class="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300">
                                                <span class="text-xs text-slate-600">Usar IA para responder dudas (Smart FAQ)</span>
                                            </label>
                                        </div>

                                        <label class="flex items-center gap-2 cursor-pointer mt-3 pt-3 border-t border-slate-100">
                                            <input type="checkbox" id="simple-product-autodetect" class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300">
                                            <span class="text-xs font-bold text-slate-600">O dejar que la IA detecte el producto (Experimental)</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Payment Option -->
                                <div class="border border-slate-200 rounded-xl hover:border-indigo-300 transition-all">
                                    <label class="flex items-center gap-3 p-4 cursor-pointer select-none">
                                        <input type="checkbox" id="check-outcome-payment" onchange="window.toggleOutcomeOptions()" class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300">
                                        <span class="text-sm font-bold text-slate-700">Solicitar Pago / Depósito</span>
                                    </label>
                                    
                                    <div id="payment-options-container" class="hidden px-4 pb-4 pl-11 animate-in fade-in slide-in-from-top-1 space-y-3">
                                        <div class="p-3 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
                                            <i data-lucide="shield-alert" class="w-4 h-4 shrink-0"></i>
                                            <p><strong>Nota:</strong> Los datos bancarios se envían tal cual.</p>
                                        </div>

                                        <!-- Payment Terms Configuration -->
                                        <div class="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                                            <p class="text-[11px] font-bold text-indigo-800 mb-2 uppercase tracking-wide">Esquema de Pago</p>
                                            
                                            <div class="flex gap-4">
                                                <label class="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="payment-model" value="full" checked onchange="window.togglePaymentModel()" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                                                    <span class="text-xs font-medium text-slate-700">Pago Total (100%)</span>
                                                </label>
                                                <label class="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="payment-model" value="down" onchange="window.togglePaymentModel()" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                                                    <span class="text-xs font-medium text-slate-700">Anticipo / Enganche</span>
                                                </label>
                                            </div>

                                            <div id="down-payment-config" class="hidden mt-3 flex gap-2 items-center animate-in fade-in slide-in-from-top-1">
                                                <input type="number" id="payment-down-val" placeholder="50" class="w-20 px-2 py-1 bg-white border border-indigo-200 rounded text-sm text-center focus:border-indigo-500 outline-none">
                                                <select id="payment-down-type" class="px-2 py-1 bg-white border border-indigo-200 rounded text-sm focus:border-indigo-500 outline-none">
                                                    <option value="percent">% Porcentaje</option>
                                                    <option value="fixed">$monto Fijo</option>
                                                </select>
                                                <span class="text-[10px] text-indigo-400">del total</span>
                                            </div>
                                        </div>

                                        <div>
                                            <div class="flex justify-between items-center mb-1">
                                                <label class="block text-xs font-bold text-slate-500">Datos Bancarios / Depósito (Estático)</label>
                                                <button onclick="document.getElementById('simple-payment-instructions').value = '🏦 Banco: Nabte 3D\n💳 CLABE: 0123 4567 8901 2345 67\n💰 Concepto: Cotización {{total_estimate}}'" class="text-[10px] text-indigo-600 hover:underline">Ejemplo</button>
                                            </div>
                                            <textarea id="simple-payment-instructions" rows="3" placeholder="Deposita a la cuenta CLABE: 1234567890..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 outline-none font-mono text-xs mb-3"></textarea>
                                            
                                            <label class="block text-xs font-bold text-slate-500 mb-1">Imagen de Pago / QR (Diseño/Instrucciones)</label>
                                            <div class="flex items-center gap-3">
                                                <div id="payment-image-preview-container" class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    <i data-lucide="image" class="w-5 h-5 text-slate-400"></i>
                                                </div>
                                                <div class="flex-1">
                                                    <input type="hidden" id="simple-payment-image" value="">
                                                    <label class="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                                                        <i data-lucide="upload-cloud" class="w-3.5 h-3.5 text-indigo-500"></i>
                                                        <span id="payment-upload-btn-text">Subir Imagen / QR</span>
                                                        <input type="file" id="payment-image-upload" accept="image/*" class="hidden" onchange="window.handlePaymentImageUpload(this)">
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" id="simple-payment-alert" checked class="w-4 h-4 text-red-500 rounded focus:ring-red-500 border-gray-300">
                                            <span class="text-xs font-bold text-red-500">Alertar al Admin cuando soliciten esto</span>
                                        </label>
                                    </div>
                                </div>

                            </div>
                        </div>

                     </div>
                </div>

                <!-- ADVANCED CONFIGURATION PANEL (Hidden by default, shows when toggled) -->
                <div id="advanced-config-panel" class="hidden flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-white border-l border-slate-200">
                    <!-- Left Panel: Configuration & Visual Timeline -->
                    <div class="flex-1 overflow-y-auto p-8 border-r border-slate-100 bg-slate-50/50">
                        
                         <!-- Trigger Section -->
                        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
                            <div class="flex items-center gap-3 mb-4">
                                <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">1</span>
                                <h4 class="font-bold text-slate-800">Disparador del Flujo</h4>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Palabra Clave</label>
                                    <div class="relative">
                                        <i data-lucide="zap" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500"></i>
                                        <input type="text" id="flow-trigger" value="${flowData.trigger_text}" placeholder="Ej: cotizar" class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all">
                                    </div>
                                </div>
                                <div class="flex items-end pb-3">
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="checkbox" id="flow-active" class="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" ${flowData.is_active ? 'checked' : ''}>
                                        <span class="text-sm font-bold text-slate-700">Activar para Clientes</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Visual Timeline -->
                        <div class="mb-6">
                            <div class="flex items-center gap-3 mb-4">
                                <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">2</span>
                                <h4 class="font-bold text-slate-800">Línea de Tiempo (Pasos)</h4>
                            </div>
                            
                            <div id="visual-steps-container" class="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 before:z-0">
                                <!-- Steps will be rendered here via JS -->
                            </div>
                            
                            <div class="mt-8 text-center">
                                <button onclick="window.addStep('message')" class="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-full hover:border-indigo-300 hover:text-indigo-600 transition-all text-sm font-medium shadow-sm inline-flex items-center gap-2">
                                    <i data-lucide="plus" class="w-4 h-4"></i> Agregar Nuevo Paso al Final
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Right Panel: JSON Code Editor (Hidden by default) -->
                    <div id="json-editor-panel" class="hidden w-full lg:w-[450px] bg-slate-900 flex flex-col border-l border-slate-800 transition-all duration-300">
                        <div class="px-6 py-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Editor Avanzado (JSON)</label>
                            <button onclick="window.formatFlowJSON()" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
                                <i data-lucide="code-2" class="w-3.5 h-3.5"></i> Prettify
                            </button>
                        </div>
                        <div class="flex-1 relative">
                            <textarea id="flow-json-editor" class="w-full h-full bg-slate-900 text-green-400 font-mono text-xs p-6 resize-none focus:outline-none leading-relaxed" spellcheck="false">${flowData.flow_data}</textarea>
                        </div>
                    </div>
                </div>
                <!-- Helper: Step Editor Modal (Absolute Overlay) -->
                <div id="step-editor-modal" class="hidden absolute right-0 top-0 bottom-0 w-full lg:w-[450px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
                    <!-- Dynamic Step Editor Content -->
                </div>
            </div>

            <!-- Footer con Botón Guardar -->
            <div class="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center z-20 relative">
                <div class="flex flex-col">
                    <p class="text-xs text-slate-400 italic font-medium" id="mode-status-text">Editor Unificado</p>
                    <p class="text-[10px] text-slate-300">Configuración visual + código avanzado</p>
                </div>
                <button onclick="window.saveFlow('${flowId || ''}')" class="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
                    <i data-lucide="save" class="w-5 h-5"></i>
                    ${flowId ? 'Guardar Cambios' : 'Crear Flujo'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    // Init unified mode (no mode switching needed)
    window.addRequirementRow('Cantidad', 'number'); // Example default
};

// Toggle Outcome Options
window.toggleOutcomeOptions = () => {
    const quoteCheck = document.getElementById('check-outcome-quote');
    const paymentCheck = document.getElementById('check-outcome-payment');

    const quoteContainer = document.getElementById('product-select-container');
    const paymentContainer = document.getElementById('payment-options-container');

    if (quoteCheck?.checked) {
        quoteContainer.classList.remove('hidden');
    } else {
        quoteContainer.classList.add('hidden');
    }

    if (paymentCheck?.checked) {
        paymentContainer.classList.remove('hidden');
    } else {
        paymentContainer.classList.add('hidden');
    }
};

window.updateProductPreview = () => {
    const select = document.getElementById('simple-product-id');
    const option = select.options[select.selectedIndex];
    const caps = document.getElementById('product-capabilities');
    const badgeGallery = document.getElementById('badge-gallery');
    const badgeFaq = document.getElementById('badge-faq');
    const checkGallery = document.getElementById('simple-product-use-gallery');

    if (!option.value) {
        caps.classList.add('hidden');
        return;
    }

    caps.classList.remove('hidden');

    // Logic to show badges based on data attributes (requires data attributes injected in map)
    const galleryCount = parseInt(option.getAttribute('data-gallery') || '0');
    const hasFaq = option.getAttribute('data-faq') === 'true';

    if (galleryCount > 0) {
        badgeGallery.textContent = `📸 Galería: ${galleryCount}`;
        badgeGallery.classList.remove('hidden');
    } else {
        badgeGallery.classList.add('hidden');
    }

    if (hasFaq) {
        badgeFaq.classList.remove('hidden');
    } else {
        badgeFaq.classList.add('hidden');
    }
};

window.togglePaymentModel = () => {
    const isDown = document.querySelector('input[name="payment-model"][value="down"]').checked;
    const config = document.getElementById('down-payment-config');
    if (isDown) config.classList.remove('hidden');
    else config.classList.add('hidden');
};

window.handlePaymentImageUpload = async (input) => {
    const file = input.files[0];
    if (!file) return;

    const btnText = document.getElementById('payment-upload-btn-text');
    const previewContainer = document.getElementById('payment-image-preview-container');
    const hiddenInput = document.getElementById('simple-payment-image');

    try {
        btnText.textContent = 'Subiendo...';
        previewContainer.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 text-indigo-500 animate-spin"></i>';
        if (window.lucide) lucide.createIcons();

        // Usamos la función global del sistema para subir a Bunny.net via Edge Function
        const url = await window.appInstance.uploadAsset(file, 'flow_payments');

        if (url) {
            hiddenInput.value = url;
            previewContainer.innerHTML = `<img src="${url}" class="w-full h-full object-cover">`;
            btnText.textContent = 'Imagen Subida';
            window.showToast?.('Imagen de pago lista', 'success');
        } else {
            throw new Error('No se obtuvo URL');
        }
    } catch (e) {
        console.error('Error uploading payment image:', e);
        window.showToast?.('Error al subir imagen', 'error');
        btnText.textContent = 'Error. Reintentar';
        previewContainer.innerHTML = '<i data-lucide="alert-circle" class="w-5 h-5 text-red-500"></i>';
    } finally {
        if (window.lucide) lucide.createIcons();
    }
};

// Mode Switching & Logic
window.switchFlowMode = (mode) => {
    // Deprecated - keeping for compatibility but now we just use unified mode
    // Mode parameter ignored, we always show unified UI
    console.log('switchFlowMode called (deprecated), using unified mode');
};

// Toggle JSON Editor Panel
window.toggleJsonEditor = () => {
    const jsonPanel = document.getElementById('json-editor-panel');
    const toggleBtn = document.getElementById('btn-json-toggle');
    const toggleText = document.getElementById('json-toggle-text');

    if (jsonPanel && toggleBtn) {
        const isHidden = jsonPanel.classList.contains('hidden');

        if (isHidden) {
            // Show JSON editor
            jsonPanel.classList.remove('hidden');
            toggleText.textContent = 'Ocultar Código';

            // Sync current simple UI state to JSON
            try {
                const harvest = window.harvestCheckboxes();
                const trigger = document.getElementById('simple-trigger').value.trim();
                const reqRows = document.querySelectorAll('#requirements-list > div');
                const requirements = Array.from(reqRows).map(row => ({
                    label: row.querySelector('.req-label').value.trim(),
                    type: row.querySelector('.req-type').value
                })).filter(r => r.label);

                // Capture strategy
                const strategyRadio = document.querySelector('input[name="flow-strategy"]:checked');
                const strategy = strategyRadio ? strategyRadio.value : 'step_by_step';

                if (trigger) {
                    const generatedFlow = simpleToSmartFlow(trigger, requirements, harvest.quoteData, harvest.paymentData, strategy);
                    document.getElementById('flow-json-editor').value = JSON.stringify(generatedFlow, null, 2);
                }
            } catch (e) {
                console.error('Error syncing to JSON:', e);
            }
        } else {
            // Hide JSON editor
            jsonPanel.classList.add('hidden');
            toggleText.textContent = 'Ver Código JSON';
        }
    }
};;

window.updateFlowVisuals = () => {
    try {
        const jsonContent = document.getElementById('flow-json-editor').value;
        const flowData = JSON.parse(jsonContent);
        const steps = flowData.steps || [];
        const container = document.getElementById('visual-steps-container');

        container.innerHTML = steps.map((step, index) => {
            let content = step.content || step.message_template || step.message || (step.type === 'action' ? `Acción: ${step.action_type}` : 'Sin contenido');

            // Special content for new step types
            if (step.type === 'collect_image') content = `📸 ${step.content || 'Recolectar imagen'} → ${step.variable}`;
            if (step.type === 'read_image') content = `🔍 Leer imagen de ${step.image_variable} → ${step.output_variable}`;
            if (step.type === 'create_quote') content = `💼 Crear cotización (${step.products})`;
            if (step.type === 'send_payment_info') content = `💳 Enviar info de pago (${step.payment_method})`;
            if (step.type === 'trigger_critical') content = `🚨 Modo crítico: ${step.reason}`;
            if (step.type === 'create_task') content = `✅ Crear tarea: ${step.task_title}`;

            content = content.replace(/{{/g, '<span class="text-indigo-600 font-bold px-1 bg-indigo-50 rounded">').replace(/}}/g, '</span>');

            // Icon mapping for all step types
            let icon = 'message-square';
            let iconColor = 'slate';

            switch (step.type) {
                case 'question':
                    icon = 'help-circle';
                    iconColor = 'blue';
                    break;
                case 'action':
                    icon = 'calculator';
                    iconColor = 'purple';
                    break;
                case 'collect_image':
                    icon = 'image';
                    iconColor = 'emerald';
                    break;
                case 'read_image':
                    icon = 'eye';
                    iconColor = 'teal';
                    break;
                case 'create_quote':
                    icon = 'file-text';
                    iconColor = 'purple';
                    break;
                case 'send_payment_info':
                    icon = 'credit-card';
                    iconColor = 'blue';
                    break;
                case 'trigger_critical':
                    icon = 'alert-circle';
                    iconColor = 'red';
                    break;
                case 'create_task':
                    icon = 'check-square';
                    iconColor = 'orange';
                    break;
            }

            return `
            <div class="relative z-10 pl-16 group">
                <div class="absolute left-3 top-4 w-6 h-6 rounded-full bg-white border-2 border-slate-300 group-hover:border-indigo-500 transition-colors flex items-center justify-center">
                    <div class="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors"></div>
                </div>
                
                <div onclick="window.editStep(${index})" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group-hover:border-indigo-200 group-hover:ring-1 group-hover:ring-indigo-50 cursor-pointer relative overflow-hidden">
                     <!-- Hover Edit Overlay -->
                     <div class="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-4 pointer-events-none">
                        <span class="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded-md shadow-sm">Editar <i data-lucide="edit-2" class="w-3 h-3 inline"></i></span>
                     </div>

                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-indigo-500 uppercase tracking-wider">Paso ${index + 1} (${step.id})</span>
                                ${step.variable ? `<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold border border-amber-200 flex items-center gap-1"><i data-lucide="database" class="w-3 h-3"></i> -> ${step.variable}</span>` : ''}
                        </div>
                        <span class="px-2 py-1 bg-${iconColor}-100 text-${iconColor}-600 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1">
                            <i data-lucide="${icon}" class="w-3 h-3"></i>
                            ${step.type.replace(/_/g, ' ')}
                        </span>
                    </div>
                    
                    <div class="bg-slate-50 p-3 rounded-xl text-slate-700 text-sm leading-relaxed border border-slate-100 italic">
                        "${content}"
                    </div>

                    ${step.type === 'action' && step.payload?.rules ? `
                        <div class="mt-3 flex flex-wrap gap-2">
                             ${step.payload.rules.map(r => `<span class="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">Rango: ${r.min || 0}-${r.max || '∞'} = $${r.price}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <!-- Connector Line Actions -->
               <div class="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="window.deleteStep(${index}, event)" class="p-2 text-red-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-full shadow-sm border border-slate-200 transition-colors" title="Eliminar paso">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
               </div>
            </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error('Error visualization:', e);
    }
}

window.editStep = (index) => {
    const jsonContent = document.getElementById('flow-json-editor').value;
    const flowData = JSON.parse(jsonContent);
    const step = flowData.steps[index];
    renderStepEditorModal(step, index);
};

window.addStep = (type) => {
    const newStep = {
        id: `step_${Date.now()}`,
        type: type,
        content: `Nuevo ${type === 'message' ? 'mensaje' : 'paso'}`,
        next_step: null
    };

    // Configure defaults for each step type
    switch (type) {
        case 'question':
            newStep.variable = 'nueva_variable';
            newStep.validation = { type: 'text' };
            break;

        case 'action':
            newStep.action_type = 'calculate_custom';
            newStep.payload = { input_var: 'cantidad', output_var: 'total' };
            break;

        // ========== NEW STEP TYPES ==========

        case 'collect_image':
            newStep.content = 'Por favor envía una imagen';
            newStep.variable = 'imagen_recibida';
            newStep.max_images = 1;
            newStep.optional = false;
            newStep.read_content = false;
            break;

        case 'read_image':
            newStep.image_variable = 'imagen_recibida';
            newStep.output_variable = 'descripcion_imagen';
            newStep.prompt = 'Describe esta imagen en detalle';
            newStep.extract_text = false;
            newStep.extract_json = false;
            delete newStep.content; // read_image doesn't have content
            break;

        case 'create_quote':
            newStep.products = 'auto_detect';
            newStep.generate_pdf = true;
            newStep.send_to_customer = true;
            newStep.notify_admin = false;
            newStep.output_variable = 'quote_id';
            delete newStep.content; // create_quote doesn't have content
            break;

        case 'send_payment_info':
            newStep.message_template = 'Puedes transferir a:\n\n🏦 {{bank_name}}\n💳 {{bank_account}}\n👤 {{account_holder}}';
            newStep.include_image = false;
            newStep.payment_method = 'transfer';
            delete newStep.content; // Uses message_template instead
            break;

        case 'trigger_critical':
            newStep.reason = 'Cliente requiere atención personalizada';
            newStep.pause_flow = true;
            newStep.add_label = 'ignorar';
            newStep.auto_response = 'Gracias por tu mensaje. Un miembro de nuestro equipo se pondrá en contacto contigo pronto.';
            delete newStep.content;
            break;

        case 'create_task':
            newStep.task_title = 'Tarea desde flow: {{flow_name}}';
            newStep.task_description = 'Seguimiento necesario para contacto';
            newStep.due_date_offset_days = 3;
            newStep.priority = 'medium';
            newStep.assign_to_user = true;
            newStep.notify_on_create = false;
            delete newStep.content;
            break;
    }

    const jsonContent = document.getElementById('flow-json-editor').value;
    let flowData = {};
    try {
        flowData = JSON.parse(jsonContent);
    } catch { flowData = { steps: [] }; }

    if (!flowData.steps) flowData.steps = [];

    // Auto-link previous step
    if (flowData.steps.length > 0) {
        const lastStep = flowData.steps[flowData.steps.length - 1];
        if (!lastStep.next_step) lastStep.next_step = newStep.id;
    }

    flowData.steps.push(newStep);

    document.getElementById('flow-json-editor').value = JSON.stringify(flowData, null, 2);
    window.updateFlowVisuals();
    window.editStep(flowData.steps.length - 1); // Open editor immediately
};

window.deleteStep = (index, event) => {
    event?.stopPropagation(); // Prevent opening edit modal
    if (!confirm('¿Eliminar este paso?')) return;

    const jsonContent = document.getElementById('flow-json-editor').value;
    const flowData = JSON.parse(jsonContent);
    flowData.steps.splice(index, 1);

    document.getElementById('flow-json-editor').value = JSON.stringify(flowData, null, 2);
    window.updateFlowVisuals();
};

window.saveStepChanges = (index, newData) => {
    const jsonContent = document.getElementById('flow-json-editor').value;
    const flowData = JSON.parse(jsonContent);

    flowData.steps[index] = { ...flowData.steps[index], ...newData };

    document.getElementById('flow-json-editor').value = JSON.stringify(flowData, null, 2);
    window.updateFlowVisuals();
    document.getElementById('step-editor-modal').classList.add('hidden');
};

function renderStepEditorModal(step, index) {
    const modal = document.getElementById('step-editor-modal');
    modal.classList.remove('hidden');

    let specificFields = '';

    if (step.type === 'message' || step.type === 'question') {
        specificFields += `
            <div class="mb-5">
                <label class="block text-xs font-bold text-slate-500 mb-2">Contenido (Texto)</label>
                <textarea id="edit-step-content" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm h-28 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all">${step.content || ''}</textarea>
                <p class="text-[10px] text-slate-400 mt-1">Usa {{variable}} para insertar datos.</p>
            </div>
        `;
    }

    if (step.type === 'question') {
        specificFields += `
            <div class="grid grid-cols-2 gap-4 mb-5">
                <div>
                     <label class="block text-xs font-bold text-slate-500 mb-1">Nombre Variable</label>
                     <input type="text" id="edit-step-variable" value="${step.variable || ''}" placeholder="ej: color" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Tipo Validación</label>
                    <select id="edit-step-validation" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white">
                        <option value="text" ${step.validation?.type === 'text' ? 'selected' : ''}>Texto Libre</option>
                        <option value="number" ${step.validation?.type === 'number' ? 'selected' : ''}>Número</option>
                        <option value="email" ${step.validation?.type === 'email' ? 'selected' : ''}>Email</option>
                    </select>
                </div>
            </div>
            <div class="mb-5">
                <label class="block text-xs font-bold text-slate-500 mb-1">Mensaje de Error</label>
                <input type="text" id="edit-step-error" value="${step.validation?.error_message || 'Dato no válido.'}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-red-500 focus:bg-white">
            </div>
        `;
    }

    if (step.type === 'action') {
        const actionType = step.action_type || 'calculate_custom';
        specificFields += `
            <div class="mb-5">
                <label class="block text-xs font-bold text-slate-500 mb-1">Tipo de Acción</label>
                <select id="edit-step-action-type" onchange="window.toggleActionFields(this.value)" class="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-bold text-indigo-700">
                    <option value="calculate_custom" ${actionType === 'calculate_custom' ? 'selected' : ''}>🧮 Cálculo por Rangos</option>
                    <option value="calculate_quote" ${actionType === 'calculate_quote' ? 'selected' : ''}>🏷️ Cotizar Producto</option>
                    <option value="notify_admin" ${actionType === 'notify_admin' ? 'selected' : ''}>🔔 Notificar al Admin</option>
                </select>
            </div>

            <div id="action-field-calculate_custom" class="action-type-panel ${actionType !== 'calculate_custom' ? 'hidden' : ''} mb-5 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label class="text-[10px] font-bold text-indigo-400 uppercase">Input Var</label>
                        <input type="text" id="edit-step-input" value="${step.payload?.input_var || 'quantity'}" class="w-full px-2 py-1.5 bg-white border border-indigo-100 rounded text-xs font-mono">
                    </div>
                    <div>
                         <label class="text-[10px] font-bold text-indigo-400 uppercase">Output Var</label>
                        <input type="text" id="edit-step-output" value="${step.payload?.output_var || 'unit_price'}" class="w-full px-2 py-1.5 bg-white border border-indigo-100 rounded text-xs font-mono">
                    </div>
                </div>
                <div id="edit-step-rules-container">
                    ${(step.payload?.rules || []).map((r, i) => `
                        <div class="flex gap-2 items-center mb-2 animate-in fade-in">
                            <input type="number" placeholder="Min" value="${r.min || ''}" class="rule-min w-14 px-2 py-1 text-xs border rounded bg-white">
                            <input type="number" placeholder="Max" value="${r.max || ''}" class="rule-max w-14 px-2 py-1 text-xs border rounded bg-white">
                            <span class="text-indigo-300 font-bold">$</span>
                            <input type="number" placeholder="Pr" value="${r.price || ''}" class="rule-price w-20 px-2 py-1 text-xs border border-indigo-200 rounded bg-white font-bold text-indigo-600">
                            <button onclick="this.parentElement.remove()" class="p-1 text-red-300 hover:text-red-500 transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                        </div>
                    `).join('')}
                </div>
                <button onclick="addRuleRow()" type="button" class="mt-2 text-xs text-indigo-600 font-bold hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 border-dashed w-full transition-all">+ Agregar Rango</button>
            </div>

            <div id="action-field-calculate_quote" class="action-type-panel ${actionType !== 'calculate_quote' ? 'hidden' : ''} mb-5 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm">
                <div class="space-y-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="edit-step-auto-product" ${step.payload?.auto_detect_product ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600">
                        <span class="text-xs text-emerald-800 font-medium">Auto-detectar producto por IA</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="edit-step-use-faq" ${step.payload?.enable_faq ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600">
                        <span class="text-xs text-emerald-800 font-medium">Activar IA FAQ para dudas</span>
                    </label>
                </div>
            </div>

            <div id="action-field-notify_admin" class="action-type-panel ${actionType !== 'notify_admin' ? 'hidden' : ''} mb-5 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm">
                <label class="block text-xs font-bold text-amber-700 mb-1">Mensaje Admin</label>
                <textarea id="edit-step-notify-msg" class="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs h-20">${step.payload?.message || ''}</textarea>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="h-full flex flex-col p-6 overflow-hidden">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-slate-800 text-lg">Editar Paso ${index + 1}</h3>
                <button onclick="document.getElementById('step-editor-modal').classList.add('hidden')" class="p-2 hover:bg-slate-100 rounded-full">
                    <i data-lucide="x" class="w-5 h-5 text-slate-400"></i>
                </button>
            </div>
            
            <div class="flex-1 overflow-y-auto pr-2">
                <div class="mb-4">
                    <label class="block text-xs font-bold text-slate-500 mb-1">ID del Paso</label>
                    <input type="text" id="edit-step-id" value="${step.id}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-600" disabled>
                </div>
                
                ${specificFields}
                
                <div class="mb-4">
                    <label class="block text-xs font-bold text-slate-500 mb-1">Siguiente Paso (ID)</label>
                    <input type="text" id="edit-step-next" value="${step.next_step || ''}" placeholder="null" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono">
                </div>
            </div>
            
            <div class="pt-4 border-t border-slate-100 mt-2">
                <button onclick="window.submitStepEdit(${index}, '${step.type}')" class="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                    Guardar Cambios
                </button>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

window.toggleActionFields = (value) => {
    document.querySelectorAll('.action-type-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`action-field-${value}`);
    if (panel) panel.classList.remove('hidden');
};

window.submitStepEdit = (index, type) => {
    const newData = {
        next_step: document.getElementById('edit-step-next').value || null
    };

    if (type === 'message' || type === 'question') {
        newData.content = document.getElementById('edit-step-content').value;
    }

    if (type === 'question') {
        newData.variable = document.getElementById('edit-step-variable').value;
        newData.validation = {
            type: document.getElementById('edit-step-validation').value,
            error_message: document.getElementById('edit-step-error').value
        };
    }

    if (type === 'action') {
        const actionType = document.getElementById('edit-step-action-type').value;
        newData.action_type = actionType;

        if (actionType === 'calculate_custom') {
            const rulesContainer = document.getElementById('edit-step-rules-container');
            const rules = [];
            rulesContainer.querySelectorAll('.flex').forEach(row => {
                const min = row.querySelector('.rule-min').value;
                const max = row.querySelector('.rule-max').value;
                const price = row.querySelector('.rule-price').value;
                if (price) {
                    rules.push({
                        min: min ? parseFloat(min) : undefined,
                        max: max ? parseFloat(max) : undefined,
                        price: parseFloat(price)
                    });
                }
            });
            newData.payload = {
                input_var: document.getElementById('edit-step-input').value,
                output_var: document.getElementById('edit-step-output').value,
                rules: rules
            };
        } else if (actionType === 'calculate_quote') {
            newData.payload = {
                auto_detect_product: document.getElementById('edit-step-auto-product').checked,
                enable_faq: document.getElementById('edit-step-use-faq').checked
            };
        } else if (actionType === 'notify_admin') {
            newData.payload = {
                message: document.getElementById('edit-step-notify-msg').value
            };
        }
    }

    window.saveStepChanges(index, newData);
};

window.addRequirementRow = (defaultLabel = '', defaultType = 'text') => {
    const container = document.getElementById('requirements-list');
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200';
    row.innerHTML = `
        <div class="flex-1">
            <input type="text" placeholder="Ej: Foto del diseño" value="${defaultLabel}" class="req-label w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 outline-none">
        </div>
        <div class="w-32">
            <select class="req-type w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 outline-none">
                <option value="text" ${defaultType === 'text' ? 'selected' : ''}>Texto</option>
                <option value="number" ${defaultType === 'number' ? 'selected' : ''}>Número</option>
                <option value="image" ${defaultType === 'image' ? 'selected' : ''}>Imagen</option>
                <option value="date" ${defaultType === 'date' ? 'selected' : ''}>Fecha</option>
            </select>
        </div>
        <button onclick="this.parentElement.remove()" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
    `;
    container.appendChild(row);
    if (window.lucide) lucide.createIcons();
};

window.harvestCheckboxes = () => {
    const checkQuote = document.getElementById('check-outcome-quote');
    const checkPayment = document.getElementById('check-outcome-payment');

    const quoteData = checkQuote?.checked ? {
        productId: document.getElementById('simple-product-id').value,
        isAutoProduct: document.getElementById('simple-product-autodetect')?.checked,
        useGallery: document.getElementById('simple-product-use-gallery')?.checked,
        useFaq: document.getElementById('simple-product-use-faq')?.checked
    } : null;

    const isDown = document.querySelector('input[name="payment-model"][value="down"]')?.checked;

    const paymentData = checkPayment?.checked ? {
        instructions: document.getElementById('simple-payment-instructions').value.trim(),
        image_url: document.getElementById('simple-payment-image').value.trim(),
        alert_admin: document.getElementById('simple-payment-alert').checked,
        model: isDown ? 'down' : 'full',
        downVal: document.getElementById('payment-down-val')?.value,
        downType: document.getElementById('payment-down-type')?.value
    } : null;

    return { quoteData, paymentData };
};

function simpleToSmartFlow(trigger, requirements, quoteData, paymentData, strategy = 'step_by_step') {
    const flowId = trigger.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    let startNext = requirements.length > 0 ? 'step_req_0' : 'step_process_start';

    const steps = [
        {
            id: 'step_welcome',
            type: 'message',
            content: '¡Hola! 👋 Para ayudarte con eso, necesito algunos datos.',
            next_step: startNext
        }
    ];

    if (strategy === 'smart_getall') {
        // Smart GetAll Strategy
        // Single step to collect all requirements via AI conversation
        const requirementsList = requirements.map(req => {
            let varName = req.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
            if (!varName) varName = `var_${requirements.indexOf(req)}`;
            return { label: req.label, variable: varName, type: req.type };
        });

        // Smart step that loops until unsatisfied
        steps.push({
            id: 'step_smart_collect',
            type: 'smart_collect', // New step type for the engine
            content: `Para procesar tu solicitud necesito los siguientes datos: ${requirements.map(r => r.label).join(', ')}.`,
            requirements: requirementsList,
            next_step: 'step_process_start', // Goes to processing once satisfied
            metadata: {
                strategy: 'smart_getall',
                description: 'La IA solicitará los datos faltantes de forma conversacional.'
            }
        });

        // Update welcome to point to smart collect
        steps[0].next_step = 'step_smart_collect';

    } else {
        // Step-by-Step Strategy (Default)
        requirements.forEach((req, index) => {
            const isLast = index === requirements.length - 1;
            const nextStepId = isLast ? 'step_process_start' : `step_req_${index + 1}`;
            let varName = req.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
            if (!varName) varName = `var_${index}`;

            let promptText = `¿Cuál es el dato para: ${req.label}?`;
            if (req.type === 'image') promptText = `Por favor, envía una imagen de: ${req.label}. La necesito para procesar tu solicitud.`;
            if (req.type === 'number') promptText = `¿Qué cantidad necesitas de ${req.label}? (Dime solo el número)`;

            steps.push({
                id: `step_req_${index}`,
                type: 'question',
                content: promptText,
                variable: varName,
                validation: { type: req.type, error_message: 'Dato inválido o formato incorrecto.' },
                next_step: nextStepId
            });
        });
    }

    // Common Processing Steps (Quote & Payment)
    const processSteps = [];

    // Prepare variables for summary
    const summaryVars = requirements.map((req, index) => {
        let varName = req.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
        if (!varName) varName = `var_${index}`;
        return `- ${req.label}: {{${varName}}}`;
    }).join('\n');

    if (quoteData) {
        processSteps.push({
            id: 'step_calc_quote',
            type: 'action',
            action_type: 'calculate_quote',
            payload: {
                product_id: quoteData.productId,
                auto_detect_product: quoteData.isAutoProduct,
                enable_faq: quoteData.useFaq,
                input_var: 'cantidad',
                output_var: 'total_estimate'
            }
        });

        const extraProps = {};
        if (quoteData.useGallery) extraProps.dynamic_media_source = 'product_gallery';

        processSteps.push({
            id: 'step_quote_result',
            type: 'message',
            ...extraProps,
            content: `¡Listo! Según tus datos: \n\n${summaryVars} \n\n💰 Cotización Total: {{total_estimate}} \n\n${paymentData ? '¿Te gustaría proceder con el pago?' : '¿Te gustaría confirmar el pedido?'}`,
        });
    }

    if (paymentData) {
        let payVar = 'total_estimate';
        // Logic for down payment calculation if needed
        if (paymentData.model === 'down' && quoteData) {
            const isFixed = paymentData.downType === 'fixed';
            const val = parseFloat(paymentData.downVal) || 0;
            const rule = isFixed ? { operation: 'assignment', value: val } : { operation: 'multiply', price: val / 100 };

            processSteps.push({
                id: 'step_calc_downpayment',
                type: 'action',
                action_type: 'calculate_custom',
                payload: {
                    rules: [rule],
                    input_var: 'total_estimate',
                    output_var: 'down_payment',
                    operation: rule.operation,
                    value: rule.value
                }
            });
            payVar = 'down_payment';
        }

        let amountText = paymentData.model === 'down'
            ? `💳 Total: {{total_estimate}} \n🔹 Anticipo Requerido: {{down_payment}}`
            : (quoteData ? `💳 Total a pagar: {{total_estimate}}` : '💳 Se calculará tu total.');

        processSteps.push({
            id: 'step_payment_info',
            type: 'message',
            media_url: paymentData.image_url || null,
            content: `¡Perfecto! Para completar tu pedido: \n\n${amountText} \n\n📝 Datos de Pago: \n${paymentData.instructions}`
        });

        if (paymentData.alert_admin) {
            processSteps.push({
                id: 'step_alert_admin',
                type: 'action',
                action_type: 'notify_admin',
                payload: {
                    message: `⚠️ PAGO REQUERIDO: Cliente solicitó orden (Flujo: ${trigger})`,
                    details: `${summaryVars} \nTotal: {{total_estimate}}`
                }
            });
        }
    }

    // Link process steps
    if (processSteps.length > 0) {
        processSteps.forEach((step, i) => {
            // First process step ID is always fixed to match the jump from requirements
            if (i === 0) step.id = 'step_process_start';

            if (i < processSteps.length - 1) step.next_step = processSteps[i + 1].id;
            else step.next_step = null;
        });
        steps.push(...processSteps);
    } else {
        // If no process steps, the last requirement step should end the flow or have a generic end
        const lastStep = steps[steps.length - 1];
        if (lastStep.next_step === 'step_process_start') {
            lastStep.next_step = null;
        }
    }

    return {
        id: flowId,
        trigger_keywords: trigger.split(',').map(k => k.trim()),
        steps: steps,
        metadata: { strategy: strategy }
    };
}


// Toggle JSON Editor Visibility
window.toggleJsonEditor = () => {
    const panel = document.getElementById('json-editor-panel');
    const btnText = document.getElementById('json-toggle-text');

    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        if (btnText) btnText.textContent = 'Ocultar Código';
    } else {
        panel.classList.add('hidden');
        if (btnText) btnText.textContent = 'Ver Código';
    }
};

// Prettify JSON
window.formatFlowJSON = () => {
    const editor = document.getElementById('flow-json-editor');
    try {
        const val = JSON.parse(editor.value);
        editor.value = JSON.stringify(val, null, 2);
    } catch (e) {
        window.showToast?.('JSON inválido', 'error');
    }
};

// Save Flow Logic
window.saveFlow = async (flowId) => {
    const useSimpleMode = !document.getElementById('simple-mode-ui').classList.contains('hidden');
    let triggerKeyword = '';
    let flowJson = '';
    let isActive = true;

    if (useSimpleMode) {
        // Harvest Simple Mode Data
        triggerKeyword = document.getElementById('simple-trigger').value.trim();

        const reqRows = document.querySelectorAll('#requirements-list > div');
        const requirements = Array.from(reqRows).map(row => ({
            label: row.querySelector('.req-label').value.trim(),
            type: row.querySelector('.req-type').value
        })).filter(r => r.label); // Filter empty

        // Harvest Checkboxes
        const harvest = window.harvestCheckboxes();
        const quoteData = harvest.quoteData;
        const paymentData = harvest.paymentData;

        if (!triggerKeyword) {
            window.showToast?.('Por favor escribe una palabra clave', 'error');
            return;
        }

        if (quoteData && !quoteData.productId && !quoteData.isAutoProduct) {
            window.showToast?.('Selecciona un producto o activa la detección automática', 'error');
            return;
        }

        const generatedFlow = simpleToSmartFlow(triggerKeyword, requirements, quoteData, paymentData);
        flowJson = JSON.stringify(generatedFlow, null, 2);
        isActive = true; // Default active in simple mode

    } else {
        // Harvest Advanced Mode Data
        triggerKeyword = document.getElementById('flow-trigger').value.trim();
        flowJson = document.getElementById('flow-json-editor').value;
        isActive = document.getElementById('flow-active').checked;

        if (!triggerKeyword) {
            window.showToast?.('Falta la palabra clave', 'error');
            return;
        }
        try {
            JSON.parse(flowJson); // Validate JSON
        } catch (e) {
            window.showToast?.('JSON inválido en el editor', 'error');
            return;
        }
    }


    try {
        window.showToast?.('Guardando flujo...', 'info');
        const userId = await window.getUserId();

        const payload = {
            user_id: userId,
            match_type: 'contains', // Always default to partial match for smart flows
            trigger_text: triggerKeyword,
            response_text: '[SMART_FLOW]',
            is_active: isActive,
            is_flow: true,
            flow_data: flowJson
        };

        let error;
        if (flowId) {
            const { error: err } = await window.auth.sb
                .from('auto_responses')
                .update(payload)
                .eq('id', flowId);
            error = err;
        } else {
            const { error: err } = await window.auth.sb
                .from('auto_responses')
                .insert([payload]);
            error = err;
        }

        if (error) throw error;

        window.showToast?.('¡Flujo guardado con éxito!', 'success');
        document.getElementById('flow-editor-modal').remove();

        // Refresh list
        initFlowBuilder(currentFlowContainerId);

    } catch (e) {
        console.error(e);
        window.showToast?.('Error al guardar el flujo', 'error');
    }
};

window.toggleFlowStatus = async (flowId, newStatus) => {
    try {
        const { error } = await window.auth.sb
            .from('auto_responses')
            .update({ is_active: newStatus })
            .eq('id', flowId);

        if (error) throw error;

        window.showToast?.(`Flujo ${newStatus ? 'activado' : 'desactivado'} `, 'success');
        // Refresh list
        initFlowBuilder(currentFlowContainerId);
    } catch (e) {
        console.error(e);
        window.showToast?.('Error al cambiar estado', 'error');
    }
};

window.deleteFlow = async (flowId) => {
    if (!confirm('¿Estás seguro de eliminar este flujo? Esta acción no se puede deshacer.')) return;

    try {
        const { error } = await window.auth.sb
            .from('auto_responses')
            .delete()
            .eq('id', flowId);

        if (error) throw error;

        window.showToast?.('Flujo eliminado', 'success');
        // Refresh list
        initFlowBuilder(currentFlowContainerId);
    } catch (e) {
        console.error(e);
        window.showToast?.('Error al eliminar flujo', 'error');
    }
};
