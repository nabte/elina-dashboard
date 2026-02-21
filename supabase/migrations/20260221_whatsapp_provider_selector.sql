-- ================================================
-- SELECTOR DE PROVEEDOR WHATSAPP (Evolution/Venom)
-- SuperAdmin puede asignar proveedor por usuario
-- ================================================

-- 1. Agregar campos de proveedor a profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT DEFAULT 'evolution'
CHECK (whatsapp_provider IN ('evolution', 'venom'));

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS whatsapp_provider_url TEXT;

COMMENT ON COLUMN profiles.whatsapp_provider IS 
'Proveedor de WhatsApp: evolution o venom';

COMMENT ON COLUMN profiles.whatsapp_provider_url IS 
'URL del proveedor Evolution (para múltiples instancias)';

-- 2. Función para SuperAdmin: Cambiar proveedor de un usuario
CREATE OR REPLACE FUNCTION superadmin_set_whatsapp_provider(
    p_user_id UUID,
    p_provider TEXT,
    p_provider_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    -- Solo superadmin puede ejecutar
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
    ) THEN
        RAISE EXCEPTION 'Solo SuperAdmin puede cambiar proveedor';
    END IF;

    -- Validar proveedor
    IF p_provider NOT IN ('evolution', 'venom') THEN
        RAISE EXCEPTION 'Proveedor inválido. Usar: evolution o venom';
    END IF;

    -- Actualizar proveedor
    UPDATE profiles
    SET
        whatsapp_provider = p_provider,
        whatsapp_provider_url = p_provider_url,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'user_id', p_user_id,
        'provider', p_provider,
        'provider_url', p_provider_url
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vista para SuperAdmin con info de proveedor
CREATE OR REPLACE VIEW superadmin_users_whatsapp AS
SELECT
    p.id,
    p.full_name,
    p.email,
    p.whatsapp_provider,
    p.whatsapp_provider_url,
    p.evolution_instance_name,
    s.plan_id,

    -- Info Evolution si aplica
    CASE
        WHEN p.whatsapp_provider = 'evolution' THEN p.evolution_instance_name
        ELSE NULL
    END as evolution_instance,

    -- Info Venom si aplica
    CASE
        WHEN p.whatsapp_provider = 'venom' THEN v.session_id
        ELSE NULL
    END as venom_session,

    CASE
        WHEN p.whatsapp_provider = 'venom' THEN v.status
        ELSE NULL
    END as venom_status

FROM profiles p
LEFT JOIN subscriptions s ON s.user_id = p.id
LEFT JOIN venom_instances v ON v.user_id = p.id
WHERE p.role != 'superadmin';

GRANT SELECT ON superadmin_users_whatsapp TO authenticated;

-- 4. Establecer Evolution como default para usuarios existentes
UPDATE profiles
SET whatsapp_provider = 'evolution'
WHERE whatsapp_provider IS NULL;
