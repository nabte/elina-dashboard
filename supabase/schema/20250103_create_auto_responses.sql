-- Crear tabla auto_responses para respuestas automáticas basadas en triggers de texto
CREATE TABLE IF NOT EXISTS auto_responses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    trigger_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    match_type TEXT DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear índice para búsquedas rápidas por usuario y estado activo
CREATE INDEX IF NOT EXISTS idx_auto_responses_user_active ON auto_responses(user_id, is_active) WHERE is_active = true;

-- Crear índice para búsquedas de texto (para match_type contains)
CREATE INDEX IF NOT EXISTS idx_auto_responses_trigger_text ON auto_responses USING gin(to_tsvector('spanish', trigger_text));

-- Habilitar RLS
ALTER TABLE auto_responses ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo pueden ver sus propias respuestas automáticas
CREATE POLICY "Users can view their own auto responses"
    ON auto_responses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política RLS: Los usuarios solo pueden insertar sus propias respuestas automáticas
CREATE POLICY "Users can insert their own auto responses"
    ON auto_responses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política RLS: Los usuarios solo pueden actualizar sus propias respuestas automáticas
CREATE POLICY "Users can update their own auto responses"
    ON auto_responses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política RLS: Los usuarios solo pueden eliminar sus propias respuestas automáticas
CREATE POLICY "Users can delete their own auto responses"
    ON auto_responses
    FOR DELETE
    USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_auto_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_auto_responses_updated_at_trigger
    BEFORE UPDATE ON auto_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_responses_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE auto_responses IS 'Tabla para almacenar respuestas automáticas basadas en triggers de texto';
COMMENT ON COLUMN auto_responses.trigger_text IS 'Texto que activa la respuesta automática';
COMMENT ON COLUMN auto_responses.response_text IS 'Texto de respuesta que se enviará cuando se detecte el trigger';
COMMENT ON COLUMN auto_responses.match_type IS 'Tipo de coincidencia: exact (coincidencia exacta) o contains (contiene el texto)';
COMMENT ON COLUMN auto_responses.is_active IS 'Indica si la respuesta automática está activa';

