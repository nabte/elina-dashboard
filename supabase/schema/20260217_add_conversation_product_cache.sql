-- ============================================
-- Cache de productos mencionados en conversaciones
-- Para mantener FAQs y contexto disponible en follow-up questions
-- ============================================

-- Tabla para cachear productos mencionados recientemente
CREATE TABLE IF NOT EXISTS public.conversation_product_cache (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id bigint NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

    -- Snapshot del producto en el momento de mención (para evitar joins)
    product_snapshot jsonb NOT NULL,

    -- Metadata
    mentioned_at timestamptz NOT NULL DEFAULT NOW(),
    last_accessed_at timestamptz NOT NULL DEFAULT NOW(),

    -- Índices
    CONSTRAINT conversation_product_cache_unique UNIQUE (user_id, contact_id, product_id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_conversation_product_cache_user_contact
ON public.conversation_product_cache(user_id, contact_id, mentioned_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_product_cache_last_accessed
ON public.conversation_product_cache(last_accessed_at DESC);

-- RLS Policies
ALTER TABLE public.conversation_product_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own product cache"
ON public.conversation_product_cache
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product cache"
ON public.conversation_product_cache
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product cache"
ON public.conversation_product_cache
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product cache"
ON public.conversation_product_cache
FOR DELETE
USING (auth.uid() = user_id);

-- Función para limpiar cache antiguo (mantener solo últimos 30 días por contacto)
CREATE OR REPLACE FUNCTION cleanup_old_product_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Eliminar productos no accedidos en más de 30 días
    DELETE FROM public.conversation_product_cache
    WHERE last_accessed_at < NOW() - INTERVAL '30 days';

    -- Por cada user_id + contact_id, mantener solo los últimos 10 productos mencionados
    WITH ranked_cache AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, contact_id
                   ORDER BY mentioned_at DESC
               ) as rn
        FROM public.conversation_product_cache
    )
    DELETE FROM public.conversation_product_cache
    WHERE id IN (
        SELECT id FROM ranked_cache WHERE rn > 10
    );
END;
$$;

-- Comentarios
COMMENT ON TABLE public.conversation_product_cache IS 'Cache de productos mencionados en conversaciones para mantener contexto (FAQs, descripciones) disponible en follow-up questions';
COMMENT ON COLUMN public.conversation_product_cache.product_snapshot IS 'Snapshot completo del producto (name, price, description, enhanced_description, faq, benefits, etc.) para evitar joins';
COMMENT ON COLUMN public.conversation_product_cache.mentioned_at IS 'Timestamp cuando el producto fue mencionado por primera vez';
COMMENT ON COLUMN public.conversation_product_cache.last_accessed_at IS 'Timestamp del último acceso/mención del producto en la conversación';
