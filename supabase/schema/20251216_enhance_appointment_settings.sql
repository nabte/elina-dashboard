-- ============================================
-- Mejorar configuración de citas con opciones avanzadas estilo Calendly
-- ============================================

-- 1. Agregar columna max_appointments_per_day
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_settings' 
        AND column_name = 'max_appointments_per_day'
    ) THEN
        ALTER TABLE public.appointment_settings 
        ADD COLUMN max_appointments_per_day integer;
        
        COMMENT ON COLUMN public.appointment_settings.max_appointments_per_day IS 'Máximo número de citas permitidas por día. NULL = sin límite';
        
        -- Agregar constraint: debe ser positivo si está definido
        ALTER TABLE public.appointment_settings
        ADD CONSTRAINT check_max_appointments_per_day 
        CHECK (max_appointments_per_day IS NULL OR max_appointments_per_day > 0);
    END IF;
END $$;

-- 2. Agregar columna business_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_settings' 
        AND column_name = 'business_type'
    ) THEN
        ALTER TABLE public.appointment_settings 
        ADD COLUMN business_type text DEFAULT 'both';
        
        COMMENT ON COLUMN public.appointment_settings.business_type IS 'Tipo de negocio: ecommerce (productos físicos), services (servicios), both (ambos)';
        
        -- Agregar constraint: valores permitidos
        ALTER TABLE public.appointment_settings
        ADD CONSTRAINT check_business_type 
        CHECK (business_type IN ('ecommerce', 'services', 'both'));
    END IF;
END $$;

