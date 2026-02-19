-- ============================================
-- Agregar campos de Resumen Diario y Notificaciones
-- ============================================
-- Fecha: 2026-02-17
-- Propósito:
--   1. Resumen diario del negocio enviado por WhatsApp
--   2. Notificaciones de errores por email

-- ============================================
-- 1. Agregar campos a profiles
-- ============================================
DO $$
BEGIN
    -- Campo: daily_summary_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'daily_summary_enabled'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN daily_summary_enabled boolean DEFAULT false;
    END IF;

    -- Campo: daily_summary_time (hora del día en formato HH:MM)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'daily_summary_time'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN daily_summary_time time DEFAULT '20:00:00';
    END IF;

    -- Campo: notification_email (para alertas de errores)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'notification_email'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN notification_email text;
    END IF;

    -- Campo: error_notifications_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'error_notifications_enabled'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN error_notifications_enabled boolean DEFAULT false;
    END IF;

    -- Campo: smtp_config (JSONB con configuración SMTP)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'smtp_config'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN smtp_config jsonb DEFAULT NULL;
    END IF;

    -- Campo: notification_messages_sent (contador de mensajes sin respuesta)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'notification_messages_sent'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN notification_messages_sent integer DEFAULT 0;
    END IF;

    -- Campo: notification_last_acknowledged_at (última respuesta de WhatsApp)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'notification_last_acknowledged_at'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN notification_last_acknowledged_at timestamptz DEFAULT NULL;
    END IF;
END $$;

-- Comentarios
COMMENT ON COLUMN public.profiles.smtp_config IS 'Configuración SMTP: {host, port, secure, user, password, from_email, from_name}';
COMMENT ON COLUMN public.profiles.notification_messages_sent IS 'Contador de mensajes de notificación enviados sin respuesta del usuario';
COMMENT ON COLUMN public.profiles.notification_last_acknowledged_at IS 'Última vez que el usuario respondió a una notificación por WhatsApp';

-- Función RPC para incrementar contador de notificaciones de forma atómica
CREATE OR REPLACE FUNCTION increment_notification_counter(user_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET notification_messages_sent = COALESCE(notification_messages_sent, 0) + 1
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Crear tabla conversation_quality_log
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_quality_log (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    contact_id bigint references public.contacts(id) on delete cascade,
    conversation_date date not null DEFAULT CURRENT_DATE,

    -- Métricas básicas
    total_messages int default 0,
    total_user_messages int default 0,
    total_ai_messages int default 0,
    avg_response_time_ms int,

    -- Herramientas utilizadas
    tools_used jsonb DEFAULT '[]'::jsonb,
    tools_success_count int default 0,
    tools_error_count int default 0,

    -- Detección de problemas
    has_errors boolean default false,
    error_types text[] DEFAULT ARRAY[]::text[],
    error_details jsonb DEFAULT '{}'::jsonb,

    -- Productos y cotizaciones
    products_queried text[] DEFAULT ARRAY[]::text[],
    products_not_found text[] DEFAULT ARRAY[]::text[],
    quotes_generated int default 0,
    appointments_created int default 0,

    -- Situaciones críticas
    critical_situations jsonb DEFAULT '[]'::jsonb,

    -- Transcript (solo si hay errores)
    transcript text,

    -- Calidad de la conversación
    quality_score numeric(3,2), -- 0.0 - 1.0
    needs_review boolean default false,
    reviewed_by uuid references auth.users(id),
    reviewed_at timestamptz,
    review_notes text,

    -- Metadata
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS conversation_quality_log_user_date_idx
    ON public.conversation_quality_log (user_id, conversation_date DESC);

CREATE INDEX IF NOT EXISTS conversation_quality_log_errors_idx
    ON public.conversation_quality_log (user_id, has_errors)
    WHERE has_errors = true;

CREATE INDEX IF NOT EXISTS conversation_quality_log_needs_review_idx
    ON public.conversation_quality_log (needs_review)
    WHERE needs_review = true;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_conversation_quality_log_updated_at ON public.conversation_quality_log;
CREATE TRIGGER trg_conversation_quality_log_updated_at
    BEFORE UPDATE ON public.conversation_quality_log
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.conversation_quality_log IS 'Registro de calidad de conversaciones para análisis y mejora continua';
COMMENT ON COLUMN public.conversation_quality_log.error_types IS 'Tipos de errores: product_not_found, hallucination, tool_error, validation_failed';
COMMENT ON COLUMN public.conversation_quality_log.quality_score IS 'Score de 0.0 a 1.0 basado en métricas de calidad';

-- ============================================
-- 3. Crear tabla daily_summaries (registro histórico)
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_summaries (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    summary_date date not null,

    -- Métricas del día
    total_conversations int default 0,
    new_contacts int default 0,
    quotes_generated int default 0,
    quotes_total_amount numeric(10,2) default 0,
    appointments_created int default 0,
    critical_situations int default 0,

    -- Productos más consultados
    top_products jsonb DEFAULT '[]'::jsonb,

    -- Resumen generado por IA
    summary_text text,
    advice_text text,

    -- Estado de envío
    sent_at timestamptz,
    sent_to text, -- Número de WhatsApp
    delivery_status text, -- 'sent', 'failed', 'pending'

    created_at timestamptz default timezone('utc', now()) not null,

    UNIQUE(user_id, summary_date)
);

CREATE INDEX IF NOT EXISTS daily_summaries_user_date_idx
    ON public.daily_summaries (user_id, summary_date DESC);

COMMENT ON TABLE public.daily_summaries IS 'Registro histórico de resúmenes diarios enviados';

-- ============================================
-- 4. RLS Policies
-- ============================================

-- conversation_quality_log
ALTER TABLE public.conversation_quality_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quality logs" ON public.conversation_quality_log;
CREATE POLICY "Users can view their own quality logs"
    ON public.conversation_quality_log
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert quality logs" ON public.conversation_quality_log;
CREATE POLICY "System can insert quality logs"
    ON public.conversation_quality_log
    FOR INSERT
    WITH CHECK (true);

-- daily_summaries
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own summaries" ON public.daily_summaries;
CREATE POLICY "Users can view their own summaries"
    ON public.daily_summaries
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage summaries" ON public.daily_summaries;
CREATE POLICY "System can manage summaries"
    ON public.daily_summaries
    FOR ALL
    USING (true)
    WITH CHECK (true);
