-- ============================================
-- Configuración de Reset Mensual Automático
-- ============================================
-- Este archivo configura el reset automático de contadores
-- el primer día de cada mes a las 00:00 UTC

-- ============================================
-- Verificar si pg_cron está disponible
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE NOTICE 'pg_cron no está disponible. Se creará una Edge Function alternativa.';
    ELSE
        RAISE NOTICE 'pg_cron está disponible. Configurando cron job...';
    END IF;
END $$;

-- ============================================
-- Eliminar cron job existente si existe
-- ============================================
DO $$
BEGIN
    -- Intentar eliminar el cron job si existe
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('reset-usage-counters-monthly')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'reset-usage-counters-monthly'
        );
        RAISE NOTICE 'Cron job existente eliminado (si existía)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo eliminar el cron job existente: %', SQLERRM;
END $$;

-- ============================================
-- Crear el cron job para reset mensual
-- ============================================
-- Programación: Primer día de cada mes a las 00:00 UTC
-- Formato cron: 'minuto hora día mes día-semana'
-- '0 0 1 * *' = A las 00:00 (medianoche) del día 1 de cada mes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'reset-usage-counters-monthly',           -- Nombre del job
            '0 0 1 * *',                              -- Cron schedule: primer día de cada mes a medianoche UTC
            $$SELECT public.reset_monthly_usage_counters()$$  -- Función a ejecutar
        );
        RAISE NOTICE 'Cron job creado exitosamente: reset-usage-counters-monthly';
    ELSE
        RAISE NOTICE 'pg_cron no está disponible. Usa la Edge Function reset-usage-counters como alternativa.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'No se pudo crear el cron job: %. Usa la Edge Function reset-usage-counters como alternativa.', SQLERRM;
END $$;

-- ============================================
-- Verificar que el cron job se creó correctamente
-- ============================================
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
WHERE jobname = 'reset-usage-counters-monthly';

-- ============================================
-- Comentarios
-- ============================================
COMMENT ON FUNCTION public.reset_monthly_usage_counters() IS 'Resetea todos los contadores de uso a 0. Se ejecuta automáticamente el primer día de cada mes mediante pg_cron o Edge Function';

