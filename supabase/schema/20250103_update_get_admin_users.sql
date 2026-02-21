-- Update get_all_admin_users to include affiliate data
-- This function is used by Super Admins to view all users.

CREATE OR REPLACE FUNCTION get_all_admin_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    plan_id TEXT,
    status TEXT,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    is_affiliate BOOLEAN,
    referred_by UUID,
    whatsapp_provider TEXT,
    evolution_instance_name TEXT,
    evolution_api_key TEXT,
    whatsapp_provider_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.updated_at as created_at, -- usar updated_at como created_at
        s.plan_id,
        s.status,
        s.trial_ends_at,
        COALESCE(p.is_affiliate, FALSE), -- Ensure boolean return
        p.referred_by,
        p.whatsapp_provider,
        p.evolution_instance_name,
        p.evolution_api_key,
        p.whatsapp_provider_url
    FROM profiles p
    LEFT JOIN subscriptions s ON p.id = s.user_id
    ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
