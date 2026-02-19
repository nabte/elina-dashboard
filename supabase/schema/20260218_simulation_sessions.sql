-- ============================================
-- Sistema de Simulación de Chat con Persistencia
-- ============================================
--
-- Permite guardar sesiones de simulación para:
-- - No perder historial al recargar página
-- - Comparar diferentes versiones de prompts
-- - Analizar qué respuestas funcionan bien/mal
-- - Mejorar prompts automáticamente basado en feedback
--

-- 1. Tabla: simulation_sessions
-- Almacena sesiones de simulación del usuario
CREATE TABLE IF NOT EXISTS simulation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_name TEXT,                          -- "Prueba de productos 1", generado automático si null
    prompt_version_id UUID REFERENCES prompt_versions(id), -- Qué versión del prompt se usó
    draft_prompt TEXT,                          -- Si usó draft en lugar de oficial
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    total_messages INTEGER DEFAULT 0,
    good_examples_count INTEGER DEFAULT 0,
    bad_examples_count INTEGER DEFAULT 0
);

COMMENT ON TABLE simulation_sessions IS 'Sesiones de simulación de chat para probar prompts sin conectar WhatsApp real';
COMMENT ON COLUMN simulation_sessions.session_name IS 'Nombre de la sesión (ej: "Simulación 18/2/26 14:30")';
COMMENT ON COLUMN simulation_sessions.prompt_version_id IS 'Versión del prompt usada en esta sesión';
COMMENT ON COLUMN simulation_sessions.draft_prompt IS 'Contenido del prompt si se usó draft (no publicado)';
COMMENT ON COLUMN simulation_sessions.total_messages IS 'Total de mensajes (user + assistant) en la sesión';
COMMENT ON COLUMN simulation_sessions.good_examples_count IS 'Cantidad de mensajes marcados con "Me gusta" (👍)';
COMMENT ON COLUMN simulation_sessions.bad_examples_count IS 'Cantidad de mensajes marcados con "No me gusta" (👎)';

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_user ON simulation_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_prompt_version ON simulation_sessions(prompt_version_id);

-- 2. Tabla: simulation_messages
-- Almacena cada mensaje de las sesiones
CREATE TABLE IF NOT EXISTS simulation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,                             -- { media_url, intent, tool_calls, etc }
    feedback TEXT CHECK (feedback IN ('good', 'bad', NULL)), -- Like/dislike
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE simulation_messages IS 'Mensajes individuales de cada sesión de simulación';
COMMENT ON COLUMN simulation_messages.role IS 'Rol del mensaje: "user" o "assistant"';
COMMENT ON COLUMN simulation_messages.metadata IS 'Información adicional: URLs de media, intent detectado, tool calls usados, etc.';
COMMENT ON COLUMN simulation_messages.feedback IS 'Feedback del usuario: "good" (👍), "bad" (👎), o NULL (sin feedback)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_simulation_messages_session ON simulation_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_simulation_messages_feedback ON simulation_messages(user_id, feedback) WHERE feedback IS NOT NULL;

-- 3. Actualizar tabla training_examples
-- Agregar columna para vincular con sesión de simulación
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'training_examples'
        AND column_name = 'simulation_session_id'
    ) THEN
        ALTER TABLE training_examples
        ADD COLUMN simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE SET NULL;

        COMMENT ON COLUMN training_examples.simulation_session_id IS 'Sesión de simulación de donde se guardó este ejemplo';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_examples_session ON training_examples(simulation_session_id);

-- 4. Función auxiliar: Incrementar contadores
CREATE OR REPLACE FUNCTION increment_session_counter(
    p_session_id UUID,
    p_field TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF p_field = 'good_examples_count' THEN
        UPDATE simulation_sessions
        SET good_examples_count = good_examples_count + 1,
            updated_at = now()
        WHERE id = p_session_id;
    ELSIF p_field = 'bad_examples_count' THEN
        UPDATE simulation_sessions
        SET bad_examples_count = bad_examples_count + 1,
            updated_at = now()
        WHERE id = p_session_id;
    ELSIF p_field = 'total_messages' THEN
        UPDATE simulation_sessions
        SET total_messages = total_messages + 1,
            updated_at = now()
        WHERE id = p_session_id;
    END IF;
END;
$$;

COMMENT ON FUNCTION increment_session_counter IS 'Incrementa contadores de sesión (good_examples_count, bad_examples_count, total_messages)';

-- 5. Row Level Security (RLS)
ALTER TABLE simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para simulation_sessions
DROP POLICY IF EXISTS "Users can view their own simulation sessions" ON simulation_sessions;
CREATE POLICY "Users can view their own simulation sessions"
    ON simulation_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own simulation sessions" ON simulation_sessions;
CREATE POLICY "Users can insert their own simulation sessions"
    ON simulation_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own simulation sessions" ON simulation_sessions;
CREATE POLICY "Users can update their own simulation sessions"
    ON simulation_sessions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own simulation sessions" ON simulation_sessions;
CREATE POLICY "Users can delete their own simulation sessions"
    ON simulation_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para simulation_messages
DROP POLICY IF EXISTS "Users can view their own simulation messages" ON simulation_messages;
CREATE POLICY "Users can view their own simulation messages"
    ON simulation_messages FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own simulation messages" ON simulation_messages;
CREATE POLICY "Users can insert their own simulation messages"
    ON simulation_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own simulation messages" ON simulation_messages;
CREATE POLICY "Users can update their own simulation messages"
    ON simulation_messages FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own simulation messages" ON simulation_messages;
CREATE POLICY "Users can delete their own simulation messages"
    ON simulation_messages FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Permisos para función increment_session_counter
REVOKE ALL ON FUNCTION increment_session_counter(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_session_counter(UUID, TEXT) TO authenticated, anon;
