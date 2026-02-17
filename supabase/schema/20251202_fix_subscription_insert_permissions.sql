-- ============================================
-- Fix: Permitir que usuarios autenticados inserten sus propias suscripciones de prueba
-- ============================================

-- Verificar si la tabla subscriptions existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        RAISE NOTICE 'Tabla subscriptions no existe, creándola...';
        
        CREATE TABLE public.subscriptions (
            id uuid primary key default uuid_generate_v4(),
            user_id uuid not null references auth.users(id) on delete cascade,
            plan_type text default 'trial',
            trial_ends_at timestamptz,
            status text default 'active',
            created_at timestamptz not null default timezone('utc', now()),
            updated_at timestamptz not null default timezone('utc', now())
        );

        CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions (user_id);
        
        ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
        
        -- Política para que usuarios puedan insertar sus propias suscripciones
        CREATE POLICY "Users can insert their own subscriptions"
            ON public.subscriptions FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        
        -- Política para que usuarios puedan ver sus propias suscripciones
        CREATE POLICY "Users can view their own subscriptions"
            ON public.subscriptions FOR SELECT
            USING (auth.uid() = user_id);
        
        -- Política para que usuarios puedan actualizar sus propias suscripciones
        CREATE POLICY "Users can update their own subscriptions"
            ON public.subscriptions FOR UPDATE
            USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Tabla subscriptions creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla subscriptions ya existe';
    END IF;
END $$;

-- Asegurar que la política de INSERT existe (por si ya existía la tabla)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'subscriptions' 
          AND policyname = 'Users can insert their own subscriptions'
    ) THEN
        CREATE POLICY "Users can insert their own subscriptions"
            ON public.subscriptions FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE 'Política de INSERT agregada a subscriptions';
    ELSE
        RAISE NOTICE 'Política de INSERT ya existe en subscriptions';
    END IF;
END $$;

-- Verificar permisos en la función is_superadmin
DO $$
BEGIN
    -- Asegurar que authenticated tiene permisos
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
        GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;
        RAISE NOTICE 'Permisos de is_superadmin actualizados';
    ELSE
        RAISE NOTICE 'Función is_superadmin no existe';
    END IF;
END $$;

