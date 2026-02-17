// ============================================================================
// FLOW MODES
// ============================================================================
export type FlowMode = 'get_all' | 'step_by_step';

// ============================================================================
// STEP TYPES
// ============================================================================
export type FlowStepType =
    | 'message'
    | 'question'
    | 'condition'
    | 'action'
    | 'wait_for_input'
    | 'context_check'
    | 'collect_image'        // NEW: Recolectar imágenes del usuario
    | 'read_image'           // NEW: Leer contenido de imagen con Vision AI
    | 'create_quote'         // NEW: Crear cotización con productos
    | 'send_payment_info'    // NEW: Enviar información de pago
    | 'trigger_critical'     // NEW: Activar modo crítico (humano)
    | 'create_task';         // NEW: Crear tarea/recordatorio

export interface FlowStep {
    id: string;
    type: FlowStepType;
    // If next_step is null, the flow ends (or waits for input)
    next_step: string | null;
}

export interface MessageStep extends FlowStep {
    type: 'message';
    content: string; // The text to send
    media_url?: string; // Optional media
    media_urls?: string[]; // Support for Gallery/Multiple Images
    dynamic_media_source?: 'product_gallery' | 'none'; // Source for dynamic media
}

export interface QuestionStep extends FlowStep {
    type: 'question';
    content: string;
    variable: string; // The variable name to store the answer in (e.g., 'client_name')
    validation?: {
        type: 'text' | 'number' | 'email' | 'image';
        error_message: string;
    };
}

export interface ConditionStep extends FlowStep {
    type: 'condition';
    variable: string; // The variable to check
    rules: {
        operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is_set';
        value?: string | number | boolean;
        next_step: string;
    }[];
    default_next_step: string;
}

export interface ActionStep extends FlowStep {
    type: 'action';
    action_type: 'notify_sales_team' | 'calculate_quote' | 'update_crm' | 'custom_script' | 'calculate_date' | 'calculate_custom' | 'notify_admin';
    payload: Record<string, any>;
}

export interface WaitForInputStep extends FlowStep {
    type: 'wait_for_input';
    // This step serves as a pause marker. The engine stops here until a new message arrives.
    variable?: string; // Optional variable to store the input
}

export interface ContextCheckStep extends FlowStep {
    type: 'context_check';
    check_type: 'previous_quotes' | 'previous_orders';
    time_window_hours?: number; // Default 24 hours
    product_match?: 'auto' | 'exact'; // How to match products
    ask_message: string; // Message to ask user (supports {{variables}})
    responses: Record<string, string>; // Map user responses to next steps
    on_not_found?: string; // Step to go to if no previous context found
}

// ============================================================================
// NEW STEP TYPES
// ============================================================================

/**
 * COLLECT_IMAGE Step
 * Espera a que el usuario envíe una o más imágenes
 */
export interface CollectImageStep extends FlowStep {
    type: 'collect_image';
    content: string; // Mensaje para pedir la imagen (ej: "Por favor envía tu diseño")
    variable: string; // Variable donde guardar la(s) URL(s) de imagen
    max_images?: number; // Máximo de imágenes a recolectar (default: 1)
    optional?: boolean; // Si es opcional (default: false)
    read_content?: boolean; // Si debe leer el contenido con Vision AI (default: false)
    timeout_seconds?: number; // Tiempo máximo de espera (default: 300 = 5min)
}

/**
 * READ_IMAGE Step
 * Lee el contenido de una imagen usando Vision AI (GPT-4 Vision, Claude Vision, etc)
 */
export interface ReadImageStep extends FlowStep {
    type: 'read_image';
    image_variable: string; // Variable que contiene la URL de la imagen
    output_variable: string; // Variable donde guardar la descripción
    prompt?: string; // Prompt personalizado para Vision AI (default: "Describe esta imagen en detalle")
    extract_text?: boolean; // Extraer texto de la imagen (OCR) (default: false)
    extract_json?: boolean; // Intentar extraer datos estructurados (default: false)
}

/**
 * CREATE_QUOTE Step
 * Crea una cotización con productos detectados o especificados
 */
export interface CreateQuoteStep extends FlowStep {
    type: 'create_quote';
    products: 'auto_detect' | 'from_variable' | 'manual'; // Cómo obtener productos
    product_ids_variable?: string; // Si products='from_variable', nombre de variable con IDs
    manual_product_ids?: string[]; // Si products='manual', lista de product IDs
    quantity_variable?: string; // Variable con cantidad (opcional)
    generate_pdf?: boolean; // Generar PDF de cotización (default: true)
    send_to_customer?: boolean; // Enviar cotización al cliente (default: true)
    notify_admin?: boolean; // Notificar al admin (default: false)
    output_variable?: string; // Variable donde guardar quote_id (default: 'quote_id')
}

