-- Actualizar flow de tatuaje para usar modo GET_ALL
-- Ejecutar en Supabase SQL Editor

-- 1. Ver flow actual de tatuajes
SELECT id, trigger_text, is_active,
       flow_data->'mode' as current_mode,
       jsonb_array_length(flow_data->'steps') as num_steps
FROM auto_responses
WHERE trigger_text LIKE '%tatuaje%'
AND is_flow = true
AND user_id = 'f2ef49c6-4646-42f8-8130-aa5cd0d3c84f';

-- 2. Actualizar a modo GET_ALL
UPDATE auto_responses
SET flow_data = jsonb_set(
    flow_data,
    '{mode}',
    '"get_all"'::jsonb
)
WHERE id = 5 -- ID del flow de tatuajes
AND user_id = 'f2ef49c6-4646-42f8-8130-aa5cd0d3c84f';

-- 3. Verificar actualización
SELECT id, trigger_text,
       flow_data->'mode' as mode,
       flow_data->'trigger_keywords' as keywords
FROM auto_responses
WHERE id = 5;

-- 4. Limpiar estados activos para testing
DELETE FROM flow_states
WHERE contact_id = 2590702 -- ID de contacto de nabte
AND status IN ('active', 'paused');

-- 5. Verificar limpieza
SELECT COUNT(*) as active_states
FROM flow_states
WHERE contact_id = 2590702
AND status IN ('active', 'paused');
