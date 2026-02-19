-- ============================================================================
-- AGENT PERSONALITIES SYSTEM
-- Sistema completo de personalidades de agente con integración de herramientas
-- ============================================================================

-- Tabla principal: Personalidades activas por usuario
CREATE TABLE IF NOT EXISTS agent_personalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Tipo de personalidad seleccionada
    personality_type TEXT NOT NULL CHECK (personality_type IN (
        'seller',              -- Vendedor directo (ecommerce)
        'consultant',          -- Consultor (educación + venta)
        'closer',              -- Closer de citas (servicios profesionales)
        'high_ticket',         -- High ticket (venta consultiva larga)
        'emotional_support',   -- Soporte emocional (terapia, coaching)
        'customer_service'     -- Servicio al cliente (soporte técnico)
    )),

    -- Estado del setup
    is_active BOOLEAN DEFAULT true,
    setup_completed BOOLEAN DEFAULT false,

    -- Análisis del negocio (generado por IA)
    business_analysis JSONB DEFAULT '{}'::jsonb,
    /* Estructura:
    {
        "business_type": "estilista",
        "services": ["corte", "tinte", "tratamiento"],
        "schedule": {"monday": "9-18", ...},
        "session_duration": 90,
        "key_insights": ["trabaja sola", "alta demanda fines de semana"]
    }
    */

    -- Configuración personalizada
    config JSONB DEFAULT '{}'::jsonb,
    /* Estructura:
    {
        "prompt_additions": "...",
        "enabled_tools": ["products", "appointments"],
        "disabled_tools": ["web_search"],
        "auto_behaviors": {
            "auto_suggest_products": true,
            "auto_create_followups": false,
            "auto_apply_tags": true
        },
        "response_style": "concise",
        "max_response_length": 500
    }
    */

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraint: Solo una personalidad activa por usuario
    CONSTRAINT one_active_personality_per_user UNIQUE (user_id, is_active)
);

-- Índices para performance
CREATE INDEX idx_agent_personalities_user ON agent_personalities(user_id);
CREATE INDEX idx_agent_personalities_active ON agent_personalities(user_id, is_active)
WHERE is_active = true;

-- ============================================================================
-- FLOWS AUTOMÁTICOS POR PERSONALIDAD
-- ============================================================================

CREATE TABLE IF NOT EXISTS personality_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personality_id UUID NOT NULL REFERENCES agent_personalities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Info del flow
    flow_name TEXT NOT NULL,
    flow_description TEXT,
    trigger_keywords TEXT[],
    priority INTEGER DEFAULT 0,  -- Orden de ejecución si múltiples matches

    -- Configuración del flow
    flow_config JSONB NOT NULL,
    /* Estructura:
    {
        "steps": [
            {
                "type": "message",
                "content": "¡Perfecto! ¿Para qué servicio quieres agendar?"
            },
            {
                "type": "capture_input",
                "save_as": "selected_service",
                "validation": "required"
            },
            {
                "type": "tool_call",
                "tool": "get_available_slots",
                "params": {"service_id": "{selected_service}"}
            },
            {
                "type": "message",
                "content": "Tengo estos horarios: [SLOTS]"
            }
        ]
    }
    */

    -- Estado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personality_flows_user ON personality_flows(user_id, is_active);
CREATE INDEX idx_personality_flows_personality ON personality_flows(personality_id);

-- ============================================================================
-- PRESET RESPONSES (FAQs) - Integración con sistema existente
-- ============================================================================

-- Crear tabla preset_responses si no existe
CREATE TABLE IF NOT EXISTS preset_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Trigger y respuesta
    trigger_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    match_type TEXT DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'starts_with', 'ends_with')),

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Extender tabla preset_responses con referencia a personality
ALTER TABLE preset_responses
ADD COLUMN IF NOT EXISTS personality_id UUID REFERENCES agent_personalities(id) ON DELETE CASCADE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_preset_responses_user ON preset_responses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_preset_responses_personality
ON preset_responses(personality_id) WHERE personality_id IS NOT NULL;

-- RLS para preset_responses
ALTER TABLE preset_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preset responses" ON preset_responses;
CREATE POLICY "Users can manage own preset responses"
ON preset_responses FOR ALL
USING (auth.uid() = user_id);

