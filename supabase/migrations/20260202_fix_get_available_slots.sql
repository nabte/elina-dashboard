CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_user_id uuid,
    p_date date,
    p_appointment_type_id bigint DEFAULT NULL::bigint,
    p_duration_minutes integer DEFAULT NULL::integer,
    p_product_id bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_settings record;
    v_duration integer;
    v_buffer integer;
    v_day_of_week integer;
    v_work_start time;
    v_work_end time;
    v_slot_start timestamp; 
    v_slot_end timestamp;
    v_slots jsonb := '[]'::jsonb;
    v_meeting record;
    v_is_available boolean;
    v_date_start timestamp;
    v_date_end timestamp;
    v_timezone text;
    v_now timestamp;
    v_max_per_day integer;
    v_current_count integer;
    
    -- Variables for meeting times in user TZ
    m_start timestamp;
    m_end timestamp;
BEGIN
    -- 1. Get Settings
    SELECT * INTO v_settings FROM public.appointment_settings WHERE user_id = p_user_id AND is_enabled = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('available_slots', '[]'::jsonb, 'error', 'Appointment system not enabled');
    END IF;

    v_timezone := COALESCE(v_settings.timezone, 'America/Mexico_City');
    v_max_per_day := v_settings.max_appointments_per_day;

    -- 2. Check Daily Limit
    IF v_max_per_day IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.meetings
        WHERE user_id = p_user_id
        AND status IN ('confirmed', 'pending')
        AND start_time >= (p_date::text || ' 00:00:00')::timestamptz
        AND start_time <= (p_date::text || ' 23:59:59')::timestamptz;
        
        IF v_current_count >= v_max_per_day THEN
             RETURN jsonb_build_object('available_slots', '[]'::jsonb, 'error', 'Maximum appointments per day reached');
        END IF;
    END IF;

    -- 3. Determine Duration
    IF p_duration_minutes IS NOT NULL THEN
        v_duration := p_duration_minutes;
    ELSIF p_appointment_type_id IS NOT NULL THEN
        SELECT duration_minutes INTO v_duration FROM public.appointment_types WHERE id = p_appointment_type_id;
    ELSIF p_product_id IS NOT NULL THEN
        SELECT service_duration_minutes INTO v_duration FROM public.products WHERE id = p_product_id;
    ELSE
        v_duration := COALESCE(v_settings.default_duration_minutes, 60);
    END IF;
    
    v_duration := COALESCE(v_duration, 60);
    v_buffer := COALESCE(v_settings.buffer_time_minutes, 0);

    -- 4. Get Working Hours
    v_day_of_week := EXTRACT(DOW FROM p_date); -- 0=Sun, 6=Sat
    
    SELECT start_time, end_time INTO v_work_start, v_work_end
    FROM public.appointment_hours
    WHERE user_id = p_user_id AND day_of_week = v_day_of_week AND is_available = true;

    IF NOT FOUND THEN
         RETURN jsonb_build_object('available_slots', '[]'::jsonb, 'error', 'No hours configured for this day');
    END IF;

    -- Define boundaries (Wall Time)
    v_date_start := (p_date::text || ' ' || v_work_start)::timestamp;
    v_date_end := (p_date::text || ' ' || v_work_end)::timestamp;
    
    -- Current time in user timezone (Wall Time)
    -- now() is timestamptz. AT TIME ZONE v_timezone gives wall time timestamp.
    v_now := now() AT TIME ZONE v_timezone;

    -- 5. Iterate Slots (Step: 15 minutes)
    v_slot_start := v_date_start;
    
    WHILE v_slot_start + (v_duration || ' minutes')::interval <= v_date_end LOOP
         v_slot_end := v_slot_start + (v_duration || ' minutes')::interval;
         v_is_available := TRUE;

         -- Filter past slots
         IF v_slot_start < v_now THEN
             v_is_available := FALSE;
         END IF;

         -- Check overlaps only if still available
         IF v_is_available THEN
             FOR v_meeting IN 
                SELECT start_time, end_time 
                FROM public.meetings 
                WHERE user_id = p_user_id 
                AND status IN ('confirmed', 'pending')
                -- Broad filter: Anything that overlaps with the WHOLE DAY (in UTC)
                AND start_time < ((v_date_end + '1 day'::interval) AT TIME ZONE v_timezone AT TIME ZONE 'UTC')
                AND end_time > ((v_date_start - '1 day'::interval) AT TIME ZONE v_timezone AT TIME ZONE 'UTC')
             LOOP
                -- Convert meeting times to Wall Time in User TZ
                m_start := v_meeting.start_time AT TIME ZONE v_timezone;
                m_end := v_meeting.end_time AT TIME ZONE v_timezone;

                -- Check Intersection with Buffer logic
                -- Condition: (SlotStart < MeetingEnd + Buffer) AND (SlotEnd + Buffer > MeetingStart)
                -- This ensures a gap of at least Buffer minutes between the two events.
                IF (v_slot_start < (m_end + (v_buffer || ' minutes')::interval)) AND 
                   ((v_slot_end + (v_buffer || ' minutes')::interval) > m_start) THEN
                   
                   v_is_available := FALSE;
                   EXIT; -- Exit inner loop
                END IF;
             END LOOP;
         END IF;

         IF v_is_available THEN
             v_slots := v_slots || jsonb_build_object(
                 'start', to_char(v_slot_start, 'HH24:MI'),
                 'end', to_char(v_slot_end, 'HH24:MI'),
                 'duration_minutes', v_duration
             );
         END IF;

         -- Increment
         v_slot_start := v_slot_start + '15 minutes'::interval;
    END LOOP;

    RETURN jsonb_build_object('available_slots', v_slots);
END;
$function$;
