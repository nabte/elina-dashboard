-- Actualizar get_all_admin_users para incluir campos WhatsApp
-- Permite que SuperAdmin vea y edite configuración WhatsApp de usuarios

-- Eliminar función existente primero (necesario para cambiar tipo de retorno)
DROP FUNCTION IF EXISTS get_all_admin_users();

-- Recrear función con nuevos campos
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
        p.created_at,
        s.plan_id,
        s.status,
        s.trial_ends_at,
        COALESCE(p.is_affiliate, FALSE),
        p.referred_by,
        p.whatsapp_provider,
        p.evolution_instance_name,
        p.evolution_api_key,
        p.whatsapp_provider_url
    FROM profiles p
    LEFT JOIN subscriptions s ON p.id = s.user_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
