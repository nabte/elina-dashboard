-- ============================================
-- Sistema de Recordatorios Inteligentes para Citas
-- Extiende el sistema existente para soportar múltiples recordatorios,
-- configuración por servicio, y estados de confirmación
-- ============================================

-- 1. Extender tabla appointment_reminders para múltiples recordatorios
DO $$
BEGIN
    -- Agregar reminder_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_reminders' 
        AND column_name = 'reminder_type'
    ) THEN
        ALTER TABLE public.appointment_reminders 
        ADD COLUMN reminder_type text DEFAULT 'custom' CHECK (reminder_type IN ('24h_before', '2h_before', 'days_before', 'custom'));
        
        COMMENT ON COLUMN public.appointment_reminders.reminder_type IS 'Tipo de recordatorio: 24h_before, 2h_before, days_before, o custom';
    END IF;

    -- Agregar reminder_days_before
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_reminders' 
        AND column_name = 'reminder_days_before'
    ) THEN
        ALTER TABLE public.appointment_reminders 
        ADD COLUMN reminder_days_before integer;
        
        COMMENT ON COLUMN public.appointment_reminders.reminder_days_before IS 'Número de días antes de la cita (solo para reminder_type = days_before)';
    END IF;

    -- Agregar contact_phone (caché del teléfono)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_reminders' 
        AND column_name = 'contact_phone'
    ) THEN
        ALTER TABLE public.appointment_reminders 
        ADD COLUMN contact_phone text;
        
        COMMENT ON COLUMN public.appointment_reminders.contact_phone IS 'Número de teléfono del contacto al momento de crear el recordatorio (caché)';
    END IF;

    -- Agregar confirmation_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_reminders' 
        AND column_name = 'confirmation_status'
    ) THEN
        ALTER TABLE public.appointment_reminders 
        ADD COLUMN confirmation_status text CHECK (confirmation_status IN ('pending', 'confirmed', 'cancelled'));
        
        COMMENT ON COLUMN public.appointment_reminders.confirmation_status IS 'Estado de confirmación del cliente: pending, confirmed, cancelled';
    END IF;
END $$;

-- 2. Extender appointment_settings con nuevas opciones
DO $$
BEGIN
    -- reminder_24h_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_settings' 
        AND column_name = 'reminder_24h_enabled'
    ) THEN
        ALTER TABLE public.appointment_settings 
        ADD COLUMN reminder_24h_enabled boolean DEFAULT true NOT NULL;
        
        COMMENT ON COLUMN public.appointment_settings.reminder_24h_enabled IS 'Activar recordatorio 24 horas antes de la cita';
    END IF;

    -- reminder_2h_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_settings' 
        AND column_name = 'reminder_2h_enabled'
    ) THEN
        ALTER TABLE public.appointment_settings 
        ADD COLUMN reminder_2h_enabled boolean DEFAULT true NOT NULL;
        
        COMMENT ON COLUMN public.appointment_settings.reminder_2h_enabled IS 'Activar recordatorio 2 horas antes de la cita';
    END IF;

    -- reminder_days_before
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_settings' 
        AND column_name = 'reminder_days_before'
    ) THEN
        ALTER TABLE public.appointment_settings 
        ADD COLUMN reminder_days_before integer DEFAULT 1 NOT NULL CHECK (reminder_days_before > 0);
        
        COMMENT ON COLUMN public.appointment_settings.reminder_days_before IS 'Número de días antes de la cita para enviar recordatorio (default: 1 día)';
    END IF;

    -- Actualizar reminder_time_before_minutes para que sea el tiempo del recordatorio de 2 horas (120 minutos)
    -- Solo si no se ha configurado previamente o si es el valor por defecto de 24 horas
    UPDATE public.appointment_settings
    SET reminder_time_before_minutes = 120
    WHERE reminder_time_before_minutes = 1440; -- Si está en el default de 24h, cambiarlo a 2h
