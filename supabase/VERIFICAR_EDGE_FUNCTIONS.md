# Verificación de Edge Functions - Cambios user_id

## Pasos para verificar que todo está aplicado correctamente

### 1. Verificar Migración SQL

Ejecuta el script `VERIFICAR_CAMBIOS_USER_ID.sql` en el SQL Editor de Supabase.

**Resultado esperado:**
- ✅ La columna `user_id` debe existir en `embedding_cache`
- ✅ El índice `idx_embedding_cache_user_id` debe existir
- ✅ Los comentarios deben estar aplicados

### 2. Verificar Edge Function: `generate-embedding-with-cache`

**Prueba manual en Supabase Dashboard:**

1. Ve a **Edge Functions** → `generate-embedding-with-cache`
2. Haz clic en **Invoke** o usa el siguiente JSON:

```json
{
  "text": "producto de prueba",
  "model": "text-embedding-3-small",
  "user_id": "00000000-0000-0000-0000-000000000000"
}
```

**Resultado esperado:**
- ✅ Debe devolver un embedding (array de números)
- ✅ Debe incluir `from_cache: false` en la primera llamada
- ✅ Debe incluir `from_cache: true` en la segunda llamada (cache funciona)

**Verificar en la base de datos:**
```sql
SELECT 
    text_hash,
    text_content,
    user_id,
    model,
    created_at
FROM embedding_cache
WHERE text_content LIKE '%producto de prueba%'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
- ✅ El registro debe tener `user_id` con el valor que enviaste (o `null` si no lo enviaste)

### 3. Verificar Edge Function: `search-products-hybrid`

**Prueba manual en Supabase Dashboard:**

1. Ve a **Edge Functions** → `search-products-hybrid`
2. Haz clic en **Invoke** o usa el siguiente JSON (reemplaza `YOUR_USER_ID` con un UUID real):

```json
{
  "user_id": "YOUR_USER_ID",
  "query": "producto de prueba",
  "limit": 5
}
```

**Resultado esperado:**
- ✅ Debe devolver productos (array)
- ✅ Debe incluir `search_method` (fulltext, semantic, o hybrid)
- ✅ Debe incluir `relevance_score` para cada producto

**Verificar que usa el cache:**
- La función `search-products-hybrid` ahora llama internamente a `generate-embedding-with-cache`
- Si ejecutas la misma búsqueda dos veces, la segunda debería ser más rápida (usa cache)

### 4. Verificar que el código está desplegado

**Opción A: Verificar en el código fuente**
- Abre `supabase/functions/generate-embedding-with-cache/index.ts`
- Busca la línea 174: debe tener `user_id?: string;`
- Busca la línea 374: debe tener `user_id: user_id || null,`

- Abre `supabase/functions/search-products-hybrid/index.ts`
- Busca la línea 128: debe tener `user_id: user_id,`

**Opción B: Verificar logs de Edge Functions**
1. Ve a **Edge Functions** → Selecciona una función → **Logs**
2. Busca llamadas recientes
3. Verifica que no hay errores relacionados con `user_id`

### 5. Checklist Final

- [ ] Migración SQL ejecutada (`20251211_add_user_id_to_embedding_cache.sql`)
- [ ] Columna `user_id` existe en `embedding_cache`
- [ ] Índice `idx_embedding_cache_user_id` existe
- [ ] Edge Function `generate-embedding-with-cache` desplegada
- [ ] Edge Function `search-products-hybrid` desplegada
- [ ] Prueba de `generate-embedding-with-cache` con `user_id` funciona
- [ ] Prueba de `search-products-hybrid` funciona
- [ ] Los embeddings se guardan con `user_id` en la base de datos

## Si algo falla

### Error: "column user_id does not exist"
**Solución:** Ejecuta la migración SQL `20251211_add_user_id_to_embedding_cache.sql`

### Error: "function does not exist" o errores en Edge Functions
**Solución:** Redespliega las Edge Functions desde tu terminal:
```bash
cd supabase/functions
supabase functions deploy generate-embedding-with-cache
supabase functions deploy search-products-hybrid
```

### Error: "invalid input syntax for type uuid"
**Solución:** Asegúrate de que el `user_id` que envías sea un UUID válido o `null`

