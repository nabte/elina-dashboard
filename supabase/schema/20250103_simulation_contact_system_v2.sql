-- FIX for "column name does not exist" error
-- We are renaming columns to match your existing schema (full_name, phone_number)

CREATE OR REPLACE FUNCTION get_or_create_simulation_contact(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_contact_id BIGINT;
    v_contact RECORD;
BEGIN
    -- 1. Try to find existing simulation contact for this user
    SELECT * INTO v_contact 
    FROM contacts 
    WHERE user_id = p_user_id 
      AND is_simulation = true 
    LIMIT 1;

    -- 2. If found, return it
    IF FOUND THEN
        RETURN to_jsonb(v_contact);
    END IF;

    -- 3. If not found, create a new one
    -- FIX: Changed 'name' to 'full_name' and 'phone' to 'phone_number'
    INSERT INTO contacts (
        user_id, 
        full_name,     -- Correct column name
        phone_number,  -- Correct column name
        is_simulation,
        created_at,
        updated_at
    ) VALUES (
        p_user_id, 
        'Usuario de Simulación', 
        'SIM-' || substring(p_user_id::text from 1 for 8),
        true,
        now(),
        now()
    )
    RETURNING * INTO v_contact;

    RETURN to_jsonb(v_contact);
END;
$$;
