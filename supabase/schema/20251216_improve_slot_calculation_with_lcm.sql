-- ============================================
-- Mejorar cálculo de slots usando MCM (Mínimo Común Múltiplo)
-- de las duraciones de servicios disponibles
-- ============================================

-- Función auxiliar para calcular el MCD (Máximo Común Divisor)
CREATE OR REPLACE FUNCTION public.gcd(a integer, b integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF b = 0 THEN
        RETURN a;
    END IF;
    RETURN public.gcd(b, a % b);
END;
$$;

-- Función auxiliar para calcular el MCM (Mínimo Común Múltiplo)
CREATE OR REPLACE FUNCTION public.lcm(a integer, b integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN (a * b) / public.gcd(a, b);
END;
$$;

-- Función para calcular el MCM de múltiples números
CREATE OR REPLACE FUNCTION public.lcm_array(numbers integer[])
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result integer;
    num integer;
BEGIN
    IF numbers IS NULL OR array_length(numbers, 1) IS NULL THEN
        RETURN 15; -- Valor por defecto mínimo
    END IF;
    
    result := numbers[1];
    FOR i IN 2..array_length(numbers, 1) LOOP
        num := numbers[i];
        IF num IS NOT NULL AND num > 0 THEN
            result := public.lcm(result, num);
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$;

-- Actualizar función get_available_slots para usar MCM
DROP FUNCTION IF EXISTS public.get_available_slots(uuid, date, bigint, integer, bigint);

CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_user_id uuid,
    p_date date,
    p_appointment_type_id bigint DEFAULT NULL,
    p_duration_minutes integer DEFAULT NULL,
    p_product_id bigint DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings record;
    v_appointment_type record;
    v_product record;
    v_hours record;
    v_duration integer;
    v_slot_duration integer; -- Duración del slot base (MCM)
    v_buffer integer;
    v_slots jsonb := '[]'::jsonb;
    v_start_time time;
    v_end_time time;
    v_current_slot time;
    v_slot_end time;
    v_day_of_week integer;
    v_existing_appointments jsonb;
    v_slot_start_timestamp timestamptz;
    v_slot_end_timestamp timestamptz;
    v_is_available boolean;
    v_slot jsonb;
    v_appointments_count integer;
    v_max_per_day integer;
    v_service_durations integer[]; -- Array de duraciones de servicios
    v_all_durations integer[]; -- Todas las duraciones (servicios + tipos de cita)
BEGIN
    -- Obtener configuración del usuario
    SELECT * INTO v_settings
    FROM public.appointment_settings
    WHERE user_id = p_user_id AND is_enabled = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('available_slots', '[]'::jsonb, 'error', 'Appointment system not enabled');
    END IF;
    
    v_max_per_day := v_settings.max_appointments_per_day;
    
    -- Verificar límite de citas por día si está configurado
    IF v_max_per_day IS NOT NULL THEN
        SELECT COUNT(*) INTO v_appointments_count
        FROM public.meetings
        WHERE user_id = p_user_id
          AND DATE(start_time AT TIME ZONE v_settings.timezone) = p_date
          AND status IN ('confirmed', 'pending');
        
        IF v_appointments_count >= v_max_per_day THEN
            RETURN jsonb_build_object(
                'available_slots', '[]'::jsonb, 
                'error', 'Maximum appointments per day reached',
                'max_appointments_per_day', v_max_per_day,
                'current_count', v_appointments_count
            );
        END IF;
    END IF;
    
    -- Obtener todas las duraciones de servicios activos del usuario
    SELECT COALESCE(array_agg(DISTINCT service_duration_minutes) FILTER (WHERE service_duration_minutes IS NOT NULL), ARRAY[]::integer[])
    INTO v_service_durations
    FROM public.products
    WHERE user_id = p_user_id 
      AND product_type = 'service' 
      AND service_duration_minutes IS NOT NULL
      AND service_duration_minutes > 0;
    
    -- Obtener duraciones de tipos de citas activos
    SELECT COALESCE(array_agg(DISTINCT duration_minutes) FILTER (WHERE duration_minutes IS NOT NULL), ARRAY[]::integer[])
    INTO v_all_durations
    FROM public.appointment_types
    WHERE user_id = p_user_id 
      AND is_active = true
      AND duration_minutes IS NOT NULL
      AND duration_minutes > 0;
    
    -- Combinar duraciones de servicios y tipos de citas
    v_all_durations := array_cat(COALESCE(v_service_durations, ARRAY[]::integer[]), COALESCE(v_all_durations, ARRAY[]::integer[]));
    
    -- Agregar duración por defecto si no hay servicios/tipos configurados
    IF array_length(v_all_durations, 1) IS NULL THEN
        v_all_durations := ARRAY[v_settings.default_duration_minutes];
    ELSE
        -- Agregar duración por defecto si no está en el array
        IF NOT (v_settings.default_duration_minutes = ANY(v_all_durations)) THEN
            v_all_durations := array_append(v_all_durations, v_settings.default_duration_minutes);
        END IF;
    END IF;
    
    -- Calcular MCM de todas las duraciones (mínimo 15 minutos)
    v_slot_duration := GREATEST(public.lcm_array(v_all_durations), 15);
    
    -- Determinar duración específica para esta cita: prioridad: producto > tipo de cita > duración explícita > default
    IF p_product_id IS NOT NULL THEN
        SELECT * INTO v_product
        FROM public.products
        WHERE id = p_product_id AND user_id = p_user_id AND product_type = 'service';
        
        IF FOUND AND v_product.service_duration_minutes IS NOT NULL THEN
            v_duration := v_product.service_duration_minutes;
        ELSIF p_appointment_type_id IS NOT NULL THEN
            SELECT * INTO v_appointment_type
            FROM public.appointment_types
            WHERE id = p_appointment_type_id AND user_id = p_user_id AND is_active = true;
            
            IF FOUND THEN
                v_duration := v_appointment_type.duration_minutes;
            ELSIF p_duration_minutes IS NOT NULL THEN
                v_duration := p_duration_minutes;
            ELSE
                v_duration := v_settings.default_duration_minutes;
            END IF;
        ELSIF p_duration_minutes IS NOT NULL THEN
            v_duration := p_duration_minutes;
        ELSE
            v_duration := v_settings.default_duration_minutes;
        END IF;
    ELSIF p_appointment_type_id IS NOT NULL THEN
        SELECT * INTO v_appointment_type
        FROM public.appointment_types
        WHERE id = p_appointment_type_id AND user_id = p_user_id AND is_active = true;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('available_slots', '[]'::jsonb, 'error', 'Appointment type not found');
        END IF;
        
        v_duration := v_appointment_type.duration_minutes;
    ELSIF p_duration_minutes IS NOT NULL THEN
        v_duration := p_duration_minutes;
    ELSE
        v_duration := v_settings.default_duration_minutes;
    END IF;
    
    v_buffer := COALESCE(v_settings.buffer_time_minutes, 15);
    v_day_of_week := EXTRACT(DOW FROM p_date)::integer;
    
    -- Obtener horarios del día
    SELECT * INTO v_hours
    FROM public.appointment_hours
    WHERE user_id = p_user_id AND day_of_week = v_day_of_week AND is_available = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('available_slots', '[]'::jsonb, 'error', 'No hours configured for this day');
    END IF;
    
    v_start_time := v_hours.start_time;
    v_end_time := v_hours.end_time;
    
    -- Obtener citas existentes del día con información de duración
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'start', start_time,
            'end', end_time,
            'duration_minutes', EXTRACT(EPOCH FROM (end_time - start_time))::integer / 60
        )
    ), '[]'::jsonb) INTO v_existing_appointments
    FROM public.meetings
    WHERE user_id = p_user_id
      AND DATE(start_time AT TIME ZONE v_settings.timezone) = p_date
      AND status IN ('confirmed', 'pending');
    
    -- Generar slots disponibles usando v_slot_duration como incremento base
    v_current_slot := v_start_time;
    
    WHILE v_current_slot < v_end_time LOOP
        -- Calcular el final del slot considerando la duración específica de la cita
        v_slot_end := v_current_slot + (v_duration || ' minutes')::interval;
        
        -- Verificar que el slot no exceda el horario de cierre
        IF v_slot_end > v_end_time THEN
            EXIT;
        END IF;
        
        -- Verificar si hay conflicto con citas existentes (considerando buffer)
        v_is_available := true;
        
        IF v_existing_appointments IS NOT NULL AND jsonb_array_length(v_existing_appointments) > 0 THEN
            FOR v_slot IN SELECT * FROM jsonb_array_elements(v_existing_appointments) LOOP
                -- Convertir a timestamps para comparación precisa
                v_slot_start_timestamp := (p_date || ' ' || (v_slot->>'start')::text)::timestamptz;
                v_slot_end_timestamp := (p_date || ' ' || (v_slot->>'end')::text)::timestamptz;
                
                -- Verificar solapamiento considerando buffer antes y después
                IF (
                    (v_current_slot::text < (v_slot->>'end')::text 
                     AND v_slot_end::text > (v_slot->>'start')::text)
                    OR
                    (v_current_slot >= (v_slot->>'start')::time - (v_buffer || ' minutes')::interval
                     AND v_current_slot < (v_slot->>'start')::time)
                    OR
                    (v_slot_end > (v_slot->>'end')::time
                     AND v_slot_end <= (v_slot->>'end')::time + (v_buffer || ' minutes')::interval)
                ) THEN
                    v_is_available := false;
                    EXIT;
                END IF;
            END LOOP;
        END IF;
        
        -- Agregar slot si está disponible
        IF v_is_available THEN
            v_slots := v_slots || jsonb_build_object(
                'start', v_current_slot::text,
                'end', v_slot_end::text,
                'duration_minutes', v_duration
            );
        END IF;
        
        -- Avanzar al siguiente slot usando v_slot_duration (MCM) como incremento base
        -- Esto asegura que los slots estén alineados correctamente para todos los servicios
        v_current_slot := v_current_slot + (v_slot_duration || ' minutes')::interval;
    END LOOP;
    
    RETURN jsonb_build_object(
        'available_slots', v_slots,
        'date', p_date::text,
        'timezone', v_settings.timezone,
        'max_appointments_per_day', v_max_per_day,
        'current_appointments_count', COALESCE(v_appointments_count, 0),
        'slot_duration_minutes', v_slot_duration, -- Información útil para debugging
        'calculated_from_durations', v_all_durations -- Información útil para debugging
    );
END;
$$;

COMMENT ON FUNCTION public.get_available_slots IS 'Calcula los horarios disponibles para agendar una cita en una fecha específica, usando MCM de duraciones de servicios para optimizar los slots';
COMMENT ON FUNCTION public.gcd IS 'Calcula el Máximo Común Divisor (GCD) de dos números';
COMMENT ON FUNCTION public.lcm IS 'Calcula el Mínimo Común Múltiplo (LCM) de dos números';
COMMENT ON FUNCTION public.lcm_array IS 'Calcula el MCM de un array de números enteros';

