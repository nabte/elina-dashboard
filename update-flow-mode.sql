-- Activar modo GET_ALL en flow de tatuajes
UPDATE auto_responses
SET flow_data = jsonb_set(flow_data, '{mode}', '"get_all"'::jsonb)
WHERE id = 5
AND user_id = 'f2ef49c6-4646-42f8-8130-aa5cd0d3c84f';

-- Limpiar estados activos para testing limpio
DELETE FROM flow_states
WHERE contact_id = 2590702
AND status IN ('active', 'paused');
