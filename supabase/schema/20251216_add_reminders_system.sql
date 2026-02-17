-- ============================================
-- Sistema de Recordatorios para Citas
-- ============================================

-- 1. Agregar columnas de configuración de recordatorios a appointment_settings
DO $$
BEGIN
    -- reminders_enabled: activar/desactivar recordatorios automáticos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_settings' 
        AND column_name = 'reminders_enabled'
    ) THEN
        ALTER TABLE public.appointment_settings 
        ADD COLUMN reminders_enabled boolean DEFAULT false NOT NULL;
        
        COMMENT ON COLUMN public.appointment_settings.reminders_enabled IS 'Activar/desactivar recordatorios automáticos para citas';
    END IF;

    -- reminder_time_before_minutes: tiempo antes de la cita para enviar recordatorio
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_settings' 
        AND column_name = 'reminder_time_before_minutes'
    ) THEN
        ALTER TABLE public.appointment_settings 
        ADD COLUMN reminder_time_before_minutes integer DEFAULT 1440; -- 24 horas por defecto
        
        COMMENT ON COLUMN public.appointment_settings.reminder_time_before_minutes IS 'Tiempo en minutos antes de la cita para enviar el recordatorio (ej: 1440 = 24 horas)';
        
        -- Constraint: debe ser positivo
        ALTER TABLE public.appointment_settings
        ADD CONSTRAINT check_reminder_time_before_minutes 
        CHECK (reminder_time_before_minutes > 0);
    END IF;

    -- reminder_message_template: plantilla de mensaje personalizado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_settings' 
        AND column_name = 'reminder_message_template'
    ) THEN
        ALTER TABLE public.appointment_settings 
        ADD COLUMN reminder_message_template text;
        
        COMMENT ON COLUMN public.appointment_settings.reminder_message_template IS 'Plantilla de mensaje para recordatorios. Variables disponibles: {title}, {date}, {time}, {contact_name}';
    END IF;
END $$;

-- 2. Crear tabla para almacenar recordatorios programados
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_id bigint NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    scheduled_for timestamptz NOT NULL, -- Cuándo debe enviarse el recordatorio
    sent_at timestamptz, -- Cuándo se envió realmente (NULL si no se ha enviado)
    message text NOT NULL, -- Mensaje del recordatorio
    status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message text, -- Mensaje de error si falla el envío
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS appointment_reminders_user_idx ON public.appointment_reminders (user_id, status);
CREATE INDEX IF NOT EXISTS appointment_reminders_meeting_idx ON public.appointment_reminders (meeting_id);
CREATE INDEX IF NOT EXISTS appointment_reminders_scheduled_idx ON public.appointment_reminders (scheduled_for, status) WHERE status = 'pending';

COMMENT ON TABLE public.appointment_reminders IS 'Recordatorios programados para citas. Se procesan por un job/cron que busca recordatorios pendientes';

-- 3. Función para crear recordatorio automáticamente al crear/actualizar una cita
CREATE OR REPLACE FUNCTION public.create_appointment_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings record;
    v_reminder_time timestamptz;
    v_message text;
    v_contact_name text;
    v_title text;
BEGIN
    -- Solo procesar si la cita está confirmada o pendiente
    IF NEW.status NOT IN ('confirmed', 'pending') THEN
        RETURN NEW;
    END IF;

    -- Obtener configuración de recordatorios del usuario
    SELECT reminders_enabled, reminder_time_before_minutes, reminder_message_template
    INTO v_settings
    FROM public.appointment_settings
    WHERE user_id = NEW.user_id AND is_enabled = true;

    -- Si los recordatorios no están habilitados, no hacer nada
    IF NOT FOUND OR NOT v_settings.reminders_enabled THEN
        RETURN NEW;
    END IF;

    -- Calcular cuándo debe enviarse el recordatorio
    v_reminder_time := NEW.start_time - (v_settings.reminder_time_before_minutes || ' minutes')::interval;

    -- Si el recordatorio debería haberse enviado ya (en el pasado), no crear
    IF v_reminder_time <= NOW() THEN
        RETURN NEW;
    END IF;

    -- Obtener información del contacto si existe
    IF NEW.contact_id IS NOT NULL THEN
        SELECT full_name INTO v_contact_name
        FROM public.contacts
        WHERE id = NEW.contact_id;
    END IF;

    v_title := NEW.summary;
    v_contact_name := COALESCE(v_contact_name, 'Cliente');

    -- Construir mensaje usando plantilla o mensaje por defecto
    IF v_settings.reminder_message_template IS NOT NULL AND v_settings.reminder_message_template != '' THEN
        v_message := v_settings.reminder_message_template;
        v_message := REPLACE(v_message, '{title}', COALESCE(v_title, 'Cita'));
        v_message := REPLACE(v_message, '{date}', TO_CHAR(NEW.start_time, 'DD/MM/YYYY'));
        v_message := REPLACE(v_message, '{time}', TO_CHAR(NEW.start_time, 'HH24:MI'));
        v_message := REPLACE(v_message, '{contact_name}', v_contact_name);
    ELSE
        -- Mensaje por defecto
        v_message := format(
            'Recordatorio: Tienes una cita "%s" con %s el %s a las %s',
            COALESCE(v_title, 'Cita'),
            v_contact_name,
            TO_CHAR(NEW.start_time, 'DD/MM/YYYY'),
            TO_CHAR(NEW.start_time, 'HH24:MI')
        );
    END IF;

    -- Cancelar recordatorios anteriores para esta cita (si se está actualizando)
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.appointment_reminders
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE meeting_id = NEW.id
          AND status = 'pending';
    END IF;

    -- Crear nuevo recordatorio
    INSERT INTO public.appointment_reminders (
        user_id,
        meeting_id,
        scheduled_for,
        message,
        status
    ) VALUES (
        NEW.user_id,
        NEW.id,
        v_reminder_time,
        v_message,
        'pending'
    );

    RETURN NEW;
END;
$$;

-- 4. Crear trigger para crear recordatorios automáticamente
DROP TRIGGER IF EXISTS trg_create_appointment_reminder ON public.meetings;

CREATE TRIGGER trg_create_appointment_reminder
    AFTER INSERT OR UPDATE OF start_time, status, contact_id, summary ON public.meetings
    FOR EACH ROW
    WHEN (NEW.status IN ('confirmed', 'pending'))
    EXECUTE FUNCTION public.create_appointment_reminder();

COMMENT ON FUNCTION public.create_appointment_reminder() IS 'Crea automáticamente un recordatorio cuando se crea o actualiza una cita confirmada/pendiente';

