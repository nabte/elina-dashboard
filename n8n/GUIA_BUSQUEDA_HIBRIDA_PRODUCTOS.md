# Guía: Búsqueda Híbrida de Productos

## Resumen

Se ha implementado un sistema de búsqueda híbrida que combina:
- **Full-Text Search** (PostgreSQL): Rápido, gratis, busca en nombres, SKUs y descripciones
- **Semantic Search** (Embeddings): Preciso, encuentra productos incluso con códigos parciales o en descripciones largas

## Arquitectura

```
Usuario: "quiero un toner para M477fdw"
    ↓
1. Full-Text Search (PostgreSQL) - GRATIS, RÁPIDO
   → Busca en: product_name, sku, description
   → Si encuentra resultados con score > 0.1 → ✅ Retornar
   → Si no encuentra o score bajo → Continuar
    ↓
2. Semantic Search (Embeddings) - $0.0001, PRECISO
   → Generar embedding del query usando OpenAI
   → Buscar productos similares con pgvector
   → Retornar top 10 resultados
    ↓
3. Combinar y rankear resultados
    ↓
4. Retornar a la IA con IDs para placeholders
```

## Funciones SQL Disponibles

### 1. `search_products_fulltext(p_user_id, p_query, p_limit)`
Búsqueda full-text usando PostgreSQL tsvector.

**Ejemplo:**
```sql
SELECT * FROM search_products_fulltext(
  'user-uuid-here'::uuid,
  'toner M477fdw',
  10
);
```

### 2. `search_products_semantic(p_user_id, p_query_embedding, p_limit)`
Búsqueda semántica usando embeddings vectoriales.

**Ejemplo:**
```sql
SELECT * FROM search_products_semantic(
  'user-uuid-here'::uuid,
  '[0.1, 0.2, ...]'::vector(1536),  -- embedding array
  10
);
```

### 3. `search_products_hybrid(p_user_id, p_query, p_limit)`
Búsqueda híbrida (actualmente solo full-text, se puede extender).

**Ejemplo:**
```sql
SELECT * FROM search_products_hybrid(
  'user-uuid-here'::uuid,
  'toner M477fdw',
  10
);
```

## Edge Functions Disponibles

### 1. `generate-product-embedding`
Genera embeddings de texto usando OpenAI.

**URL:** `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-product-embedding`

**Request:**
```json
{
  "query": "toner M477fdw"
}
```

**Response:**
```json
{
  "embedding": [0.1, 0.2, ...],
  "model": "text-embedding-3-small"
}
```

### 2. `search-products-hybrid`
Búsqueda híbrida completa (full-text + semantic).

**URL:** `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/search-products-hybrid`

**Request:**
```json
{
  "user_id": "user-uuid-here",
  "query": "toner M477fdw",
  "limit": 10,
  "min_fulltext_score": 0.1
}
```

**Response:**
```json
{
  "products": [
    {
      "id": 123,
      "product_name": "Toner 414A",
      "sku": "414A",
      "price": 343.83,
      "stock": 10,
      "description": "Rendimiento 2400 Compatible con los modelos... M477fdw...",
      "media_url": "https://...",
      "search_method": "fulltext",
      "relevance_score": 0.85
    }
  ],
  "total": 1,
  "search_method": "fulltext"
}
```

## Integración en n8n

### Opción 1: Usar Edge Function directamente (Recomendado)

Crear un nodo HTTP Request que llame a `search-products-hybrid`:

**Configuración:**
- **Method:** POST
- **URL:** `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/search-products-hybrid`
- **Headers:**
  - `apikey`: [Service Role Key]
  - `Authorization`: `Bearer [Service Role Key]`
  - `Content-Type`: `application/json`
- **Body:**
```json
{
  "user_id": "={{ $('Obtener Prompt y Configuración1').item.json.user_id }}",
  "query": "={{ $input.query }}",
  "limit": 10
}
```

### Opción 2: Usar función RPC desde Supabase Tool

Modificar el nodo `ver productos1` para usar la función RPC (si tu versión de n8n lo soporta):

**Configuración:**
- **Operation:** `rpc` o `function`
- **Function Name:** `search_products_hybrid`
- **Parameters:**
  - `p_user_id`: `={{ $('Obtener Prompt y Configuración1').item.json.user_id }}`
  - `p_query`: `={{ $input.query }}`
  - `p_limit`: `10`

### Opción 3: Mejorar el prompt de la IA (Actual)

Actualmente, el `supabaseTool` devuelve todos los productos. Se ha mejorado el `toolDescription` para que la IA sepa cómo filtrar mejor los resultados buscando en el campo `description` donde están los modelos compatibles.

## Mejoras Implementadas

1. ✅ **Índice GIN** para búsqueda full-text rápida
2. ✅ **Columna `description_embedding`** para búsqueda semántica
3. ✅ **Funciones SQL** para búsqueda full-text y semántica
4. ✅ **Edge Functions** para generar embeddings y búsqueda híbrida completa
5. ✅ **Prompt mejorado** para que la IA busque mejor en descripciones

## Próximos Pasos (Opcional)

1. **Generar embeddings para productos existentes:**
   - Crear script para generar embeddings en batch
   - Actualizar productos nuevos automáticamente

2. **Crear índice IVFFlat** para búsqueda vectorial más rápida:
   ```sql
   CREATE INDEX idx_products_embedding_ivfflat 
   ON products 
   USING ivfflat (description_embedding vector_cosine_ops)
   WITH (lists = 100);
   ```

3. **Integrar búsqueda híbrida completa en n8n:**
   - Modificar workflow para usar Edge Function cuando full-text no da resultados
   - Agregar lógica de fallback automático

## Costos

- **Full-Text Search:** $0 (incluido en Supabase)
- **Semantic Search:** ~$0.0001 por búsqueda
- **Costo mensual estimado:** 
  - 3,000 búsquedas/mes
  - 70% resueltas con full-text = $0
  - 30% requieren embeddings = 900 × $0.0001 = **$0.09/mes**

## Testing

Probar con queries reales:
- "toner M477fdw" → Debe encontrar productos con M477fdw en descripción
- "414A" → Debe encontrar producto con SKU 414A
- "HP LaserJet Pro" → Debe encontrar productos compatibles
- "toner" → Debe encontrar todos los tóners

