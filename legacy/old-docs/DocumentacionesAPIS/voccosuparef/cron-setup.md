# Configuración de Cron Jobs para Automatizaciones WhatsApp

Este documento explica cómo configurar los cron jobs en Supabase para ejecutar las Edge Functions automáticamente.

## Edge Functions Creadas

1. **send-reminders**: Envía recordatorios automáticos de citas y regresos
2. **check-whatsapp-connections**: Verifica el estado de las conexiones WhatsApp

## Configuración de Cron Jobs

### Opción 1: Usando el Dashboard de Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Database** → **Cron Jobs**
3. Crea dos nuevos cron jobs:

#### Cron Job 1: send-reminders
- **Nombre**: `send_reminders_hourly`
- **Schedule**: `0 * * * *` (cada hora)
- **SQL Command**:
```sql
SELECT
  net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
```

#### Cron Job 2: check-whatsapp-connections
- **Nombre**: `check_whatsapp_connections`
- **Schedule**: `*/5 * * * *` (cada 5 minutos)
- **SQL Command**:
```sql
SELECT
  net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-whatsapp-connections',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
```

### Opción 2: Usando SQL Directamente

Ejecuta estos comandos en el SQL Editor de Supabase:

```sql
-- Habilitar extensión pg_cron si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job para enviar recordatorios (cada hora)
SELECT cron.schedule(
  'send_reminders_hourly',
  '0 * * * *', -- Cada hora en el minuto 0
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Cron job para verificar conexiones (cada 5 minutos)
SELECT cron.schedule(
  'check_whatsapp_connections',
  '*/5 * * * *', -- Cada 5 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-whatsapp-connections',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

## Reemplazar Valores

Antes de ejecutar, reemplaza:
- `YOUR_PROJECT_REF`: Tu referencia de proyecto Supabase (ej: `dkypyeonfsyxdcppkqbo`)
- `YOUR_ANON_KEY`: Tu clave anónima de Supabase (puedes usar la anon key, no la service role key)

## Verificar Cron Jobs

Para ver los cron jobs configurados:

```sql
SELECT * FROM cron.job;
```

## Desactivar/Eliminar Cron Jobs

Para desactivar un cron job:

```sql
SELECT cron.unschedule('send_reminders_hourly');
SELECT cron.unschedule('check_whatsapp_connections');
```

## Notas Importantes

1. **Seguridad**: Los cron jobs usan la anon key, pero las Edge Functions deben validar internamente usando la service role key para acceder a la base de datos.

2. **Frecuencia**:
   - `send-reminders`: Se ejecuta cada hora para enviar recordatorios
   - `check-whatsapp-connections`: Se ejecuta cada 5 minutos para mantener el estado actualizado

3. **Logs**: Puedes ver los logs de ejecución en el dashboard de Supabase bajo **Edge Functions** → **Logs**

4. **Testing**: Puedes probar las funciones manualmente usando:
   ```bash
   curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
   ```

## Troubleshooting

Si los cron jobs no se ejecutan:

1. Verifica que la extensión `pg_cron` esté habilitada
2. Verifica que las URLs de las Edge Functions sean correctas
3. Revisa los logs de las Edge Functions para ver errores
4. Asegúrate de que las Edge Functions estén desplegadas correctamente

