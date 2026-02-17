-- ============================================
-- Verificación y Creación de Tablas Faltantes
-- ============================================
-- Este script verifica y crea las tablas que pueden estar faltando
-- Ejecuta esto si ves errores de "tabla no encontrada"

-- ============================================
-- 0. Crear función set_updated_at() si no existe
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$;

-- ============================================
-- 1. Verificar/Crear tabla conversation_states
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_states') THEN
        CREATE TABLE public.conversation_states (
            id bigint generated always as identity primary key,
            contact_id bigint not null references public.contacts(id) on delete cascade,
            user_id uuid not null references auth.users(id) on delete cascade,
            is_paused boolean default false,
            pause_reason text,
            paused_at timestamptz,
            paused_by uuid references auth.users(id),
            resumed_at timestamptz,
            resumed_by uuid references auth.users(id),
            metadata jsonb default '{}',
            created_at timestamptz default timezone('utc', now()) not null,
            updated_at timestamptz default timezone('utc', now()) not null,
            unique(contact_id)
        );

        CREATE INDEX IF NOT EXISTS conversation_states_contact_idx ON public.conversation_states (contact_id);
        CREATE INDEX IF NOT EXISTS conversation_states_user_idx ON public.conversation_states (user_id, is_paused);
        CREATE INDEX IF NOT EXISTS conversation_states_paused_idx ON public.conversation_states (is_paused, paused_at) WHERE is_paused = true;

        CREATE OR REPLACE TRIGGER trg_conversation_states_updated_at
            BEFORE UPDATE ON public.conversation_states
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();

        ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view conversation states of their contacts"
            ON public.conversation_states FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert conversation states for their contacts"
            ON public.conversation_states FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update conversation states of their contacts"
            ON public.conversation_states FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete conversation states of their contacts"
            ON public.conversation_states FOR DELETE
            USING (auth.uid() = user_id);

        RAISE NOTICE 'Tabla conversation_states creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla conversation_states ya existe';
    END IF;
END $$;

-- ============================================
-- 2. Verificar/Crear tabla smart_promotions
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'smart_promotions') THEN
        CREATE TABLE public.smart_promotions (
            id uuid primary key default uuid_generate_v4(),
            user_id uuid not null references auth.users(id) on delete cascade,
            title text not null,
            description text,
            benefits text,
            call_to_action text,
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

        CREATE INDEX IF NOT EXISTS smart_promotions_user_idx ON public.smart_promotions (user_id, is_active, start_at);

        CREATE OR REPLACE TRIGGER trg_smart_promotions_updated_at
            BEFORE UPDATE ON public.smart_promotions
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();

        ALTER TABLE public.smart_promotions ENABLE ROW LEVEL SECURITY;

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

        RAISE NOTICE 'Tabla smart_promotions creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla smart_promotions ya existe';
    END IF;
END $$;

-- ============================================
-- 3. Verificar/Crear tabla sales_prompts
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_prompts') THEN
        CREATE TABLE public.sales_prompts (
            id uuid primary key default uuid_generate_v4(),
            user_id uuid not null references auth.users(id) on delete cascade,
            title text not null,
            prompt jsonb not null default '{}',
            is_active boolean default true,
            auto_generate_responses boolean default true,
            created_at timestamptz not null default timezone('utc', now()),
            updated_at timestamptz not null default timezone('utc', now())
        );

        CREATE INDEX IF NOT EXISTS sales_prompts_user_active_idx ON public.sales_prompts (user_id, is_active, updated_at);

        CREATE OR REPLACE TRIGGER trg_sales_prompts_updated_at
            BEFORE UPDATE ON public.sales_prompts
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();

        ALTER TABLE public.sales_prompts ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their own sales_prompts"
            ON public.sales_prompts FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can create sales_prompts"
            ON public.sales_prompts FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own sales_prompts"
            ON public.sales_prompts FOR UPDATE
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own sales_prompts"
            ON public.sales_prompts FOR DELETE
            USING (auth.uid() = user_id);

        RAISE NOTICE 'Tabla sales_prompts creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla sales_prompts ya existe';
        -- Agregar columna auto_generate_responses si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sales_prompts' 
            AND column_name = 'auto_generate_responses'
        ) THEN
            ALTER TABLE public.sales_prompts 
            ADD COLUMN auto_generate_responses boolean default true;
            RAISE NOTICE 'Columna auto_generate_responses agregada a sales_prompts';
        END IF;
    END IF;
END $$;

-- ============================================
-- 4. Forzar actualización del schema cache de PostgREST
-- ============================================
-- Nota: Esto puede requerir reiniciar el servicio de PostgREST
-- o esperar a que se actualice automáticamente (puede tardar unos minutos)

-- Verificar que las tablas existen
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('conversation_states', 'smart_promotions', 'sales_prompts')
ORDER BY tablename;

