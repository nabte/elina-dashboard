-- ========================================
-- MIGRACIÓN: Evolution API → Venom Bot
-- Fecha: 2026-02-21
-- ========================================

-- 1. Agregar columna de formato de imagen a venom_instances
ALTER TABLE venom_instances
ADD COLUMN IF NOT EXISTS image_format TEXT DEFAULT 'url'
CHECK (image_format IN ('url', 'base64'));

COMMENT ON COLUMN venom_instances.image_format IS
'Formato de envío de imágenes: url (rápido) o base64 (compatible)';

-- 2. Deprecar campos de Evolution en profiles (mantener por historial)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS migrated_to_venom BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.migrated_to_venom IS
'Indica si el usuario migró de Evolution a Venom';

-- 3. Función helper: Obtener instancia activa de un usuario
CREATE OR REPLACE FUNCTION get_user_venom_instance(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'id', v.id,
        'session_id', v.session_id,
        'status', v.status,
        'phone_number', v.phone_number,
        'webhook_url', v.webhook_url,
        'image_format', v.image_format,
        'created_at', v.created_at,
        'last_connected_at', v.last_connected_at
    )
    INTO result
    FROM venom_instances v
    WHERE v.user_id = user_uuid
    LIMIT 1;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Vista para SuperAdmin (todas las instancias con info de usuario)
CREATE OR REPLACE VIEW superadmin_venom_instances AS
SELECT
    v.id,
    v.session_id,
    v.user_id,
    p.full_name,
    p.email,
    s.plan_id,
    v.phone_number,
    v.status,
    v.webhook_url,
    v.image_format,
    v.config,
    v.created_at,
    v.updated_at,
    v.last_connected_at
FROM venom_instances v
JOIN profiles p ON v.user_id = p.id
LEFT JOIN subscriptions s ON s.user_id = p.id;

GRANT SELECT ON superadmin_venom_instances TO authenticated;

-- 5. Función para SuperAdmin: Actualizar configuración de instancia
CREATE OR REPLACE FUNCTION superadmin_update_venom_config(
    p_instance_id UUID,
    p_webhook_url TEXT DEFAULT NULL,
    p_image_format TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    -- Solo superadmin puede ejecutar
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
    ) THEN
        RAISE EXCEPTION 'Solo SuperAdmin puede actualizar configuración';
    END IF;

    -- Actualizar campos no nulos
    UPDATE venom_instances
    SET
        webhook_url = COALESCE(p_webhook_url, webhook_url),
        image_format = COALESCE(p_image_format, image_format),
        updated_at = now()
    WHERE id = p_instance_id;

    RETURN json_build_object('success', true, 'instance_id', p_instance_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