-- ============================================================================
-- AUTO-TAGS CONFIG - Integración con sistema de etiquetas IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS personality_auto_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personality_id UUID NOT NULL REFERENCES agent_personalities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Configuración de la etiqueta
    tag_name TEXT NOT NULL,
    description TEXT,
    trigger_patterns TEXT[],  -- Keywords o frases que activan esta etiqueta

    -- Condiciones
    conditions JSONB DEFAULT '{}'::jsonb,
    /* Estructura:
    {
        "message_contains": ["urgente", "ahorita"],
        "message_count_min": 3,
        "sentiment": "negative"
    }
    */

    -- Estado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personality_auto_tags_user ON personality_auto_tags(user_id, is_active);

-- ============================================================================
-- FOLLOWUP TEMPLATES - Templates de seguimiento automático
-- ============================================================================

CREATE TABLE IF NOT EXISTS personality_followup_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personality_id UUID NOT NULL REFERENCES agent_personalities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Info del template
    template_name TEXT NOT NULL,
    description TEXT,

    -- Configuración del seguimiento
    trigger_event TEXT NOT NULL,  -- 'appointment_booked', 'no_show', 'post_sale', etc.
    delay_hours INTEGER NOT NULL DEFAULT 24,  -- Cuándo enviar después del evento

    -- Mensaje del seguimiento
    message_template TEXT NOT NULL,
    /* Puede incluir placeholders:
       "Hola {contact_name}, recordatorio: mañana {appointment_time} tenemos tu cita 📅"
    */

    -- Condiciones opcionales
    conditions JSONB DEFAULT '{}'::jsonb,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personality_followup_templates_user
ON personality_followup_templates(user_id, is_active);

-- ============================================================================
-- RAG DOCUMENTS - Documentos sugeridos por personalidad
-- ============================================================================

CREATE TABLE IF NOT EXISTS personality_rag_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personality_id UUID NOT NULL REFERENCES agent_personalities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Info del documento
    title TEXT NOT NULL,
    category TEXT,  -- 'cuidados', 'politicas', 'productos_recomendados'
    content_template TEXT,  -- Template generado por IA que el usuario puede editar

    -- Estado
    status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'rejected')),

    -- Si se acepta, se vincula al documento RAG real
    rag_document_id UUID,  -- FK a tabla de RAG cuando exista

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personality_rag_user ON personality_rag_suggestions(user_id);

-- ============================================================================
-- AUDIT LOG - Registro de cambios en personalidades
-- ============================================================================

CREATE TABLE IF NOT EXISTS personality_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personality_id UUID REFERENCES agent_personalities(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Evento
    event_type TEXT NOT NULL,  -- 'created', 'activated', 'deactivated', 'config_changed'
    event_data JSONB,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personality_audit_log_user ON personality_audit_log(user_id, created_at DESC);

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para activar una personalidad (desactiva las demás)
CREATE OR REPLACE FUNCTION activate_personality(p_personality_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Desactivar todas las personalidades del usuario
    UPDATE agent_personalities
    SET is_active = false,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Activar la seleccionada
    UPDATE agent_personalities
    SET is_active = true,
        updated_at = now()
    WHERE id = p_personality_id AND user_id = p_user_id;

    -- Log del evento
    INSERT INTO personality_audit_log (personality_id, user_id, event_type, event_data)
    VALUES (p_personality_id, p_user_id, 'activated', jsonb_build_object('activated_at', now()));
END;
$$;

-- Función para obtener personalidad activa de un usuario
CREATE OR REPLACE FUNCTION get_active_personality(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    personality_type TEXT,
    config JSONB,
    business_analysis JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id, personality_type, config, business_analysis
    FROM agent_personalities
    WHERE user_id = p_user_id
    AND is_active = true
    LIMIT 1;
$$;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE agent_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_auto_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_followup_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_rag_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas: Los usuarios solo ven sus propias personalidades
CREATE POLICY "Users can view own personalities"
ON agent_personalities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personalities"
ON agent_personalities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personalities"
ON agent_personalities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personalities"
ON agent_personalities FOR DELETE
USING (auth.uid() = user_id);

-- Políticas similares para las demás tablas
CREATE POLICY "Users can manage own personality flows"
ON personality_flows FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own personality tags"
ON personality_auto_tags FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own followup templates"
ON personality_followup_templates FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own RAG suggestions"
ON personality_rag_suggestions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own audit log"
ON personality_audit_log FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA: Insertar presets predefinidos en una tabla de catálogo
-- ============================================================================

-- Nota: Los presets se definirán en código TypeScript y se usarán
-- durante el wizard de setup para crear personalidades personalizadas
