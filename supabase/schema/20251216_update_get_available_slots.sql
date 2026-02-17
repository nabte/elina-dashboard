-- ============================================
-- Actualizar función get_available_slots para considerar:
-- 1. Límite de citas por día (max_appointments_per_day)
-- 2. Duración de servicios (product_id)
-- 3. Mejorar lógica de bloqueo
-- ============================================

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
    
    -- Determinar duración: prioridad: producto > tipo de cita > duración explícita > default
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
    
    -- Generar slots disponibles
    v_current_slot := v_start_time;
    
    WHILE v_current_slot < v_end_time LOOP
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
                -- El slot está bloqueado si:
                -- 1. Se solapa con una cita existente
                -- 2. Está dentro del buffer time antes de una cita
                -- 3. Está dentro del buffer time después de una cita
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
        
        -- Avanzar al siguiente slot (duración + buffer)
        v_current_slot := v_slot_end + (v_buffer || ' minutes')::interval;
    END LOOP;
    
    RETURN jsonb_build_object(
        'available_slots', v_slots,
        'date', p_date::text,
        'timezone', v_settings.timezone,
        'max_appointments_per_day', v_max_per_day,
        'current_appointments_count', COALESCE(v_appointments_count, 0)
    );
END;
$$;

COMMENT ON FUNCTION public.get_available_slots IS 'Calcula los horarios disponibles para agendar una cita en una fecha específica, considerando límites diarios, duración de servicios y buffer time';

