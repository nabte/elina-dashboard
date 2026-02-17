-- ============================================
-- Configuración de Cron Job para Reset Mensual
-- ============================================
-- Este archivo configura pg_cron para resetear los contadores
-- automáticamente el primer día de cada mes a las 00:00 UTC

-- IMPORTANTE: pg_cron debe estar habilitado en tu instancia de Supabase
-- Si no está habilitado, contacta con el soporte de Supabase o usa la Opción 2 (Edge Function)

-- ============================================
-- Verificar si pg_cron está disponible
-- ============================================
-- Ejecuta esto primero para verificar:
-- SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Si no existe, intenta habilitarlo (requiere permisos de superusuario):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- Eliminar cron job existente si existe
-- ============================================
-- Esto evita duplicados si ejecutas el script múltiples veces
SELECT cron.unschedule('reset-usage-counters-monthly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reset-usage-counters-monthly'
);

-- ============================================
-- Crear el cron job para reset mensual
-- ============================================
-- Programación: Primer día de cada mes a las 00:00 UTC
-- Formato cron: 'minuto hora día mes día-semana'
-- '0 0 1 * *' = A las 00:00 (medianoche) del día 1 de cada mes
SELECT cron.schedule(
  'reset-usage-counters-monthly',           -- Nombre del job
  '0 0 1 * *',                              -- Cron schedule: primer día de cada mes a medianoche UTC
  $$SELECT public.reset_monthly_usage_counters()$$  -- Función a ejecutar
);

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
-- Notas importantes:
-- ============================================
-- 1. El cron job se ejecutará automáticamente el primer día de cada mes
-- 2. La hora es UTC, ajusta según tu zona horaria si es necesario
-- 3. Para cambiar la hora, modifica '0 0 1 * *':
--    - '0 2 1 * *' = 02:00 UTC (medianoche en México)
--    - '0 6 1 * *' = 06:00 UTC
-- 4. Para probar manualmente sin esperar al primer día:
--    SELECT public.reset_monthly_usage_counters();
-- 5. Para ver el historial de ejecuciones:
--    SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-usage-counters-monthly');

-- ============================================
-- Comandos útiles para gestión del cron job
-- ============================================

-- Ver todos los cron jobs activos
-- SELECT * FROM cron.job;

-- Ver historial de ejecuciones del último mes
-- SELECT 
--   jobid,
--   runid,
--   job_pid,
--   database,
--   username,
--   command,
--   status,
--   return_message,
--   start_time,
--   end_time
-- FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-usage-counters-monthly')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Desactivar temporalmente el cron job (sin eliminarlo)
-- UPDATE cron.job SET active = false WHERE jobname = 'reset-usage-counters-monthly';

-- Reactivar el cron job
-- UPDATE cron.job SET active = true WHERE jobname = 'reset-usage-counters-monthly';

-- Eliminar el cron job completamente
-- SELECT cron.unschedule('reset-usage-counters-monthly');

