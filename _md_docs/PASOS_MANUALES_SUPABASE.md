# Pasos Manuales para Implementar Optimizaciones en Supabase

## ✅ Verificación: Funcionalidades Consideradas

El sistema **SÍ considera** todas las funcionalidades existentes:

1. ✅ **Promociones Inteligentes**: El flujo mantiene "Buscar Promociones Activas1" → "Filtrar Promoción Válida1" → "agregar Promo al Contexto1"
2. ✅ **Detección Crítica**: El flujo mantiene "Detectar Intención Crítica1" → "IF: ¿Es Crítico?1"
3. ✅ **Memoria a Largo Plazo**: El flujo mantiene guardado en `chat_history` con embeddings

**El flujo optimizado:**
- Si `needs_rag = false` → "Skip RAG - Contexto Vacío" → "Detectar Intención Crítica1" → Promociones → AI Agent
- Si `needs_rag = true` → "2. RAG - Buscar en Supabase1" → "3. RAG - Formatear Contexto1" → "Detectar Intención Crítica1" → Promociones → AI Agent

---

## 📋 Pasos Manuales en Supabase

### Paso 1: Aplicar Migraciones SQL

Abre el **SQL Editor** en Supabase:
🔗 **Link**: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`

#### 1.1. Índices Optimizados

**Archivo**: `supabase/schema/20251211_optimize_vector_indexes.sql`

**Link para abrir**: Abre el archivo en tu editor y copia todo el contenido

**Qué hace**:
- Crea índices HNSW para búsqueda vectorial rápida
- Optimiza `match_chat_history` con índices compuestos
- Crea índices GIN para full-text search

**Ejecutar**: Pega el contenido completo en SQL Editor y ejecuta

---

#### 1.2. Funciones de RAG con Fallback

**Archivo**: `supabase/schema/20251211_rag_fallback_functions.sql`

**Link para abrir**: Abre el archivo en tu editor y copia todo el contenido

**Qué hace**:
- Crea `get_rag_with_fallback()`: RAG inteligente con fallback a full-text
- Crea `get_rag_fulltext_only()`: Solo full-text cuando embedding no está disponible

**Ejecutar**: Pega el contenido completo en SQL Editor y ejecuta

---

#### 1.3. Cache Optimizado con Similitud Semántica

**Archivo**: `supabase/schema/20251211_optimize_embedding_cache.sql`

**Link para abrir**: Abre el archivo en tu editor y copia todo el contenido

**Qué hace**:
- Crea `find_similar_cached_embedding()`: Busca embeddings similares
- Crea `get_embedding_from_cache_enhanced()`: Cache mejorado
- Crea `cleanup_old_embedding_cache()`: Limpieza automática

**Ejecutar**: Pega el contenido completo en SQL Editor y ejecuta

---

#### 1.4. Sistema de Métricas

**Archivo**: `supabase/schema/20251211_embedding_metrics.sql`

**Link para abrir**: Abre el archivo en tu editor y copia todo el contenido

**Qué hace**:
- Crea tabla `embedding_metrics` para observabilidad
- Crea funciones para estadísticas de cache hit rate
- Crea función para distribución de tipos de intención

**Ejecutar**: Pega el contenido completo en SQL Editor y ejecuta

---

#### 1.5. Circuit Breaker Table

**Archivo**: `supabase/schema/20251211_circuit_breaker_table.sql`

**Link para abrir**: Abre el archivo en tu editor y copia todo el contenido

**Qué hace**:
- Crea tabla `circuit_breaker_state` para detectar cuando OpenAI está caído
- Crea función `reset_circuit_breaker()` para reset manual

**Ejecutar**: Pega el contenido completo en SQL Editor y ejecuta

---

### Paso 2: Desplegar Edge Functions

Abre el **Edge Functions** en Supabase:
🔗 **Link**: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/functions`

#### 2.1. Crear/Actualizar `rag-with-fallback`

**Archivo**: `supabase/functions/rag-with-fallback/index.ts`

