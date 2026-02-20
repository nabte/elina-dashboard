-- =========================================
-- MIGRACIÓN: Sistema Venom WhatsApp Multi-Tenant (CORREGIDA)
-- Fecha: 2026-02-20
-- Descripción: Tabla y políticas RLS para gestión de instancias Venom
-- =========================================

-- CONTEXTO:
-- Sistema alternativo a Evolution API usando Venom (venom-bot)
-- - Solo nuevas instancias usarán Venom
-- - Evolution API sigue funcionando para instancias actuales
-- - Auto-asignación según nivel de plan del usuario (tabla subscriptions)
-- - SuperAdmin con control total

-- =========================================
-- 1. CREAR TABLA venom_instances
-- =========================================

CREATE TABLE IF NOT EXISTS venom_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected',
    webhook_url TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_connected_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('disconnected', 'connecting', 'qr_ready', 'connected', 'error')),
    CONSTRAINT valid_phone_number CHECK (phone_number IS NULL OR phone_number ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_webhook_url CHECK (webhook_url IS NULL OR webhook_url ~ '^https?://')
);

-- Comentarios
COMMENT ON TABLE venom_instances IS 'Instancias de WhatsApp usando Venom bot (alternativa a Evolution API)';
COMMENT ON COLUMN venom_instances.session_id IS 'ID único de la sesión Venom (e.g., user-ABC123)';
COMMENT ON COLUMN venom_instances.status IS 'Estado de la conexión: disconnected, connecting, qr_ready, connected, error';
COMMENT ON COLUMN venom_instances.webhook_url IS 'URL donde se enviarán los webhooks (formato Baileys compatible)';
COMMENT ON COLUMN venom_instances.config IS 'Configuración adicional de la instancia (JSON)';

-- =========================================
-- 2. CREAR ÍNDICES
-- =========================================

CREATE INDEX idx_venom_instances_user_id ON venom_instances(user_id);
CREATE INDEX idx_venom_instances_session_id ON venom_instances(session_id);
CREATE INDEX idx_venom_instances_status ON venom_instances(status);
CREATE INDEX idx_venom_instances_created_at ON venom_instances(created_at DESC);

-- =========================================
-- 3. HABILITAR ROW LEVEL SECURITY
-- =========================================

ALTER TABLE venom_instances ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 4. POLÍTICAS RLS - USUARIOS
-- =========================================

-- POLÍTICA: Usuarios pueden VER solo sus propias instancias
CREATE POLICY "users_can_read_own_venom_instances"
ON venom_instances FOR SELECT
USING (
    auth.uid() = user_id
);

-- POLÍTICA: Usuarios pueden CREAR instancias con límites según plan
CREATE POLICY "users_can_create_venom_instances"
ON venom_instances FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    (
        -- Contar instancias existentes del usuario
        SELECT COUNT(*)
        FROM venom_instances
        WHERE user_id = auth.uid()
    ) < (
        -- Obtener límite según plan desde tabla subscriptions
        SELECT CASE
            WHEN s.plan_id = 'enterprise' THEN 3
            WHEN s.plan_id = 'business' THEN 1
            ELSE 0  -- free, starter, etc. no pueden crear instancias Venom
        END
        FROM subscriptions s
        WHERE s.user_id = auth.uid()
        LIMIT 1
    )
);

-- POLÍTICA: Usuarios pueden ACTUALIZAR solo sus propias instancias
CREATE POLICY "users_can_update_own_venom_instances"
ON venom_instances FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- POLÍTICA: Usuarios pueden ELIMINAR solo sus propias instancias
CREATE POLICY "users_can_delete_own_venom_instances"
ON venom_instances FOR DELETE
USING (auth.uid() = user_id);

-- =========================================
-- 5. POLÍTICAS RLS - SUPERADMIN
-- =========================================

-- POLÍTICA: SuperAdmin puede hacer TODO
CREATE POLICY "superadmin_full_access_venom_instances"
ON venom_instances FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid() AND role = 'superadmin'
    )
);

-- =========================================
-- 6. TRIGGER: Actualizar updated_at
-- =========================================

CREATE OR REPLACE FUNCTION update_venom_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venom_instances_updated_at
    BEFORE UPDATE ON venom_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_venom_instances_updated_at();

-- =========================================
-- 7. FUNCIÓN: Obtener configuración global de webhook
-- =========================================

CREATE OR REPLACE FUNCTION get_default_venom_webhook_url()
RETURNS TEXT AS $$
BEGIN
    -- URL del message-router de Supabase
    RETURN 'https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/message-router';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_default_venom_webhook_url() IS 'Retorna la URL de webhook por defecto para instancias Venom';

-- =========================================
-- 8. FUNCIÓN: Obtener límite de instancias por plan
-- =========================================

CREATE OR REPLACE FUNCTION get_venom_instance_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_plan TEXT;
    instance_limit INTEGER;
BEGIN
    -- Obtener plan del usuario desde subscriptions
    SELECT s.plan_id INTO user_plan
    FROM subscriptions s
    WHERE s.user_id = user_uuid
    LIMIT 1;

    -- Determinar límite
    instance_limit := CASE user_plan
        WHEN 'enterprise' THEN 3
        WHEN 'business' THEN 1
        ELSE 0
    END;

    RETURN instance_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_venom_instance_limit(UUID) IS 'Retorna el número máximo de instancias Venom permitidas para un usuario según su plan';

-- =========================================
-- 9. FUNCIÓN: Obtener estadísticas de uso
-- =========================================

CREATE OR REPLACE FUNCTION get_venom_usage_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_instances', COUNT(*),
        'connected_instances', COUNT(*) FILTER (WHERE status = 'connected'),
        'disconnected_instances', COUNT(*) FILTER (WHERE status = 'disconnected'),
        'error_instances', COUNT(*) FILTER (WHERE status = 'error'),
        'limit', get_venom_instance_limit(user_uuid),
        'available_slots', GREATEST(0, get_venom_instance_limit(user_uuid) - COUNT(*))
    )
    INTO stats
    FROM venom_instances
    WHERE user_id = user_uuid;

    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_venom_usage_stats(UUID) IS 'Retorna estadísticas de uso de instancias Venom para un usuario';

-- =========================================
-- 10. VERIFICACIONES POST-MIGRACIÓN
-- =========================================

-- Verificar que RLS está activo
DO $$
BEGIN
    IF NOT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'venom_instances' AND schemaname = 'public') THEN
        RAISE EXCEPTION 'RLS no está habilitado en venom_instances';
    END IF;
END $$;

-- Listar políticas creadas
SELECT
    policyname,
    cmd AS operacion,
    permissive AS permisiva,
    CASE
        WHEN policyname LIKE 'users_%' THEN '👤 Usuario'
        WHEN policyname LIKE 'superadmin_%' THEN '⚡ SuperAdmin'
        ELSE '❓ Otro'
    END as tipo
FROM pg_policies
WHERE tablename = 'venom_instances'
ORDER BY cmd, policyname;

-- =========================================
-- FIN DE LA MIGRACIÓN
-- =========================================

-- Confirmar migración exitosa
DO $$
BEGIN
    RAISE NOTICE '✓ Migración 20260220_venom_instances completada exitosamente';
    RAISE NOTICE '✓ Tabla venom_instances creada';
    RAISE NOTICE '✓ RLS habilitado con políticas por plan (usando tabla subscriptions)';
    RAISE NOTICE '✓ Funciones auxiliares creadas';
END $$;
