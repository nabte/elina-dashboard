export type FlowStepType = 'message' | 'question' | 'condition' | 'action' | 'wait_for_input' | 'context_check';

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

export type AnyFlowStep = MessageStep | QuestionStep | ConditionStep | ActionStep | WaitForInputStep | ContextCheckStep;

export interface SmartFlow {
    id: string;
    name: string;
    trigger_keywords: string[];
    steps: AnyFlowStep[];
    variables: Record<string, any>; // Initial variables or context
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
    };
}
