-- Sistema de Citas y Calendario
-- Permite configurar horarios, tipos de citas y gestionar agendamientos

-- Tabla de configuración de citas por usuario
CREATE TABLE IF NOT EXISTS public.appointment_settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_enabled boolean DEFAULT false NOT NULL,
    calendar_type text DEFAULT 'internal' NOT NULL CHECK (calendar_type IN ('internal', 'google')),
    timezone text DEFAULT 'America/Mexico_City' NOT NULL,
    default_duration_minutes integer DEFAULT 60 NOT NULL CHECK (default_duration_minutes > 0),
    advance_booking_days integer DEFAULT 30 NOT NULL CHECK (advance_booking_days > 0),
    buffer_time_minutes integer DEFAULT 15 NOT NULL CHECK (buffer_time_minutes >= 0),
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

COMMENT ON TABLE public.appointment_settings IS 'Configuración del sistema de citas por usuario';

-- Tabla de tipos de citas configurables
CREATE TABLE IF NOT EXISTS public.appointment_types (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS appointment_types_user_idx ON public.appointment_types (user_id, is_active);

COMMENT ON TABLE public.appointment_types IS 'Tipos de citas configurables (ej: Consulta inicial, Seguimiento)';

-- Tabla de horarios de atención por día de la semana
CREATE TABLE IF NOT EXISTS public.appointment_hours (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_available boolean DEFAULT true NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL CHECK (end_time > start_time),
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS appointment_hours_user_idx ON public.appointment_hours (user_id, day_of_week);

COMMENT ON TABLE public.appointment_hours IS 'Horarios de atención por día de la semana (0=Domingo, 6=Sábado)';

-- Crear tabla meetings si no existe (compatibilidad con migraciones anteriores)
CREATE TABLE IF NOT EXISTS public.meetings (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    contact_id bigint REFERENCES public.contacts(id),
    external_id text, -- Google Calendar event id (nullable para citas internas)
    html_link text,
    summary text,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    status text DEFAULT 'confirmed',
    metadata jsonb,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS meetings_user_idx ON public.meetings (user_id, contact_id);

-- Extender tabla meetings para soportar sistema de citas
-- Agregar columnas si no existen
DO $$
BEGIN
    -- Verificar si la tabla existe antes de modificar
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'meetings'
    ) THEN
        -- Agregar appointment_type_id si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meetings' 
            AND column_name = 'appointment_type_id'
        ) THEN
            -- Primero agregar la columna sin foreign key
            ALTER TABLE public.meetings 
            ADD COLUMN appointment_type_id bigint;
            
            -- Luego agregar la foreign key si appointment_types existe
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'appointment_types'
            ) THEN
                ALTER TABLE public.meetings 
                ADD CONSTRAINT meetings_appointment_type_id_fkey 
                FOREIGN KEY (appointment_type_id) 
                REFERENCES public.appointment_types(id) 
                ON DELETE SET NULL;
            END IF;
        END IF;

        -- Agregar notes si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meetings' 
            AND column_name = 'notes'
        ) THEN
            ALTER TABLE public.meetings 
            ADD COLUMN notes text;
        END IF;

        -- Agregar reminder_sent si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meetings' 
            AND column_name = 'reminder_sent'
        ) THEN
            ALTER TABLE public.meetings 
            ADD COLUMN reminder_sent boolean DEFAULT false NOT NULL;
        END IF;

        -- Actualizar external_id para que sea nullable (puede ser null para citas internas)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meetings' 
            AND column_name = 'external_id'
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE public.meetings 
            ALTER COLUMN external_id DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- Agregar foreign key después de que appointment_types esté creado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'meetings'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_types'
    ) THEN
        -- Verificar si la columna existe pero no tiene la foreign key
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meetings' 
            AND column_name = 'appointment_type_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_schema = 'public' 
            AND table_name = 'meetings' 
            AND constraint_name = 'meetings_appointment_type_id_fkey'
        ) THEN
            ALTER TABLE public.meetings 
            ADD CONSTRAINT meetings_appointment_type_id_fkey 
            FOREIGN KEY (appointment_type_id) 
            REFERENCES public.appointment_types(id) 
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Crear índice para appointment_type_id
CREATE INDEX IF NOT EXISTS meetings_appointment_type_idx ON public.meetings (appointment_type_id);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.appointment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_hours ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para appointment_settings
DROP POLICY IF EXISTS "Users can view own appointment settings" ON public.appointment_settings;
CREATE POLICY "Users can view own appointment settings"
    ON public.appointment_settings
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own appointment settings" ON public.appointment_settings;
CREATE POLICY "Users can insert own appointment settings"
    ON public.appointment_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own appointment settings" ON public.appointment_settings;
CREATE POLICY "Users can update own appointment settings"
    ON public.appointment_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Políticas RLS para appointment_types
DROP POLICY IF EXISTS "Users can view own appointment types" ON public.appointment_types;
CREATE POLICY "Users can view own appointment types"
    ON public.appointment_types
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own appointment types" ON public.appointment_types;
CREATE POLICY "Users can insert own appointment types"
    ON public.appointment_types
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own appointment types" ON public.appointment_types;
CREATE POLICY "Users can update own appointment types"
    ON public.appointment_types
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own appointment types" ON public.appointment_types;
CREATE POLICY "Users can delete own appointment types"
    ON public.appointment_types
    FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas RLS para appointment_hours
