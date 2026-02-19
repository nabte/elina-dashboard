-- ============================================
-- Agregar enhanced_description para descripciones mejoradas por IA
-- ============================================

-- Agregar columna enhanced_description (opcional, se genera automáticamente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'enhanced_description'
    ) THEN
        ALTER TABLE public.products
        ADD COLUMN enhanced_description text;

        COMMENT ON COLUMN public.products.enhanced_description IS 'Descripción mejorada/embellecida por IA para presentar al cliente. Si es NULL, se usa description.';
    END IF;
END $$;

-- Índice para búsqueda full-text en enhanced_description
CREATE INDEX IF NOT EXISTS idx_products_enhanced_description_search
ON public.products
USING gin(to_tsvector('spanish', COALESCE(enhanced_description, '')));
