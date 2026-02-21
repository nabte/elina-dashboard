# Cómo Leer las Métricas RAG

## Introducción

El sistema de métricas RAG te permite entender qué tan efectivo es tu sistema de conocimiento y qué información se está usando más.

---

## 📊 Métricas Disponibles

### 1. **Analytics Diario (rag_analytics)**

Muestra estadísticas agregadas por día.

```sql
-- Ver métricas de los últimos 7 días
SELECT
    date,
    total_queries,
    avg_results_per_query,
    avg_top_similarity,
    avg_execution_time_ms,
    cache_hit_rate * 100 as cache_hit_percentage,
    unique_contacts
FROM rag_analytics
WHERE user_id = 'TU_USER_ID'
    AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

**Qué significa cada campo:**
- `total_queries`: Cuántas búsquedas RAG se hicieron ese día
- `avg_results_per_query`: Promedio de resultados encontrados por búsqueda
- `avg_top_similarity`: Qué tan relevante fue el mejor resultado (0-1, más alto = mejor)
- `avg_execution_time_ms`: Tiempo promedio de búsqueda en milisegundos
- `cache_hit_rate`: Porcentaje de embeddings que se reutilizaron del cache
- `unique_contacts`: Cuántos contactos diferentes hicieron preguntas

**Interpretación:**
- ✅ Si `avg_top_similarity > 0.5`: Buenos resultados
- ⚠️ Si `avg_top_similarity < 0.4`: Considera revisar tu contenido o bajar el threshold
- ✅ Si `cache_hit_rate > 0.8`: Cache funcionando bien (ahorro de costos)

---

### 2. **Fuentes Más Usadas (top_knowledge_sources)**

Muestra qué FAQs o documentos se están usando más.

```sql
-- Ver top 20 fuentes más recuperadas
SELECT
    source_type,
    content_preview,
    total_retrievals,
    total_uses,
    avg_similarity,
    last_retrieved_at
FROM top_knowledge_sources
WHERE user_id = 'TU_USER_ID'
ORDER BY total_retrievals DESC
LIMIT 20;
```

**Qué significa cada campo:**
- `source_type`: Tipo de fuente (`faq`, `knowledge_chunk`)
- `content_preview`: Primeras palabras del contenido
- `total_retrievals`: Cuántas veces apareció en resultados de búsqueda
- `total_uses`: Cuántas veces se usó efectivamente en la respuesta
- `avg_similarity`: Similitud promedio cuando aparece
- `last_retrieved_at`: Última vez que se usó

**Interpretación:**
- ✅ Si `total_uses / total_retrievals > 0.7`: Contenido muy relevante
- ⚠️ Si `total_retrievals` alto pero `total_uses` bajo: Aparece en búsquedas pero no se usa (considera revisar)
- 💡 Las fuentes con `total_retrievals` bajo podrían no estar bien optimizadas

---

### 3. **Búsquedas Sin Resultados**

Encuentra qué preguntas no tienen respuesta.

```sql
-- Ver búsquedas que no encontraron nada
SELECT
    query_text,
    created_at,
    search_method
FROM rag_queries
WHERE user_id = 'TU_USER_ID'
    AND results_count = 0
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Interpretación:**
- 💡 Estas son oportunidades para crear nuevos FAQs o documentos
- Si hay muchas, considera bajar el threshold o mejorar el contenido

---

### 4. **Rendimiento de Búsqueda por Método**

Compara efectividad de búsqueda vectorial vs full-text.

```sql
-- Comparar métodos de búsqueda
SELECT
    search_method,
    COUNT(*) as total_searches,
    AVG(results_count) as avg_results,
    AVG(top_similarity) as avg_top_similarity,
    AVG(execution_time_ms) as avg_time_ms
FROM rag_queries
WHERE user_id = 'TU_USER_ID'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY search_method
ORDER BY total_searches DESC;
```

**Interpretación:**
- `vector`: Búsqueda con embeddings (más precisa)
- `fulltext`: Búsqueda por texto (más rápida pero menos precisa)
- ✅ Si `vector` tiene mejor `avg_top_similarity`: Sistema funcionando bien
- ⚠️ Si `fulltext` se usa mucho: Posible problema con embeddings

