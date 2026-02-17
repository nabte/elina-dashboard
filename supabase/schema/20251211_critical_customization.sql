-- ============================================
-- Personalización de Críticos y Prevención de Alucinaciones
-- ============================================
-- Este script agrega:
-- 1. Tabla critical_rules para reglas personalizadas de detección crítica
-- 2. Campos adicionales en profiles para datos del negocio
-- 3. Precarga de reglas críticas por defecto
-- 4. Modificación de función detect_critical_intent para usar reglas personalizadas

-- ============================================
-- 1. Extender tabla profiles con datos del negocio
-- ============================================
DO $$
BEGIN
    -- Agregar business_address si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'business_address'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN business_address text;
    END IF;

    -- Agregar business_phone si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'business_phone'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN business_phone text;
    END IF;

    -- Agregar pickup_location si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'pickup_location'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN pickup_location text;
    END IF;

    -- Agregar shipping_info si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'shipping_info'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN shipping_info jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- Agregar has_shipping_system si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'has_shipping_system'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN has_shipping_system boolean DEFAULT false;
    END IF;
END $$;

-- ============================================
-- 2. Crear tabla critical_rules
-- ============================================
CREATE TABLE IF NOT EXISTS public.critical_rules (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    rule_name text not null, -- Nombre descriptivo de la regla
    rule_type text not null CHECK (rule_type IN ('keyword', 'pattern')), -- 'keyword' o 'pattern'
    pattern_or_keyword text not null, -- La palabra clave o patrón regex
    detection_type text not null, -- 'human_request', 'purchase_intent', 'urgent_attention', 'shipping_inquiry', 'custom'
    is_active boolean default true,
    is_predefined boolean default false, -- Si es una regla predefinida del sistema
    priority integer default 100, -- Prioridad (menor número = mayor prioridad)
    case_sensitive boolean default false,
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null,
    unique(user_id, rule_name)
);

CREATE INDEX IF NOT EXISTS critical_rules_user_idx ON public.critical_rules (user_id, is_active);
CREATE INDEX IF NOT EXISTS critical_rules_type_idx ON public.critical_rules (detection_type, is_active);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trg_critical_rules_updated_at ON public.critical_rules;
CREATE TRIGGER trg_critical_rules_updated_at
    BEFORE UPDATE ON public.critical_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.critical_rules IS 'Reglas personalizadas de detección crítica por usuario';
COMMENT ON COLUMN public.critical_rules.rule_type IS 'Tipo de regla: keyword (palabra simple) o pattern (expresión regular)';
COMMENT ON COLUMN public.critical_rules.is_predefined IS 'Indica si es una regla predefinida del sistema que puede ser activada/desactivada';