**Pasos**:
1. En el dashboard de Supabase, ve a **Edge Functions**
2. Si no existe, haz clic en **"Create a new function"**
3. Nombre: `rag-with-fallback`
4. Copia todo el contenido de `supabase/functions/rag-with-fallback/index.ts`
5. Pega en el editor
6. Haz clic en **"Deploy"**

**Qué hace**: Edge Function que usa búsqueda vectorial si está disponible, sino usa full-text search como fallback.

---

#### 2.2. Actualizar `smart-embedding-router`

**Archivo**: `supabase/functions/smart-embedding-router/index.ts`

**Pasos**:
1. En el dashboard de Supabase, ve a **Edge Functions**
2. Busca `smart-embedding-router`
3. Haz clic en **"Edit"**
4. Copia todo el contenido de `supabase/functions/smart-embedding-router/index.ts`
5. Reemplaza el contenido existente
6. Haz clic en **"Deploy"**

**Qué hace**: Mejora la detección de intención usando gpt-4o-mini con fallback a keywords.

---

#### 2.3. Actualizar `generate-embedding-with-cache`

**Archivo**: `supabase/functions/generate-embedding-with-cache/index.ts`

**Pasos**:
1. En el dashboard de Supabase, ve a **Edge Functions**
2. Busca `generate-embedding-with-cache`
3. Haz clic en **"Edit"**
4. Copia todo el contenido de `supabase/functions/generate-embedding-with-cache/index.ts`
5. Reemplaza el contenido existente
6. Haz clic en **"Deploy"**

**Qué hace**: Agrega circuit breaker pattern para detectar cuando OpenAI está caído.

---

### Paso 3: Verificar Variables de Entorno

Abre **Settings** → **Edge Functions** → **Secrets**:
🔗 **Link**: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/settings/functions`

**Verificar que existan**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Si faltan, agrégalas.

---

### Paso 4: Verificar que las Funciones SQL Funcionen

Abre el **SQL Editor** y ejecuta estas queries de prueba:

#### 4.1. Verificar Circuit Breaker

```sql
SELECT * FROM circuit_breaker_state WHERE service = 'openai_embeddings';
```

**Resultado esperado**: Debe mostrar una fila con `state = 'closed'`

---

#### 4.2. Verificar Funciones de RAG

```sql
-- Esto solo verifica que la función existe, no la ejecuta
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_rag_with_fallback', 'get_rag_fulltext_only');
```

**Resultado esperado**: Debe mostrar 2 filas

---

#### 4.3. Verificar Funciones de Cache

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('find_similar_cached_embedding', 'get_embedding_from_cache_enhanced');
```

**Resultado esperado**: Debe mostrar 2 filas

---

#### 4.4. Verificar Tabla de Métricas

```sql
SELECT COUNT(*) FROM embedding_metrics;
```

**Resultado esperado**: Debe retornar 0 (tabla vacía inicialmente, se llenará con uso)

---

### Paso 5: Actualizar Workflow de n8n

**Archivo**: `n8n/Elina V4 (1).json`

**Pasos**:
1. Abre n8n
2. Ve al workflow "Elina V4"
3. Importa el archivo `n8n/Elina V4 (1).json` actualizado
4. **Verifica las conexiones**:
   - "1. RAG - Obtener Embedding1" → "IF: ¿Necesita RAG?"
   - "IF: ¿Necesita RAG?" (TRUE) → "2. RAG - Buscar en Supabase1"
   - "IF: ¿Necesita RAG?" (FALSE) → "Skip RAG - Contexto Vacío"
   - "Skip RAG - Contexto Vacío" → "Detectar Intención Crítica1"
   - "2. RAG - Buscar en Supabase1" → "3. RAG - Formatear Contexto1"
   - "3. RAG - Formatear Contexto1" → "Detectar Intención Crítica1"
   - "Detectar Intención Crítica1" → "IF: ¿Es Crítico?1"
   - "IF: ¿Es Crítico?1" (FALSE) → "Buscar Promociones Activas1"
   - "Buscar Promociones Activas1" → "Filtrar Promoción Válida1"
   - "Filtrar Promoción Válida1" → "IF: ¿Hay Promoción?1"
   - "IF: ¿Hay Promoción?1" (TRUE) → "agregar Promo al Contexto1"
   - "agregar Promo al Contexto1" → "AI Agent"
   - "IF: ¿Hay Promoción?1" (FALSE) → "AI Agent"

