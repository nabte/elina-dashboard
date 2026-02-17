-- ============================================
-- Configuración de Búsqueda de Productos
-- Agrega campos para controlar el modo de búsqueda (estricto vs flexible)
-- y el umbral mínimo de relevancia
-- ============================================

-- Agregar campos de configuración de búsqueda a tabla profiles
DO $$
BEGIN
    -- Agregar product_search_strict_mode
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'product_search_strict_mode'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN product_search_strict_mode boolean DEFAULT false;
        
        COMMENT ON COLUMN public.profiles.product_search_strict_mode IS 'Modo estricto de búsqueda: true = solo coincidencias exactas de códigos, false = permite coincidencias parciales (default)';
    END IF;

    -- Agregar product_search_min_score
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'product_search_min_score'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN product_search_min_score real DEFAULT 0.3;
        
        COMMENT ON COLUMN public.profiles.product_search_min_score IS 'Umbral mínimo de relevancia (0-1) para aceptar resultados de búsqueda. Default: 0.3';
    END IF;
END $$;

-- Crear índice para búsquedas rápidas por configuración
CREATE INDEX IF NOT EXISTS profiles_search_config_idx ON public.profiles (product_search_strict_mode) WHERE product_search_strict_mode = true;

