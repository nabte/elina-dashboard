# Solución: Error 429 - Rate Limiting de OpenAI Embeddings

## 🎯 Problema

El nodo `1. RAG - Obtener Embedding1` estaba generando demasiadas solicitudes a OpenAI, causando el error:
```
The service is receiving too many requests from you
You exceeded your current quota, please check your plan and billing details.
```

## ✅ Solución Implementada

### 1. **Tabla de Cache de Embeddings** (`embedding_cache`)

Se creó una tabla para cachear embeddings y evitar llamadas repetidas:

```sql
CREATE TABLE public.embedding_cache (
  id uuid PRIMARY KEY,
  text_hash text UNIQUE,           -- Hash SHA256 del texto
  text_content text,                -- Texto original
  embedding vector(1536),           -- Embedding vectorial
  model text,                       -- Modelo usado
  created_at timestamptz,
  last_used_at timestamptz,         -- Para limpieza automática
  usage_count integer               -- Contador de uso
);
```

**Beneficios:**
- ✅ Evita llamadas repetidas para el mismo texto
- ✅ Reduce costos de OpenAI
- ✅ Mejora velocidad de respuesta
- ✅ Limpieza automática de cache antiguo (30 días sin usar)

### 2. **Edge Function con Retry y Backoff Exponencial**

**Archivo:** `supabase/functions/generate-embedding-with-cache/index.ts`

**Características:**
- ✅ **Caching inteligente:** Verifica si el embedding ya existe antes de generar
- ✅ **Retry con backoff exponencial:** Reintenta automáticamente en caso de error 429
  - Intento 1: Espera 1 segundo
  - Intento 2: Espera 2 segundos
  - Intento 3: Espera 4 segundos (máximo 30 segundos)
- ✅ **Manejo robusto de errores:** Diferencia entre rate limit y otros errores
- ✅ **Logging detallado:** Para debugging y monitoreo

**Flujo:**
```
1. Recibe texto → Genera hash SHA256
2. Busca en cache → Si existe, retorna inmediatamente
3. Si no existe → Genera embedding con retry
4. Guarda en cache → Para futuras consultas
5. Retorna embedding
```

### 3. **Actualización del Nodo n8n**

**Nodo:** `1. RAG - Obtener Embedding1`

**Cambios:**
- ❌ **ANTES:** Llamada directa a `https://api.openai.com/v1/embeddings`
- ✅ **AHORA:** Llamada a Edge Function `generate-embedding-with-cache`

**Configuración:**
```json
{
  "url": "https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-embedding-with-cache",
  "jsonBody": {
    "text": "{{ $('set text1').item.json.text.replace(/<\\/?audio>|\\n/g, ' ').trim() }}",
    "model": "text-embedding-3-small"
  },
  "options": {
    "retry": {
      "maxRetries": 3,
      "retryOnFail": true
    }
  }
}
```

**Formato de respuesta:**
```json
{
  "embedding": [0.1, 0.2, ...],  // Array de números
  "model": "text-embedding-3-small",
  "from_cache": false  // true si vino del cache
}
```

## 📊 Impacto Esperado

### Reducción de Llamadas a OpenAI
- **Sin cache:** 100% de llamadas a OpenAI
- **Con cache:** ~30-50% de llamadas (dependiendo de la repetición de mensajes)

### Mejora en Velocidad
- **Sin cache:** ~200-500ms por embedding
- **Con cache:** ~10-50ms (solo consulta a base de datos)

### Reducción de Errores 429
- **Sin retry:** Falla inmediatamente en rate limit
- **Con retry:** Reintenta automáticamente con backoff exponencial

## 🔧 Mantenimiento

### Limpieza Automática de Cache

Ejecutar periódicamente (ej: cron job semanal):

```sql
SELECT public.cleanup_old_embedding_cache();
```

Esto elimina embeddings que no se han usado en 30 días.

### Monitoreo

Ver estadísticas de cache:

```sql
SELECT 
  COUNT(*) as total_embeddings,
  SUM(usage_count) as total_uses,
  AVG(usage_count) as avg_uses_per_embedding,
  COUNT(*) FILTER (WHERE last_used_at > now() - interval '7 days') as active_last_week
FROM public.embedding_cache;
```

## 🚀 Próximos Pasos (Opcional)

1. **Actualizar otros nodos de embedding:**
   - `1b. Obtener Embedding Humano1`
   - `2b. Obtener Embedding IA1`
   
   Estos también pueden beneficiarse del cache y retry.

2. **Implementar rate limiting en n8n:**
   - Agregar nodo `Wait` antes de llamadas a OpenAI
   - Limitar a X solicitudes por minuto

3. **Monitoreo y alertas:**
   - Alertar si el cache hit rate es muy bajo
   - Alertar si hay muchos errores 429 aún con retry

## 📝 Notas Técnicas

- El hash se genera con SHA256 del texto normalizado (trim + lowercase)
- El cache es compartido entre todos los usuarios (eficiente para mensajes comunes)
- Los embeddings se almacenan como `vector(1536)` en PostgreSQL usando pgvector
- La Edge Function maneja CORS automáticamente