---

## 🔍 Verificación Final

### Verificar que el Circuit Breaker Funciona

```sql
-- Ver estado actual
SELECT * FROM circuit_breaker_state WHERE service = 'openai_embeddings';

-- Si necesitas resetear (solo si está abierto y quieres forzar cierre)
SELECT reset_circuit_breaker('openai_embeddings');
```

### Verificar Métricas (después de usar el sistema)

```sql
-- Cache hit rate de las últimas 24 horas
SELECT * FROM get_cache_hit_rate_stats(24);

-- Distribución de tipos de intención
SELECT * FROM get_intent_type_distribution(24);
```

### Verificar que los Índices se Crearon

```sql
-- Ver índices en chat_history
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'chat_history' 
  AND indexname LIKE '%hnsw%' OR indexname LIKE '%embedding%';

-- Ver índices en embedding_cache
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'embedding_cache' 
  AND indexname LIKE '%hnsw%';
```

---

## ⚠️ Notas Importantes

1. **Orden de Ejecución**: Ejecuta los SQLs en el orden indicado (1.1 → 1.2 → 1.3 → 1.4 → 1.5)

2. **Índices HNSW**: Los índices HNSW pueden tardar en crearse si hay muchos datos. Si falla, espera unos minutos y vuelve a intentar.

3. **Edge Functions**: Asegúrate de que las variables de entorno estén configuradas antes de desplegar.

4. **Testing**: Después de implementar, prueba con mensajes conversacionales ("hola", "gracias") y mensajes que necesiten RAG ("precio de toner HP").

---

## 📊 Monitoreo Post-Implementación

Después de implementar, monitorea:

1. **Cache Hit Rate**: Debe aumentar de ~30% a ~60-70%
2. **Latencia**: Debe reducirse de ~2-5s a ~300-800ms
3. **Errores 429**: Deben desaparecer completamente
4. **Circuit Breaker**: Debe estar en estado "closed" normalmente

---

## 🆘 Troubleshooting

### Si los índices HNSW no se crean

```sql
-- Verificar si hay embeddings en chat_history
SELECT COUNT(*) FROM chat_history WHERE embedding IS NOT NULL;

-- Si hay 0, los índices HNSW no se pueden crear (requieren datos)
-- Esto es normal, se crearán automáticamente cuando haya embeddings
```

### Si el circuit breaker se abre frecuentemente

```sql
-- Ver estado
SELECT * FROM circuit_breaker_state WHERE service = 'openai_embeddings';

-- Resetear si es necesario
SELECT reset_circuit_breaker('openai_embeddings');
```

### Si las Edge Functions fallan

1. Verifica los logs en Supabase Dashboard → Edge Functions → [nombre función] → Logs
2. Verifica que las variables de entorno estén configuradas
3. Verifica que las funciones SQL existan (paso 4)

---

## ✅ Checklist Final

- [ ] SQL 1.1: Índices optimizados aplicados
- [ ] SQL 1.2: Funciones de RAG con fallback aplicadas
- [ ] SQL 1.3: Cache optimizado aplicado
- [ ] SQL 1.4: Sistema de métricas aplicado
- [ ] SQL 1.5: Circuit breaker table aplicada
- [ ] Edge Function: `rag-with-fallback` desplegada
- [ ] Edge Function: `smart-embedding-router` actualizada
- [ ] Edge Function: `generate-embedding-with-cache` actualizada
- [ ] Variables de entorno verificadas
- [ ] Workflow de n8n actualizado e importado
- [ ] Conexiones del workflow verificadas
- [ ] Pruebas realizadas (mensaje conversacional y mensaje con RAG)