-- ============================================
-- 3. Función para precargar reglas por defecto para un usuario
-- ============================================
CREATE OR REPLACE FUNCTION public.initialize_default_critical_rules(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo crear si el usuario no tiene reglas predefinidas ya
    IF NOT EXISTS (
        SELECT 1 FROM public.critical_rules 
        WHERE user_id = p_user_id AND is_predefined = true
    ) THEN
        -- 1. Solicitud de humano
        INSERT INTO public.critical_rules (
            user_id, rule_name, rule_type, pattern_or_keyword, 
            detection_type, is_active, is_predefined, priority
        ) VALUES (
            p_user_id, 
            'Solicitud de Humano', 
            'pattern',
            '(quiero|necesito|dame|hablar|atender|atenderme|persona|humano|agente|asesor|representante|operador|ejecutivo|vendedor|vendedora).*(humano|persona|agente|asesor|representante|operador|ejecutivo|vendedor|vendedora|contigo|con alguien|con un|con una)|(no.*bot|no.*ia|no.*automatico|no.*automatica)|(quiero.*hablar.*alguien|necesito.*hablar.*alguien|dame.*contacto|hablar.*humano|atender.*humano|persona.*real)|(hablar.*con.*alguien|hablar.*con.*un|hablar.*con.*una)',
            'human_request',
            true,
            true,
            10
        ) ON CONFLICT (user_id, rule_name) DO NOTHING;

        -- 2. Intención de compra
        INSERT INTO public.critical_rules (
            user_id, rule_name, rule_type, pattern_or_keyword, 
            detection_type, is_active, is_predefined, priority
        ) VALUES (
            p_user_id,
            'Intención de Compra',
            'pattern',
            '(quiero|necesito|deseo|me interesa|me gustaria|me gustaría|estoy interesado|estoy interesada).*(comprar|adquirir|ordenar|pedir|contratar|suscribir|contrato|compra|adquisicion|adquisición)',
            'purchase_intent',
            true,
            true,
            20
        ) ON CONFLICT (user_id, rule_name) DO NOTHING;

        -- 3. Atención urgente
        INSERT INTO public.critical_rules (
            user_id, rule_name, rule_type, pattern_or_keyword, 
            detection_type, is_active, is_predefined, priority
        ) VALUES (
            p_user_id,
            'Atención Urgente',
            'pattern',
            '(urgente|inmediato|ahora|ya|molesto|molesta|enojado|enojada|frustrado|frustrada|problema|queja|reclamo|reclamar)',
            'urgent_attention',
            true,
            true,
            30
        ) ON CONFLICT (user_id, rule_name) DO NOTHING;
    END IF;
END;
$$;

-- ============================================
-- 4. Modificar función detect_critical_intent para usar critical_rules
-- ============================================
CREATE OR REPLACE FUNCTION public.detect_critical_intent(
    p_message_content text,
    p_user_id uuid,
    p_contact_id bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb := '{"is_critical": false, "detection_type": null, "confidence": 0.0}'::jsonb;
    v_rule record;
    v_keyword record;
    v_content_lower text;
    v_detected_type text;
    v_confidence numeric(3,2) := 0.0;
    v_has_shipping_system boolean;
BEGIN
    -- Normalizar contenido a minúsculas para búsqueda
    v_content_lower := lower(p_message_content);
    
    -- Obtener si el usuario tiene sistema de tracking de envíos
    SELECT COALESCE(has_shipping_system, false) INTO v_has_shipping_system
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Inicializar reglas por defecto si no existen
    PERFORM public.initialize_default_critical_rules(p_user_id);
    
    -- 1. Verificar reglas personalizadas activas (prioridad más alta)
    FOR v_rule IN 
        SELECT rule_name, rule_type, pattern_or_keyword, detection_type, priority, case_sensitive
        FROM public.critical_rules
        WHERE user_id = p_user_id
          AND is_active = true
        ORDER BY priority ASC, id ASC
    LOOP
        IF v_rule.rule_type = 'pattern' THEN
            -- Usar expresión regular
            IF v_rule.case_sensitive THEN
                IF p_message_content ~ v_rule.pattern_or_keyword THEN
                    v_detected_type := v_rule.detection_type;
                    v_confidence := GREATEST(v_confidence, 0.85);
                    EXIT;
                END IF;
            ELSE
                IF v_content_lower ~* v_rule.pattern_or_keyword THEN
                    v_detected_type := v_rule.detection_type;
                    v_confidence := GREATEST(v_confidence, 0.85);
                    EXIT;
                END IF;
            END IF;
        ELSIF v_rule.rule_type = 'keyword' THEN
            -- Búsqueda simple de palabra clave
            IF v_rule.case_sensitive THEN
                IF p_message_content LIKE '%' || v_rule.pattern_or_keyword || '%' THEN
                    v_detected_type := v_rule.detection_type;
                    v_confidence := GREATEST(v_confidence, 0.8);
                    EXIT;
                END IF;
            ELSE
                IF v_content_lower LIKE '%' || lower(v_rule.pattern_or_keyword) || '%' THEN
                    v_detected_type := v_rule.detection_type;
                    v_confidence := GREATEST(v_confidence, 0.8);
                    EXIT;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    -- 2. Si no se detectó nada y no tienen sistema de envíos, verificar consultas de envío
    IF v_detected_type IS NULL AND NOT v_has_shipping_system THEN
        IF v_content_lower ~* '(dónde|donde).*(envío|envio|pedido|paquete)|(tracking|rastreo|seguimiento).*(envío|envio|pedido|paquete)|(estado|status).*(envío|envio|pedido|paquete)|(cuándo|cuando).*(llegar|llegada|entrega)' THEN
            v_detected_type := 'shipping_inquiry';
            v_confidence := 0.9;
        END IF;
    END IF;
    
    -- 3. Verificar palabras clave personalizadas del usuario (compatibilidad con sistema anterior)
    IF v_detected_type IS NULL THEN
        FOR v_keyword IN 
            SELECT keyword, detection_type, case_sensitive
            FROM public.critical_keywords
            WHERE user_id = p_user_id
              AND is_active = true
        LOOP
            IF v_keyword.case_sensitive THEN
                IF p_message_content LIKE '%' || v_keyword.keyword || '%' THEN
                    v_detected_type := COALESCE(v_keyword.detection_type, 'custom_keyword');
                    v_confidence := GREATEST(v_confidence, 0.8);
                    EXIT;
                END IF;
            ELSE
                IF v_content_lower LIKE '%' || lower(v_keyword.keyword) || '%' THEN
                    v_detected_type := COALESCE(v_keyword.detection_type, 'custom_keyword');
                    v_confidence := GREATEST(v_confidence, 0.8);
                    EXIT;
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    -- Si se detectó algo crítico, construir resultado
    IF v_detected_type IS NOT NULL THEN
        v_result := jsonb_build_object(
            'is_critical', true,
            'detection_type', v_detected_type,
            'confidence', v_confidence,
            'detected_content', p_message_content
        );
    END IF;
    
    RETURN v_result;
END;
$$;

-- ============================================
-- 5. Inicializar reglas por defecto para usuarios existentes
-- ============================================
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    FOR v_user_id IN SELECT id FROM auth.users
    LOOP
        PERFORM public.initialize_default_critical_rules(v_user_id);
    END LOOP;
END $$;

-- Comentarios finales
COMMENT ON FUNCTION public.initialize_default_critical_rules IS 'Inicializa las reglas críticas por defecto para un usuario';
COMMENT ON FUNCTION public.detect_critical_intent IS 'Detecta intenciones críticas usando reglas personalizadas y predefinidas';