/**
 * SEND_PAYMENT_INFO Step
 * Envía información de pago con placeholders seguros (no hardcodeado)
 */
export interface SendPaymentInfoStep extends FlowStep {
    type: 'send_payment_info';
    message_template: string; // Template con placeholders ej: "Transferir a {{bank_account}}"
    include_image?: boolean; // Incluir imagen de QR o comprobante (default: false)
    image_url_variable?: string; // Variable con URL de imagen (si include_image=true)
    payment_method?: 'transfer' | 'cash' | 'card' | 'paypal' | 'custom'; // Método de pago
}

/**
 * TRIGGER_CRITICAL Step
 * Marca la conversación como crítica y notifica a un humano
 */
export interface TriggerCriticalStep extends FlowStep {
    type: 'trigger_critical';
    reason: string; // Razón del crítico (ej: "Cliente solicitó hablar con gerente")
    pause_flow?: boolean; // Pausar el flow actual (default: true)
    add_label?: string; // Label a agregar al contacto (default: 'ignorar')
    notification_message?: string; // Mensaje personalizado para el admin
    auto_response?: string; // Respuesta automática al cliente (default: mensaje estándar)
}

/**
 * CREATE_TASK Step
 * Crea una tarea/recordatorio (diferente a citas)
 */
export interface CreateTaskStep extends FlowStep {
    type: 'create_task';
    task_title: string; // Título de la tarea (puede usar variables: "Entregar pedido a {{client_name}}")
    task_description?: string; // Descripción detallada
    due_date_variable?: string; // Variable con fecha de vencimiento
    due_date_offset_days?: number; // Días desde hoy (alternativa a due_date_variable)
    priority?: 'low' | 'medium' | 'high'; // Prioridad (default: 'medium')
    assign_to_user?: boolean; // Asignar al usuario dueño del flow (default: true)
    notify_on_create?: boolean; // Notificar al crear (default: false)
}

export type AnyFlowStep =
    | MessageStep
    | QuestionStep
    | ConditionStep
    | ActionStep
    | WaitForInputStep
    | ContextCheckStep
    | CollectImageStep
    | ReadImageStep
    | CreateQuoteStep
    | SendPaymentInfoStep
    | TriggerCriticalStep
    | CreateTaskStep;

export interface SmartFlow {
    id: string;
    name: string;
    trigger_keywords: string[];
    mode?: FlowMode; // NEW: Modo del flow (get_all o step_by_step)
    steps: AnyFlowStep[];
    variables: Record<string, any>; // Initial variables or context

    // NEW: Configuración específica del modo GET_ALL
    get_all_config?: {
        fields_to_collect: string[]; // Lista de campos a recolectar de una vez
        prompt_template?: string; // Template personalizado para pedir todos los datos
    };
}

export interface FlowState {
    flow_id: string;
    current_step_id: string;
    variables: Record<string, any>;
    status: 'active' | 'paused' | 'completed' | 'failed' | 'expired';
    last_updated: string;
    history: string[]; // Log of step IDs executed
    knowledge_base?: any[]; // Array of strings (FAQs, Notes) for the AI

    // Metadata temporal para gestión de estado
    metadata?: {
        is_transactional: boolean; // Si es cotización/pedido (se limpia al completar)
        should_persist: boolean; // Si debe guardarse permanentemente
        expires_at?: string; // Cuándo expira este estado
        language: 'es' | 'en'; // Idioma forzado para respuestas
        conversation_id?: string; // ID de conversación para limpieza
        contact_id?: number; // ID del contacto para búsqueda de historial
        quote_summary?: { // Resumen de cotización para referencia futura
            product: string;
            quantity: number;
            total: number;
            timestamp: string;
        };

        // NEW: Metadatos para nuevos step types
        collected_images?: { // Imágenes recolectadas por collect_image steps
            [variable_name: string]: {
                urls: string[];
                collected_at: string;
                read_content?: string; // Contenido leído por Vision AI
            };
        };
        created_quotes?: string[]; // IDs de cotizaciones creadas en este flow
        created_tasks?: string[]; // IDs de tareas creadas en este flow
        critical_triggered?: { // Si se activó modo crítico
            triggered_at: string;
            reason: string;
            step_id: string;
        };
    };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Resultado de validación de imagen
 */
export interface ImageValidationResult {
    valid: boolean;
    error?: string;
    url?: string;
    metadata?: {
        width?: number;
        height?: number;
        format?: string;
        size_bytes?: number;
    };
}

/**
 * Resultado de lectura de imagen con Vision AI
 */
export interface VisionReadResult {
    success: boolean;
    description?: string;
    extracted_text?: string;
    extracted_json?: Record<string, any>;
    error?: string;
    model_used?: string;
}
