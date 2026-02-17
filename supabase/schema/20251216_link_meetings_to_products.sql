-- ============================================
-- Vincular citas (meetings) con productos/servicios
-- ============================================

-- Agregar columna product_id a meetings para vincular con servicios
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'meetings' 
        AND column_name = 'product_id'
    ) THEN
        ALTER TABLE public.meetings 
        ADD COLUMN product_id bigint;
        
        COMMENT ON COLUMN public.meetings.product_id IS 'ID del producto/servicio asociado a esta cita. Si es un servicio, se usa su duración automáticamente';
        
        -- Agregar foreign key a products (opcional, puede ser NULL)
        -- Nota: No agregamos constraint de foreign key porque product_id puede ser NULL
        -- y la relación es opcional (una cita puede no tener un producto asociado)
    END IF;
END $$;

-- Agregar índice para búsquedas por producto
CREATE INDEX IF NOT EXISTS idx_meetings_product_id ON public.meetings(product_id) WHERE product_id IS NOT NULL;

