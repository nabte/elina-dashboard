# 🔄 Sistema de Reset Mensual de Contadores

## 📋 Descripción

Este documento explica cómo configurar el reset automático de los contadores de uso (texto, imágenes, videos) cada primer día del mes.

## 🗄️ Funciones SQL Creadas

Se han creado las siguientes funciones en `supabase/schema/20251201_usage_counters_and_reset.sql`:

1. **`increment_text_usage(p_user_id uuid)`** - Incrementa contador de mejoras de texto
2. **`increment_image_usage(p_user_id uuid)`** - Incrementa contador de generaciones de imágenes
3. **`increment_video_usage(p_user_id uuid)`** - Incrementa contador de generaciones de video
4. **`reset_monthly_usage_counters()`** - Resetea todos los contadores a 0
5. **`should_reset_counters()`** - Helper para verificar si es el primer día del mes

## ⚙️ Configuración del Reset Automático

### Opción 1: Usando pg_cron (Recomendado)

Si tu instancia de Supabase tiene `pg_cron` habilitado:

**Archivo SQL completo:** `supabase/schema/20251201_setup_monthly_reset_cron.sql`

**O ejecuta directamente:**

```sql
-- Verificar si pg_cron está disponible
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Si no existe, intenta habilitarlo (requiere permisos de superusuario):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar cron job existente si existe
SELECT cron.unschedule('reset-usage-counters-monthly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reset-usage-counters-monthly'
);

-- Crear el cron job para reset mensual
-- Programación: Primer día de cada mes a las 00:00 UTC
SELECT cron.schedule(
  'reset-usage-counters-monthly',           -- Nombre del job
  '0 0 1 * *',                              -- Cron schedule: primer día de cada mes a medianoche UTC
  $$SELECT public.reset_monthly_usage_counters()$$  -- Función a ejecutar
);

-- Verificar que se creó correctamente
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'reset-usage-counters-monthly';
```

### Opción 2: Usando Supabase Edge Function + Cron

1. Crear una Edge Function `reset-usage-counters`:

```typescript
// supabase/functions/reset-usage-counters/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESET_SECRET = Deno.env.get('RESET_SECRET');

serve(async (req) => {
  // Verificar secret para seguridad
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${RESET_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.rpc('reset_monthly_usage_counters');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

2. Configurar un cron job externo (GitHub Actions, cron job del servidor, etc.) que llame a esta función el primer día de cada mes.

### Opción 3: Verificación Manual

Si prefieres resetear manualmente, puedes ejecutar:

```sql
SELECT public.reset_monthly_usage_counters();
```

## ✅ Verificación

Para verificar que los contadores se resetean correctamente:

```sql
-- Ver contadores actuales
SELECT 
  id,
  full_name,
  ai_enhancements_used,
  image_generations_used,
  video_generations_used,
  ai_enhancements_reset_at
FROM public.profiles
WHERE 
  ai_enhancements_used > 0 
  OR image_generations_used > 0 
  OR video_generations_used > 0
LIMIT 10;

-- Probar incremento de imágenes (reemplaza con un UUID real de tu base de datos)
SELECT public.increment_image_usage('TU_USER_ID_AQUI'::uuid);

-- Verificar que las funciones existen
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname IN ('increment_text_usage', 'increment_image_usage', 'increment_video_usage')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

## 📝 Notas Importantes

- Los contadores se resetean a **0** el primer día de cada mes
- El campo `ai_enhancements_reset_at` se actualiza con la fecha del último reset
- Las funciones de incremento verifican automáticamente los límites antes de incrementar
- Si un usuario alcanza su límite, la función retorna un error y no incrementa el contador

## 🔧 Troubleshooting

Si los contadores no se resetean:

1. Verificar que la función `reset_monthly_usage_counters()` existe:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'reset_monthly_usage_counters';
   ```

2. Verificar permisos:
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.routine_privileges 
   WHERE routine_name = 'reset_monthly_usage_counters';
   ```

3. Ejecutar manualmente para probar:
   ```sql
   SELECT public.reset_monthly_usage_counters();
   ```