---

### 5. **FAQs Sin Uso**

Encuentra FAQs que nunca se han usado.

```sql
-- Ver FAQs que nunca se han recuperado
SELECT
    f.question,
    f.answer,
    f.category,
    f.created_at
FROM faqs f
LEFT JOIN knowledge_usage ku
    ON ku.source_id = f.id AND ku.source_type = 'faq'
WHERE f.user_id = 'TU_USER_ID'
    AND f.is_active = true
    AND ku.id IS NULL
ORDER BY f.created_at DESC;
```

**Interpretación:**
- 💡 Considera revisar o mejorar estas FAQs
- Podrían necesitar mejor redacción o keywords diferentes

---

## 🎯 Dashboards Sugeridos

### Dashboard Semanal

```sql
-- Resumen semanal completo
WITH weekly_stats AS (
    SELECT
        COUNT(*) as total_queries,
        AVG(results_count) as avg_results,
        AVG(top_similarity) as avg_similarity,
        COUNT(*) FILTER (WHERE results_count = 0) as queries_no_results,
        AVG(execution_time_ms) as avg_time
    FROM rag_queries
    WHERE user_id = 'TU_USER_ID'
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT
    total_queries as "Total Búsquedas",
    ROUND(avg_results::NUMERIC, 2) as "Resultados Promedio",
    ROUND((avg_similarity * 100)::NUMERIC, 1) || '%' as "Similitud Promedio",
    queries_no_results as "Sin Resultados",
    ROUND((queries_no_results::NUMERIC / total_queries * 100), 1) || '%' as "% Sin Resultados",
    ROUND(avg_time::NUMERIC, 0) || 'ms' as "Tiempo Promedio"
FROM weekly_stats;
```

---

## 📈 KPIs Recomendados

| Métrica | Bueno | Regular | Malo |
|---------|-------|---------|------|
| Similitud Promedio | > 0.6 | 0.4 - 0.6 | < 0.4 |
| % Sin Resultados | < 10% | 10-20% | > 20% |
| Tiempo Búsqueda | < 200ms | 200-500ms | > 500ms |
| Cache Hit Rate | > 80% | 60-80% | < 60% |
| Uso/Retrieval Ratio | > 0.7 | 0.5-0.7 | < 0.5 |

---

## 🔧 Acciones Basadas en Métricas

### Si la similitud es baja (< 0.4):
1. Baja el threshold a 0.3-0.35
2. Revisa y mejora el contenido de FAQs
3. Agrega más sinónimos y variaciones

### Si hay muchas búsquedas sin resultados:
1. Crea FAQs para esas preguntas
2. Mejora la cobertura de temas
3. Considera si el contenido está desactualizado

### Si el tiempo de búsqueda es alto (> 500ms):
1. Revisa los índices de la base de datos
2. Considera reducir `match_count`
3. Optimiza el chunking de documentos

### Si el cache hit rate es bajo (< 60%):
1. Revisa que el cache esté habilitado
2. Aumenta el tiempo de expiración del cache
3. Verifica que no haya errores en el sistema de cache

---

## 🎨 Integración en Dashboard

Para mostrar métricas en tu dashboard, puedes crear una nueva función edge:

```typescript
// supabase/functions/get-rag-metrics/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Get last 7 days analytics
    const { data: analytics } = await supabase
        .from('rag_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false })

    // Get top sources
    const { data: topSources } = await supabase
        .from('top_knowledge_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('total_retrievals', { ascending: false })
        .limit(10)

    return new Response(JSON.stringify({
        analytics,
        topSources
    }), {
        headers: { 'Content-Type': 'application/json' }
    })
})
```

---

## 💡 Tips

1. **Revisa las métricas semanalmente** para detectar tendencias
2. **Actualiza FAQs** basándote en las búsquedas sin resultados
3. **Elimina contenido sin uso** después de 3 meses sin retrievals
4. **Premia el contenido frecuente** mejorándolo aún más
5. **Monitorea el cache hit rate** para optimizar costos de OpenAI
