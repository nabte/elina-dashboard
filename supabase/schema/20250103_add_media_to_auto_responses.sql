-- Agregar campos para soporte de archivos multimedia en auto_responses
ALTER TABLE auto_responses
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video', 'audio', 'document')),
ADD COLUMN IF NOT EXISTS response_regex TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN auto_responses.media_url IS 'URL del archivo multimedia (imagen, video, audio, documento) a enviar con la respuesta';
COMMENT ON COLUMN auto_responses.media_type IS 'Tipo de media: text (solo texto), image, video, audio, document';
COMMENT ON COLUMN auto_responses.response_regex IS 'Regex opcional para detectar dinámicamente el tipo de respuesta basado en el mensaje del usuario';

