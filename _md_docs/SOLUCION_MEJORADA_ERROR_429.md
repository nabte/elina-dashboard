# Solución Mejorada: Error 429 - Rate Limiting Agresivo

## 🎯 Problema Identificado

Aunque se implementó cache y retry, el error 429 persiste porque:
1. **Cache vacío:** Todas las solicitudes iniciales van a OpenAI
2. **Solicitudes concurrentes:** Muchas solicitudes simultáneas exceden el rate limit
3. **Backoff insuficiente:** Los tiempos de espera no son lo suficientemente largos
4. **Sin rate limiting previo:** No se verifica el límite antes de hacer la solicitud

## ✅ Solución Mejorada

### 1. **Sistema de Rate Limiting en Base de Datos**

Se creó una tabla `embedding_rate_limit` que:
- Trackea todas las solicitudes a OpenAI
- Limita a **50 solicitudes por minuto** (conservador)
- Limpia automáticamente registros antiguos

**Funciones SQL:**
- `check_embedding_rate_limit()`: Verifica si se puede hacer una solicitud
- `record_embedding_request()`: Registra cada solicitud (éxito o fallo)

### 2. **Edge Function Mejorada**

**Mejoras implementadas:**

#### a) **Verificación de Rate Limit Antes de Solicitar**
```typescript
// Verifica si hay menos de 50 solicitudes en el último minuto
const canProceed = await checkRateLimit();
if (!canProceed) {
  // Espera 30 segundos y retorna error 429
}
```

#### b) **Backoff Exponencial Más Agresivo**
- **Antes:** 1s, 2s, 4s (máximo 30s)
- **Ahora:** 5s, 15s, 30s, 60s, 120s (hasta 2 minutos)
- **Intentos:** Aumentado de 3 a 5

#### c) **Delay Inicial Aleatorio**
- Cada solicitud espera 0-2 segundos aleatoriamente antes de empezar
- Distribuye las solicitudes en el tiempo

#### d) **Registro de Solicitudes**
- Registra cada solicitud (éxito/fallo) en la base de datos
- Permite monitoreo y análisis

### 3. **Cambios en la Edge Function**

**Archivo:** `supabase/functions/generate-embedding-with-cache/index.ts`

**Cambios principales:**
1. Función `checkRateLimit()`: Verifica límite antes de solicitar
2. Función `recordRequest()`: Registra cada solicitud
3. `generateEmbeddingWithRetry()` mejorado:
   - Delay inicial aleatorio (0-2s)
   - Verificación de rate limit antes de cada intento
   - Backoff más agresivo (5s, 15s, 30s, 60s, 120s)
   - 5 intentos en lugar de 3

## 📋 Pasos para Aplicar

### 1. Aplicar Migración SQL

Ejecuta la migración `add_rate_limiting_table` en Supabase:
- Ve a Supabase → SQL Editor
- Ejecuta el contenido de la migración

### 2. Actualizar Edge Function

1. Ve a Supabase → Edge Functions
2. Edita `generate-embedding-with-cache`
3. Reemplaza el código con la versión mejorada
4. Despliega

### 3. (Opcional) Agregar Nodo Wait en n8n

Para mayor protección, agrega un nodo **Wait** antes de "1. RAG - Obtener Embedding1":
- **Wait Time:** 1-2 segundos
- **Mode:** Wait for time

Esto ayuda a espaciar las solicitudes cuando hay muchos mensajes simultáneos.

## 🧪 Verificación

### 1. Verificar Rate Limiting

```sql
-- Ver solicitudes en el último minuto
SELECT COUNT(*) as requests_last_minute
FROM embedding_rate_limit
WHERE request_time > now() - interval '1 minute';

-- Ver distribución de errores
SELECT error_type, COUNT(*) as count
FROM embedding_rate_limit
WHERE request_time > now() - interval '1 hour'
GROUP BY error_type;
```

### 2. Monitorear Logs

En Supabase → Edge Functions → `generate-embedding-with-cache` → Logs:

Deberías ver:
- `"Rate limit alcanzado. Esperando..."` (cuando se detecta rate limit)
- `"Error 429/Quota. Esperando Xms..."` (cuando hay error 429)
- `"Embedding encontrado en cache..."` (cuando usa cache)

## 📊 Configuración Ajustable

### Ajustar Límite de Solicitudes por Minuto

En la función SQL `check_embedding_rate_limit()`, cambia:
```sql
v_max_per_minute integer := 50; -- Cambia este valor
```

**Recomendaciones:**
- **Plan gratuito OpenAI:** 20-30 solicitudes/minuto
- **Plan pagado básico:** 50-60 solicitudes/minuto
- **Plan pagado avanzado:** 100+ solicitudes/minuto

### Ajustar Tiempos de Backoff

En `generateEmbeddingWithRetry()`, modifica el array:
```typescript
const waitTimes = [5000, 15000, 30000, 60000, 120000]; // En milisegundos
```

## ⚠️ Notas Importantes

1. **Cache es crítico:** El sistema funciona mejor cuando el cache tiene datos. Las primeras solicitudes siempre irán a OpenAI.

2. **Solicitudes concurrentes:** Si tienes muchos mensajes simultáneos, considera:
   - Agregar nodo Wait en n8n
   - Reducir el límite de solicitudes/minuto
   - Implementar cola de procesamiento

3. **Quota vs Rate Limit:**
   - **Rate Limit (429):** Demasiadas solicitudes en poco tiempo → Se resuelve esperando
   - **Quota Exceeded:** Has excedido tu cuota mensual → Requiere actualizar plan de OpenAI

## 🚀 Próximos Pasos (Opcional)

1. **Implementar cola de procesamiento:**
   - Usar Supabase Realtime o n8n para encolar solicitudes
   - Procesar una a la vez con delays

2. **Monitoreo y alertas:**
   - Dashboard para ver tasa de éxito/fallo
   - Alertas cuando el rate limit se alcanza frecuentemente

3. **Optimizar cache:**
   - Pre-generar embeddings para mensajes comunes
   - Cachear embeddings de productos al crearlos/actualizarlos