DROP POLICY IF EXISTS "Users can view own appointment hours" ON public.appointment_hours;
CREATE POLICY "Users can view own appointment hours"
    ON public.appointment_hours
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own appointment hours" ON public.appointment_hours;
CREATE POLICY "Users can insert own appointment hours"
    ON public.appointment_hours
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own appointment hours" ON public.appointment_hours;
CREATE POLICY "Users can update own appointment hours"
    ON public.appointment_hours
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own appointment hours" ON public.appointment_hours;
CREATE POLICY "Users can delete own appointment hours"
    ON public.appointment_hours
    FOR DELETE
    USING (auth.uid() = user_id);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trg_appointment_settings_updated_at ON public.appointment_settings;
CREATE TRIGGER trg_appointment_settings_updated_at
    BEFORE UPDATE ON public.appointment_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_appointment_types_updated_at ON public.appointment_types;
CREATE TRIGGER trg_appointment_types_updated_at
    BEFORE UPDATE ON public.appointment_types
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_appointment_hours_updated_at ON public.appointment_hours;
CREATE TRIGGER trg_appointment_hours_updated_at
    BEFORE UPDATE ON public.appointment_hours
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Función para detectar intención de agendar cita
CREATE OR REPLACE FUNCTION public.detect_appointment_intent(
    p_message_content text,
    p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb := '{"has_intent": false, "confidence": 0.0, "detection_type": null}'::jsonb;
    v_content_lower text;
    v_detected_type text;
    v_confidence numeric(3,2) := 0.0;
BEGIN
    -- Normalizar contenido a minúsculas
    v_content_lower := lower(p_message_content);
    
    -- Patrones para detectar intención de agendar cita
    -- 1. Solicitud explícita de cita
    IF (v_content_lower ~* '(quiero|necesito|deseo|me gustaria|me gustaría|estoy interesado|estoy interesada).*(cita|consulta|agendar|agendamiento|reservar|reserva|horario|disponibilidad)'
       OR v_content_lower ~* '(agendar|reservar).*(cita|consulta|horario|turno)'
       OR v_content_lower ~* '(tienes|hay|tienen).*(disponibilidad|horario|tiempo|espacio).*(para|de)')
    THEN
        v_detected_type := 'appointment_request';
        v_confidence := 0.9;
    -- 2. Pregunta sobre disponibilidad
    ELSIF (v_content_lower ~* '(cuando|cuándo).*(puedo|puedes|pueden|tienes|tienen|hay|disponible|libre)'
          OR v_content_lower ~* '(que|qué).*(horarios|horario|dias|días|disponibilidad)'
          OR v_content_lower ~* '(disponible|libre).*(el|la|para|en)')
    THEN
        v_detected_type := 'availability_inquiry';
        v_confidence := 0.85;
    -- 3. Solicitud de consulta/reunión
    ELSIF (v_content_lower ~* '(quiero|necesito|deseo).*(consulta|reunión|reunion|visita|ver|verme|atender|atenderme)'
          OR v_content_lower ~* '(puedo|puedes).*(ir|pasar|visitar|ver|atender)')
    THEN
        v_detected_type := 'consultation_request';
        v_confidence := 0.8;
    END IF;
    
    -- Construir resultado
    IF v_detected_type IS NOT NULL THEN
        v_result := jsonb_build_object(
            'has_intent', true,
            'confidence', v_confidence,
            'detection_type', v_detected_type,
            'extracted_info', jsonb_build_object(
                'original_message', p_message_content
            )
        );
    END IF;
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.detect_appointment_intent IS 'Detecta si un mensaje contiene intención de agendar una cita';

-- Función para obtener slots disponibles
CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_user_id uuid,
    p_date date,
    p_appointment_type_id bigint DEFAULT NULL,
    p_duration_minutes integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings record;
    v_appointment_type record;
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
BEGIN
    -- Obtener configuración del usuario
    SELECT * INTO v_settings
    FROM public.appointment_settings
    WHERE user_id = p_user_id AND is_enabled = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('available_slots', '[]'::jsonb, 'error', 'Appointment system not enabled');
    END IF;
    
    -- Obtener tipo de cita si se especifica
    IF p_appointment_type_id IS NOT NULL THEN
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
    
    v_buffer := v_settings.buffer_time_minutes;
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
    
    -- Obtener citas existentes del día
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'start', start_time,
            'end', end_time
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
        
        -- Verificar si hay conflicto con citas existentes
        v_is_available := true;
        
        IF v_existing_appointments IS NOT NULL THEN
            FOR v_slot IN SELECT * FROM jsonb_array_elements(v_existing_appointments) LOOP
                v_slot_start_timestamp := (p_date || ' ' || (v_slot->>'start')::text)::timestamptz;
                v_slot_end_timestamp := (p_date || ' ' || (v_slot->>'end')::text)::timestamptz;
                
                -- Verificar solapamiento (con buffer)
                IF (v_current_slot::text < (v_slot->>'end')::text 
                    AND v_slot_end::text > (v_slot->>'start')::text) THEN
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
        'timezone', v_settings.timezone
    );
END;
$$;

COMMENT ON FUNCTION public.get_available_slots IS 'Calcula los horarios disponibles para agendar una cita en una fecha específica';

