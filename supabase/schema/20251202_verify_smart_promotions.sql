-- ============================================
-- Script para Verificar/Crear tabla smart_promotions
-- ============================================

-- 1. Verificar si la tabla existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'smart_promotions') THEN
        RAISE NOTICE 'Tabla smart_promotions NO existe. Creándola...';
        
        CREATE TABLE public.smart_promotions (
            id uuid primary key default uuid_generate_v4(),
            user_id uuid not null references auth.users(id) on delete cascade,
            title text not null,
            description text,
            benefits text,
            call_to_action text,
            discount text,  -- Campo adicional para descuentos
            offer text,     -- Campo adicional para ofertas
            image_urls text[] default '{}',
            start_at timestamptz,
            end_at timestamptz,
            no_schedule boolean default false,
            is_active boolean default true,
            auto_insert boolean default true,
            max_mentions_per_day int default 3,
            created_at timestamptz not null default timezone('utc', now()),
            updated_at timestamptz not null default timezone('utc', now()),
            last_triggered_at timestamptz,
            trigger_count int default 0
        );

        CREATE INDEX IF NOT EXISTS smart_promotions_user_idx 
            ON public.smart_promotions (user_id, is_active, start_at);

        CREATE OR REPLACE TRIGGER trg_smart_promotions_updated_at
            BEFORE UPDATE ON public.smart_promotions
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();

        ALTER TABLE public.smart_promotions ENABLE ROW LEVEL SECURITY;

        -- Políticas RLS
        CREATE POLICY "Users can view their own smart_promotions"
            ON public.smart_promotions FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can create smart_promotions"
            ON public.smart_promotions FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own smart_promotions"
            ON public.smart_promotions FOR UPDATE
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own smart_promotions"
            ON public.smart_promotions FOR DELETE
            USING (auth.uid() = user_id);

        RAISE NOTICE '✅ Tabla smart_promotions creada exitosamente';
    ELSE
        RAISE NOTICE '✅ Tabla smart_promotions ya existe';
        
        -- Verificar si faltan columnas discount y offer
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'smart_promotions' 
              AND column_name = 'discount'
        ) THEN
            ALTER TABLE public.smart_promotions ADD COLUMN discount text;
            RAISE NOTICE '✅ Columna discount agregada';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'smart_promotions' 
              AND column_name = 'offer'
        ) THEN
            ALTER TABLE public.smart_promotions ADD COLUMN offer text;
            RAISE NOTICE '✅ Columna offer agregada';
        END IF;
    END IF;
END $$;

-- 2. Verificar estructura actual
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'smart_promotions'
ORDER BY ordinal_position;

-- 3. Verificar políticas RLS
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'smart_promotions';

-- 4. Contar promociones existentes
SELECT 
    COUNT(*) as total_promociones,
    COUNT(*) FILTER (WHERE is_active = true) as promociones_activas,
    COUNT(*) FILTER (WHERE is_active = false) as promociones_inactivas
FROM public.smart_promotions;