END $$;

-- 3. Crear tabla de configuración de recordatorios por servicio
CREATE TABLE IF NOT EXISTS public.product_reminder_settings (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id bigint NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_enabled boolean DEFAULT true NOT NULL,
    reminder_24h_enabled boolean DEFAULT true NOT NULL,
    reminder_2h_enabled boolean DEFAULT true NOT NULL,
    reminder_days_before integer CHECK (reminder_days_before > 0),
    reminder_message_template text,
    created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS product_reminder_settings_product_idx ON public.product_reminder_settings (product_id);
CREATE INDEX IF NOT EXISTS product_reminder_settings_user_idx ON public.product_reminder_settings (user_id);

COMMENT ON TABLE public.product_reminder_settings IS 'Configuración específica de recordatorios por servicio/producto. Si no existe, se usa la configuración global';

-- Habilitar RLS
ALTER TABLE public.product_reminder_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para product_reminder_settings
DROP POLICY IF EXISTS "Users can view own product reminder settings" ON public.product_reminder_settings;
CREATE POLICY "Users can view own product reminder settings"
    ON public.product_reminder_settings
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own product reminder settings" ON public.product_reminder_settings;
CREATE POLICY "Users can insert own product reminder settings"
    ON public.product_reminder_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own product reminder settings" ON public.product_reminder_settings;
CREATE POLICY "Users can update own product reminder settings"
    ON public.product_reminder_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own product reminder settings" ON public.product_reminder_settings;
CREATE POLICY "Users can delete own product reminder settings"
    ON public.product_reminder_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_product_reminder_settings_updated_at ON public.product_reminder_settings;
CREATE TRIGGER trg_product_reminder_settings_updated_at
    BEFORE UPDATE ON public.product_reminder_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. Agregar confirmation_status a meetings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'meetings' 
        AND column_name = 'confirmation_status'
    ) THEN
        ALTER TABLE public.meetings 
        ADD COLUMN confirmation_status text DEFAULT 'draft' NOT NULL CHECK (confirmation_status IN ('draft', 'pending', 'confirmed', 'cancelled'));
        
        COMMENT ON COLUMN public.meetings.confirmation_status IS 'Estado de confirmación: draft (borrador), pending (esperando confirmación), confirmed (confirmado), cancelled (cancelado)';
    END IF;
END $$;

-- 5. Reemplazar función create_appointment_reminder() para crear múltiples recordatorios
CREATE OR REPLACE FUNCTION public.create_appointment_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings record;
    v_product_settings record;
    v_reminder_time timestamptz;
    v_message text;
    v_contact_name text;
    v_contact_phone text;
    v_title text;
    v_service_name text;
    v_reminder_days integer;
    v_reminder_24h_enabled boolean;
    v_reminder_2h_enabled boolean;
    v_reminder_days_enabled boolean;
    v_message_template text;
