# ⚡ Ajustes Rápidos en n8n - Error 429

## 🎯 Resumen
Actualizar 3 nodos para usar Edge Function con cache (evita error 429).

---

## 📌 ANTES DE EMPEZAR

1. **Desplegar Edge Function en Supabase:**
   - Ve a Supabase → Edge Functions
   - Crea función: `generate-embedding-with-cache`
   - Copia código de: `supabase/functions/generate-embedding-with-cache/index.ts`
   - Despliega

2. **Obtener Service Role Key:**
   - Supabase → Settings → API
   - Copia el **Service Role Key** (secreto)

---

## 🔧 NODO 1: "1. RAG - Obtener Embedding1"

### Cambios:

| Campo | Antes | Ahora |
|-------|-------|-------|
| **URL** | `https://api.openai.com/v1/embeddings` | `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-embedding-with-cache` |
| **Authentication** | `Bearer Auth` | `None` |
| **Headers** | (ninguno) | Agregar 3 headers (ver abajo) |
| **Body JSON** | `{"model": "...", "input": "..."}` | `{"text": "...", "model": "..."}` |
| **Retry** | (ninguno) | Activar: Max 3 retries |

### Headers a agregar:
```
Authorization: Bearer [TU_SERVICE_ROLE_KEY]
apikey: [TU_SERVICE_ROLE_KEY]
Content-Type: application/json
```

### Body JSON nuevo:
```json
{
  "text": "{{ $('set text1').item.json.text.replace(/<\/?audio>|\n/g, ' ').trim() }}",
  "model": "text-embedding-3-small"
}
```

---

## 🔧 NODO 2: "2. RAG - Buscar en Supabase1"

### Cambio único:

En el **Body JSON**, cambiar:

❌ **ANTES:**
```json
"query_embedding": "[{{ $('1. RAG - Obtener Embedding1').item.json.data[0].embedding }}]"
```

✅ **AHORA:**
```json
"query_embedding": "[{{ $('1. RAG - Obtener Embedding1').item.json.embedding.join(',') }}]"
```

---

## 🔧 NODO 3: "1b. Obtener Embedding Humano1"

### Cambios (iguales al Nodo 1):

| Campo | Antes | Ahora |
|-------|-------|-------|
| **URL** | `https://api.openai.com/v1/embeddings` | `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-embedding-with-cache` |
| **Authentication** | `Bearer Auth` | `None` |
| **Headers** | (ninguno) | Mismos 3 headers del Nodo 1 |
| **Body JSON** | `{"model": "...", "input": "..."}` | `{"text": "...", "model": "..."}` |
| **Retry** | (ninguno) | Activar: Max 3 retries |

### Body JSON nuevo:
```json
{
  "text": "{{ $('human1').item.json.content }}",
  "model": "text-embedding-3-small"
}
```

---

## 🔧 NODO 4: Nodo que usa "1b. Obtener Embedding Humano1"

Busca el nodo **Supabase** que actualiza `chat_history` con el embedding.

### Cambio:

En el campo **embedding**, cambiar:

❌ **ANTES:**
```
[{{ $('1b. Obtener Embedding Humano1').item.json.data[0].embedding }}]
```

✅ **AHORA:**
```
[{{ $('1b. Obtener Embedding Humano1').item.json.embedding.join(',') }}]
```

---

## 🔧 NODO 5: "2b. Obtener Embedding IA1"

### Cambios (iguales al Nodo 1):

| Campo | Antes | Ahora |
|-------|-------|-------|
| **URL** | `https://api.openai.com/v1/embeddings` | `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-embedding-with-cache` |
| **Authentication** | `Bearer Auth` | `None` |
| **Headers** | (ninguno) | Mismos 3 headers del Nodo 1 |
| **Body JSON** | `{"model": "...", "input": "..."}` | `{"text": "...", "model": "..."}` |
| **Retry** | (ninguno) | Activar: Max 3 retries |

### Body JSON nuevo:
```json
{
  "text": {{ JSON.stringify($('AI1').item.json.content.replace(/\\[AUDIO\\]:?|\n/gi, ' ').trim()) }},
  "model": "text-embedding-3-small"
}
```

---

## 🔧 NODO 6: Nodo que usa "2b. Obtener Embedding IA1"

Busca el nodo **Supabase** que actualiza `chat_history` con el embedding.

### Cambio:

En el campo **embedding**, cambiar:

❌ **ANTES:**
```
[{{ $('2b. Obtener Embedding IA1').item.json.data[0].embedding }}]
```

✅ **AHORA:**
```
[{{ $('2b. Obtener Embedding IA1').item.json.embedding.join(',') }}]
```

---

## ✅ Checklist Final

- [ ] Edge Function desplegada en Supabase
- [ ] Nodo "1. RAG - Obtener Embedding1" actualizado
- [ ] Nodo "2. RAG - Buscar en Supabase1" actualizado
- [ ] Nodo "1b. Obtener Embedding Humano1" actualizado
- [ ] Nodo que usa "1b" actualizado
- [ ] Nodo "2b. Obtener Embedding IA1" actualizado
- [ ] Nodo que usa "2b" actualizado
- [ ] Workflow probado sin errores

---

## 🧪 Probar

1. Ejecuta el workflow manualmente
2. Verifica que no haya errores 429
3. Revisa logs en Supabase → Edge Functions → `generate-embedding-with-cache`

---

## ⚠️ Notas Importantes

- Reemplaza `mytvwfbijlgbihlegmfg` con tu **Project ID** de Supabase
- Reemplaza `[TU_SERVICE_ROLE_KEY]` con tu **Service Role Key** real
- El Service Role Key es el mismo para todos los headers `Authorization` y `apikey`

---

## 🆘 Si algo falla

1. **Error "Function not found":** Verifica que la Edge Function esté desplegada
2. **Error "Unauthorized":** Verifica que el Service Role Key sea correcto
3. **Error "Invalid embedding":** Verifica que uses `.join(',')` en lugar de `.data[0].embedding`

