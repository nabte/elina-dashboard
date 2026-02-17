-- Add is_simulation column to contacts if it does not exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'is_simulation') THEN
        ALTER TABLE contacts ADD COLUMN is_simulation BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index for faster retrieval of simulation contacts
CREATE INDEX IF NOT EXISTS idx_contacts_simulation ON contacts(user_id, is_simulation);

-- Function to Get or Create a Simulation Contact for a User
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
    -- We assume 'full_name' and 'phone_number' based on your previous errors
    INSERT INTO contacts (
        user_id, 
        full_name,
        phone_number,
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
