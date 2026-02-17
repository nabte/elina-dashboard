# 🚀 Aplicar Solución Mejorada para Error 429

## ⚡ Pasos Rápidos

### 1. Aplicar Migración SQL (2 minutos)

1. Ve a **Supabase** → **SQL Editor**
2. Ejecuta este SQL:

```sql
-- Tabla para trackear rate limiting de embeddings
CREATE TABLE IF NOT EXISTS public.embedding_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_time timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  error_type text
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_embedding_rate_limit_time ON public.embedding_rate_limit(request_time);

-- Función para verificar rate limit (máximo 50 solicitudes por minuto)
CREATE OR REPLACE FUNCTION public.check_embedding_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_max_per_minute integer := 50; -- Límite conservador
BEGIN
  -- Contar solicitudes en el último minuto
  SELECT COUNT(*)
  INTO v_count
  FROM public.embedding_rate_limit
  WHERE request_time > now() - interval '1 minute';
  
  -- Si excede el límite, retornar false
  IF v_count >= v_max_per_minute THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Función para registrar una solicitud
CREATE OR REPLACE FUNCTION public.record_embedding_request(
  p_success boolean,
  p_error_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.embedding_rate_limit (success, error_type)
  VALUES (p_success, p_error_type);
  
  -- Limpiar registros antiguos (más de 1 hora)
  DELETE FROM public.embedding_rate_limit
  WHERE request_time < now() - interval '1 hour';
END;
$$;
```

3. Click en **Run** o presiona `Ctrl+Enter`

### 2. Actualizar Edge Function (3 minutos)

1. Ve a **Supabase** → **Edge Functions**
2. Busca `generate-embedding-with-cache`
3. Click en **Edit**
4. Reemplaza TODO el código con el contenido de:
   - `supabase/functions/generate-embedding-with-cache/index.ts`
5. Click en **Deploy**

### 3. (Opcional) Agregar Nodo Wait en n8n

Para mayor protección contra solicitudes simultáneas:

1. Abre el workflow **"Elina V4"** en n8n
2. Busca el nodo **"1. RAG - Obtener Embedding1"**
3. Agrega un nodo **Wait** ANTES de este nodo:
   - **Wait Time:** `1` segundo
   - **Mode:** `Wait for time`
4. Conecta el nodo Wait al nodo de embedding

---

## ✅ Verificación

### 1. Probar el Workflow

1. Ejecuta el workflow manualmente en n8n
2. Verifica que no haya errores 429
3. Revisa los logs en Supabase → Edge Functions → `generate-embedding-with-cache`

### 2. Verificar Rate Limiting

Ejecuta en Supabase SQL Editor:

```sql
-- Ver solicitudes en el último minuto
SELECT COUNT(*) as requests_last_minute
FROM embedding_rate_limit
WHERE request_time > now() - interval '1 minute';
```

Deberías ver un número menor a 50.

### 3. Ver Distribución de Errores

```sql
SELECT error_type, COUNT(*) as count
FROM embedding_rate_limit
WHERE request_time > now() - interval '1 hour'
GROUP BY error_type;
```

---

## 🔧 Ajustes Opcionales

### Ajustar Límite de Solicitudes/Minuto

Si sigues teniendo errores 429, reduce el límite:

1. Ve a Supabase → SQL Editor
2. Ejecuta:

```sql
-- Cambiar límite a 30 solicitudes/minuto
CREATE OR REPLACE FUNCTION public.check_embedding_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_max_per_minute integer := 30; -- REDUCIDO
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.embedding_rate_limit
  WHERE request_time > now() - interval '1 minute';
  
  IF v_count >= v_max_per_minute THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;
```

### Ajustar Tiempos de Espera

Si necesitas esperas más largas, edita la Edge Function:

En `generateEmbeddingWithRetry()`, cambia:
```typescript
const waitTimes = [5000, 15000, 30000, 60000, 120000]; // En milisegundos
```

Por ejemplo, para esperas más largas:
```typescript
const waitTimes = [10000, 30000, 60000, 120000, 180000]; // 10s, 30s, 60s, 120s, 180s
```

---

## 📊 Monitoreo

### Ver Estadísticas de Rate Limiting

```sql
-- Solicitudes por minuto en la última hora
SELECT 
  DATE_TRUNC('minute', request_time) as minute,
  COUNT(*) as requests,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed
FROM embedding_rate_limit
WHERE request_time > now() - interval '1 hour'
GROUP BY minute
ORDER BY minute DESC;
```

### Ver Tasa de Éxito

```sql
SELECT 
  COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as success_rate,
  COUNT(*) as total_requests
FROM embedding_rate_limit
WHERE request_time > now() - interval '1 hour';
```

---

## ⚠️ Si Aún Tienes Errores 429

1. **Verifica tu plan de OpenAI:**
   - Ve a https://platform.openai.com/usage
   - Verifica que no hayas excedido tu cuota mensual
   - Si es "quota exceeded", necesitas actualizar tu plan

2. **Reduce el límite de solicitudes:**
   - Cambia `v_max_per_minute` a 20-30

3. **Aumenta los tiempos de espera:**
   - Modifica `waitTimes` en la Edge Function

4. **Agrega más delays en n8n:**
   - Agrega nodos Wait de 2-3 segundos entre solicitudes

---

## 🎯 Resultado Esperado

Después de aplicar estos cambios:
- ✅ **Menos errores 429:** El rate limiting previene exceder límites
- ✅ **Retry más robusto:** Backoff más agresivo (hasta 2 minutos)
- ✅ **Mejor distribución:** Delay aleatorio distribuye solicitudes
- ✅ **Monitoreo:** Puedes ver cuántas solicitudes se están haciendo

---

## 📝 Notas

- El sistema funciona mejor cuando el cache tiene datos
- Las primeras solicitudes siempre irán a OpenAI (cache vacío)
- Si tienes muchos mensajes simultáneos, considera agregar más delays en n8n

