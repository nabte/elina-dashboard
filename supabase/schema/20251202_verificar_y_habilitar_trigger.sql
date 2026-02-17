-- ============================================
-- Verificar y Habilitar Trigger - Diagnóstico Completo
-- ============================================

-- Paso 1: Verificar estado REAL del trigger con todos los detalles
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled_code,
    CASE tgenabled
        WHEN 'A' THEN 'Enabled ✅ (Always)'
        WHEN 'O' THEN 'Disabled ❌ (Origin)'
        WHEN 'D' THEN 'Disabled (Replica)'
        WHEN 'R' THEN 'Disabled (Always)'
        ELSE 'Unknown: ' || tgenabled
    END as status_detallado,
    proname as function_name,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'on_auth_user_created';

-- Paso 2: Intentar habilitar el trigger
-- Si tienes permisos, esto funcionará. Si no, verás el error de permisos.
DO $$
BEGIN
    -- Intentar habilitar el trigger
    ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
    RAISE NOTICE 'Trigger habilitado exitosamente ✅';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'No tienes permisos para habilitar el trigger. Debes hacerlo desde el Dashboard de Supabase.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al habilitar trigger: %', SQLERRM;
END $$;

-- Paso 3: Verificar estado después del intento
SELECT 
    tgname as trigger_name,
    CASE tgenabled
        WHEN 'A' THEN 'Enabled ✅'
        WHEN 'O' THEN 'Disabled ❌ - Necesitas habilitarlo desde Dashboard'
        WHEN 'D' THEN 'Disabled (Replica)'
        WHEN 'R' THEN 'Disabled (Always)'
        ELSE 'Unknown: ' || tgenabled
    END as status_final
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

