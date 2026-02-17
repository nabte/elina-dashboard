-- ============================================
-- Agregar soporte para servicios con duración en productos
-- ============================================

-- 1. Agregar columna product_type (enum: 'physical', 'service')
DO $$
BEGIN
    -- Crear tipo enum si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type_enum') THEN
        CREATE TYPE public.product_type_enum AS ENUM ('physical', 'service');
    END IF;
    
    -- Agregar columna product_type si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN product_type public.product_type_enum NOT NULL DEFAULT 'physical';
        
        COMMENT ON COLUMN public.products.product_type IS 'Tipo de producto: physical (producto físico) o service (servicio con duración)';
    END IF;
END $$;

-- 2. Agregar columna service_duration_minutes (solo para servicios)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'service_duration_minutes'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN service_duration_minutes integer;
        
        COMMENT ON COLUMN public.products.service_duration_minutes IS 'Duración del servicio en minutos. Solo aplica cuando product_type = service';
        
        -- Agregar constraint: service_duration_minutes debe ser > 0 si product_type = 'service'
        ALTER TABLE public.products
        ADD CONSTRAINT check_service_duration 
        CHECK (
            (product_type = 'service' AND service_duration_minutes IS NOT NULL AND service_duration_minutes > 0)
            OR (product_type = 'physical' AND service_duration_minutes IS NULL)
        );
    END IF;
END $$;

-- 3. Agregar índice para búsquedas de servicios
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type) WHERE product_type = 'service';
CREATE INDEX IF NOT EXISTS idx_products_service_duration ON public.products(service_duration_minutes) WHERE product_type = 'service';