BEGIN
    -- Solo procesar si la cita está confirmada o pendiente
    IF NEW.status NOT IN ('confirmed', 'pending') THEN
        RETURN NEW;
    END IF;

    -- Obtener configuración de recordatorios del usuario (global)
    SELECT 
        reminders_enabled, 
        reminder_24h_enabled,
        reminder_2h_enabled,
        reminder_days_before,
        reminder_message_template
    INTO v_settings
    FROM public.appointment_settings
    WHERE user_id = NEW.user_id AND is_enabled = true;

    -- Si los recordatorios no están habilitados globalmente, no hacer nada
    IF NOT FOUND OR NOT v_settings.reminders_enabled THEN
        RETURN NEW;
    END IF;

    -- Verificar si hay configuración específica para el servicio
    IF NEW.product_id IS NOT NULL THEN
        SELECT 
            reminder_enabled,
            reminder_24h_enabled,
            reminder_2h_enabled,
            reminder_days_before,
            reminder_message_template
        INTO v_product_settings
        FROM public.product_reminder_settings
        WHERE product_id = NEW.product_id AND user_id = NEW.user_id;

        -- Si existe configuración por servicio, usarla (sobrescribe la global)
        IF FOUND THEN
            IF NOT v_product_settings.reminder_enabled THEN
                RETURN NEW; -- Recordatorios deshabilitados para este servicio
            END IF;
            v_reminder_24h_enabled := v_product_settings.reminder_24h_enabled;
            v_reminder_2h_enabled := v_product_settings.reminder_2h_enabled;
            v_reminder_days_enabled := true; -- Si hay configuración por servicio, asumimos que está habilitado
            v_reminder_days := COALESCE(v_product_settings.reminder_days_before, v_settings.reminder_days_before);
            v_message_template := COALESCE(v_product_settings.reminder_message_template, v_settings.reminder_message_template);
        ELSE
            -- Usar configuración global
            v_reminder_24h_enabled := v_settings.reminder_24h_enabled;
            v_reminder_2h_enabled := v_settings.reminder_2h_enabled;
            v_reminder_days_enabled := true; -- Asumimos que está habilitado si no hay configuración específica
            v_reminder_days := v_settings.reminder_days_before;
            v_message_template := v_settings.reminder_message_template;
        END IF;
    ELSE
        -- Usar configuración global
        v_reminder_24h_enabled := v_settings.reminder_24h_enabled;
        v_reminder_2h_enabled := v_settings.reminder_2h_enabled;
        v_reminder_days_enabled := true;
        v_reminder_days := v_settings.reminder_days_before;
        v_message_template := v_settings.reminder_message_template;
    END IF;

    -- Obtener información del contacto
    IF NEW.contact_id IS NOT NULL THEN
        SELECT full_name, phone_number INTO v_contact_name, v_contact_phone
        FROM public.contacts
        WHERE id = NEW.contact_id;
    END IF;

    -- Obtener nombre del servicio si existe
    IF NEW.product_id IS NOT NULL THEN
        SELECT product_name INTO v_service_name
        FROM public.products
        WHERE id = NEW.product_id AND user_id = NEW.user_id;
    END IF;

    v_title := NEW.summary;
    v_contact_name := COALESCE(v_contact_name, 'Cliente');
    v_service_name := COALESCE(v_service_name, 'Cita');

    -- Cancelar recordatorios anteriores para esta cita (si se está actualizando)
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.appointment_reminders
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE meeting_id = NEW.id
          AND status = 'pending';
    END IF;

    -- Crear recordatorio de días antes (si está habilitado)
    IF v_reminder_days_enabled AND v_reminder_days > 0 THEN
        v_reminder_time := NEW.start_time - (v_reminder_days || ' days')::interval;
        
        IF v_reminder_time > NOW() THEN
            v_message := build_reminder_message(
                v_message_template,
                v_title,
                v_service_name,
                v_contact_name,
                NEW.start_time
            );

            INSERT INTO public.appointment_reminders (
                user_id,
                meeting_id,
                scheduled_for,
                message,
                status,
                reminder_type,
                reminder_days_before,
                contact_phone
            ) VALUES (
                NEW.user_id,
                NEW.id,
                v_reminder_time,
                v_message,
                'pending',
                'days_before',
                v_reminder_days,
                v_contact_phone
            );
        END IF;
    END IF;

    -- Crear recordatorio de 24 horas antes (si está habilitado)
    IF v_reminder_24h_enabled THEN
        v_reminder_time := NEW.start_time - interval '24 hours';
        
        IF v_reminder_time > NOW() THEN
            v_message := build_reminder_message(
                v_message_template,
                v_title,
                v_service_name,
                v_contact_name,
                NEW.start_time
            );

            INSERT INTO public.appointment_reminders (
                user_id,
                meeting_id,
                scheduled_for,
                message,
                status,
                reminder_type,
                contact_phone
            ) VALUES (
                NEW.user_id,
                NEW.id,
                v_reminder_time,
                v_message,
                'pending',
                '24h_before',
                v_contact_phone
            );
        END IF;
    END IF;

    -- Crear recordatorio de 2 horas antes (si está habilitado)
    IF v_reminder_2h_enabled THEN
        v_reminder_time := NEW.start_time - interval '2 hours';
        
        IF v_reminder_time > NOW() THEN
            v_message := build_reminder_message(
                v_message_template,
                v_title,
                v_service_name,
                v_contact_name,
                NEW.start_time
            );

            INSERT INTO public.appointment_reminders (
                user_id,
                meeting_id,
                scheduled_for,
                message,
                status,
                reminder_type,
                contact_phone
            ) VALUES (
                NEW.user_id,
                NEW.id,
                v_reminder_time,
                v_message,
                'pending',
                '2h_before',
                v_contact_phone
            );
        END IF;
    END IF;

    -- Actualizar confirmation_status de la cita a 'pending' si estaba en 'draft'
    IF NEW.confirmation_status = 'draft' THEN
        UPDATE public.meetings
        SET confirmation_status = 'pending'
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Crear función helper para construir mensajes (si no existe)
CREATE OR REPLACE FUNCTION public.build_reminder_message(
    p_template text,
    p_title text,
    p_service_name text,
    p_contact_name text,
    p_start_time timestamptz
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_msg text;
    v_date_str text;
    v_time_str text;
    v_full_date_str text;
BEGIN
    v_date_str := TO_CHAR(p_start_time, 'DD "de" Month');
    v_time_str := TO_CHAR(p_start_time, 'HH12:MI AM');
    v_full_date_str := TO_CHAR(p_start_time, 'DD "de" Month "de" YYYY');

    IF p_template IS NOT NULL AND p_template != '' THEN
        v_msg := p_template;
        v_msg := REPLACE(v_msg, '{nombre}', p_contact_name);
        v_msg := REPLACE(v_msg, '{servicio}', p_service_name);
        v_msg := REPLACE(v_msg, '{fecha}', v_date_str);
        v_msg := REPLACE(v_msg, '{hora}', v_time_str);
        v_msg := REPLACE(v_msg, '{fecha_completa}', v_full_date_str);
        v_msg := REPLACE(v_msg, '{title}', COALESCE(p_title, 'Cita'));
        v_msg := REPLACE(v_msg, '{date}', TO_CHAR(p_start_time, 'DD/MM/YYYY'));
        v_msg := REPLACE(v_msg, '{time}', TO_CHAR(p_start_time, 'HH24:MI'));
        v_msg := REPLACE(v_msg, '{contact_name}', p_contact_name);
    ELSE
        -- Mensaje por defecto
        v_msg := format(
            'Hola %s, te recordamos que tienes una cita de %s el día %s a las %s. Por favor confirma tu asistencia respondiendo a este mensaje.',
            p_contact_name,
            p_service_name,
            v_date_str,
            v_time_str
        );
    END IF;
    RETURN v_msg;
END;
$$;

COMMENT ON FUNCTION public.create_appointment_reminder() IS 'Crea automáticamente múltiples recordatorios (días antes, 24h antes, 2h antes) cuando se crea o actualiza una cita confirmada/pendiente';
COMMENT ON FUNCTION public.build_reminder_message IS 'Construye el mensaje de recordatorio reemplazando variables en la plantilla';

-- Actualizar trigger para incluir product_id y confirmation_status
DROP TRIGGER IF EXISTS trg_create_appointment_reminder ON public.meetings;

CREATE TRIGGER trg_create_appointment_reminder
    AFTER INSERT OR UPDATE OF start_time, status, contact_id, summary, product_id, confirmation_status ON public.meetings
    FOR EACH ROW
    WHEN (NEW.status IN ('confirmed', 'pending'))
    EXECUTE FUNCTION public.create_appointment_reminder();

