-- ============================================
-- Registro de Inserciones de Promos Inteligentes
-- ============================================
-- Este script crea una tabla para registrar cada inserción de promo
-- y una función para actualizar los contadores

-- 1. Crear tabla de registro de inserciones diarias
CREATE TABLE IF NOT EXISTS public.smart_promotion_insertions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id uuid NOT NULL REFERENCES public.smart_promotions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id bigint REFERENCES public.contacts(id) ON DELETE SET NULL,
    inserted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS smart_promotion_insertions_promotion_idx 
    ON public.smart_promotion_insertions (promotion_id, inserted_at);

CREATE INDEX IF NOT EXISTS smart_promotion_insertions_user_idx 
    ON public.smart_promotion_insertions (user_id, inserted_at);

-- Nota: No creamos un índice funcional en DATE(inserted_at) porque DATE() no es IMMUTABLE
-- El índice en inserted_at ya es suficiente para consultas por rango de fechas

-- Habilitar RLS
ALTER TABLE public.smart_promotion_insertions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own insertions"
    ON public.smart_promotion_insertions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insertions"
    ON public.smart_promotion_insertions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Función para registrar una inserción de promo
CREATE OR REPLACE FUNCTION public.register_smart_promotion_insertion(
    p_promotion_id uuid,
    p_user_id uuid,
    p_contact_id bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insertar registro de inserción
    INSERT INTO public.smart_promotion_insertions (
        promotion_id,
        user_id,
        contact_id,
        inserted_at
    ) VALUES (
        p_promotion_id,
        p_user_id,
        p_contact_id,
        timezone('utc', now())
    );

    -- Actualizar last_triggered_at y trigger_count en la promo
    UPDATE public.smart_promotions
    SET 
        last_triggered_at = timezone('utc', now()),
        trigger_count = COALESCE(trigger_count, 0) + 1,
        updated_at = timezone('utc', now())
    WHERE id = p_promotion_id
      AND user_id = p_user_id;
END;
$$;

-- Permisos para la función
REVOKE ALL ON FUNCTION public.register_smart_promotion_insertion(uuid, uuid, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.register_smart_promotion_insertion(uuid, uuid, bigint) TO authenticated;

-- 3. Función para obtener el total de menciones hoy
CREATE OR REPLACE FUNCTION public.get_smart_promotions_today_count(
    p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*)::integer
    INTO v_count
    FROM public.smart_promotion_insertions
    WHERE user_id = p_user_id
      AND DATE(inserted_at) = DATE(timezone('utc', now()));
    
    RETURN COALESCE(v_count, 0);
END;
$$;

-- Permisos para la función
REVOKE ALL ON FUNCTION public.get_smart_promotions_today_count(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_smart_promotions_today_count(uuid) TO authenticated;

-- 4. Función para obtener estadísticas de promos (para el dashboard)
CREATE OR REPLACE FUNCTION public.get_smart_promotions_stats(
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_active_count integer;
    v_scheduled_count integer;
    v_today_count integer;
    v_now timestamptz;
BEGIN
    v_now := timezone('utc', now());
    
    -- Contar promos activas hoy
    SELECT COUNT(*)::integer
    INTO v_active_count
    FROM public.smart_promotions
    WHERE user_id = p_user_id
      AND is_active = true
      AND (
          no_schedule = true
          OR (
              (start_at IS NULL OR start_at <= v_now)
              AND (end_at IS NULL OR end_at >= v_now)
          )
      );
    
    -- Contar promos programadas (con fecha futura)
    SELECT COUNT(*)::integer
    INTO v_scheduled_count
    FROM public.smart_promotions
    WHERE user_id = p_user_id
      AND is_active = true
      AND no_schedule = false
      AND start_at IS NOT NULL
      AND start_at > v_now;
    
    -- Contar total de inserciones hoy
    SELECT COUNT(*)::integer
    INTO v_today_count
    FROM public.smart_promotion_insertions
    WHERE user_id = p_user_id
      AND DATE(inserted_at) = DATE(v_now);
    
    -- Construir resultado
    v_result := jsonb_build_object(
        'active_count', COALESCE(v_active_count, 0),
        'scheduled_count', COALESCE(v_scheduled_count, 0),
        'today_count', COALESCE(v_today_count, 0)
    );
    
    RETURN v_result;
END;
$$;

-- Permisos para la función
REVOKE ALL ON FUNCTION public.get_smart_promotions_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_smart_promotions_stats(uuid) TO authenticated;

