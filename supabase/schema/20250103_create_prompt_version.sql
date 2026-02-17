-- Function: create_prompt_version
-- Creates a new version of the prompt, handling version number incrementing
CREATE OR REPLACE FUNCTION create_prompt_version(
    p_user_id UUID,
    p_prompt_content TEXT,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_version INTEGER;
    v_id UUID;
    v_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_new_version
    FROM prompt_versions
    WHERE user_id = p_user_id;

    -- Insert the new version
    INSERT INTO prompt_versions (user_id, prompt_content, version_number, change_reason)
    VALUES (p_user_id, p_prompt_content, v_new_version, p_change_reason)
    RETURNING prompt_versions.id, prompt_versions.created_at
    INTO v_id, v_created_at;

    -- Return the result
    RETURN QUERY SELECT v_id, v_new_version, v_created_at;
END;
$$;
