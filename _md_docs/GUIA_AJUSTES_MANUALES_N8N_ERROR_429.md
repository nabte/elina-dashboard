# Guía: Ajustes Manuales en n8n para Solucionar Error 429

## 🎯 Objetivo
Actualizar 3 nodos de embedding para usar la Edge Function con cache y retry, evitando el error 429 de rate limiting.

---

## 📋 PASO 1: Desplegar la Edge Function en Supabase

**IMPORTANTE:** Primero debes desplegar la Edge Function antes de actualizar n8n.

1. Ve a tu proyecto de Supabase
2. Ve a **Edge Functions** → **Create a new function**
3. Nombre: `generate-embedding-with-cache`
4. Copia el contenido de `supabase/functions/generate-embedding-with-cache/index.ts`
5. Despliega la función

**O usando CLI:**
```bash
supabase functions deploy generate-embedding-with-cache
```

---

## 📋 PASO 2: Actualizar Nodo "1. RAG - Obtener Embedding1"

### Ubicación en el workflow:
Busca el nodo llamado **"1. RAG - Obtener Embedding1"**

### Cambios a realizar:

1. **Abrir el nodo** → Click en el nodo

2. **Cambiar la URL:**
   - ❌ **ANTES:** `https://api.openai.com/v1/embeddings`
   - ✅ **AHORA:** `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-embedding-with-cache`
   - ⚠️ **Nota:** Reemplaza `mytvwfbijlgbihlegmfg` con tu Project ID de Supabase si es diferente

3. **Eliminar la autenticación:**
   - Ve a la sección **"Authentication"**
   - Cambia de `Bearer Auth` a **"None"** o elimina las credenciales

4. **Agregar Headers manualmente:**
   - Ve a **"Send Headers"** → Actívalo
   - Agrega estos 3 headers:
   
   | Name | Value |
   |------|-------|
   | `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE` |
   | `apikey` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTg5OTAsImV4cCI6MjA2OTk5NDk5MH0.eFL6N7pR4nmpOLywRwxZS_sEWwSbq5WGAnY0zBMreDE` |
   | `Content-Type` | `application/json` |

   ⚠️ **IMPORTANTE:** Reemplaza los tokens con tu **Service Role Key** de Supabase si es diferente.

5. **Cambiar el Body JSON:**
   - Ve a **"Specify Body"** → Selecciona **"JSON"**
   - ❌ **ANTES:**
     ```json
     {
       "model": "text-embedding-3-small",
       "input": "{{ $('set text1').item.json.text.replace(/<\/?audio>|\n/g, ' ').trim() }}"
     }
     ```
   - ✅ **AHORA:**
     ```json
     {
       "text": "{{ $('set text1').item.json.text.replace(/<\/?audio>|\n/g, ' ').trim() }}",
       "model": "text-embedding-3-small"
     }
     ```

6. **Agregar Retry (Opcional pero recomendado):**
   - Ve a **"Options"** → Expande
   - Activa **"Retry On Fail"**
   - **Max Retries:** `3`

7. **Guardar** el nodo

---

## 📋 PASO 3: Actualizar Nodo "2. RAG - Buscar en Supabase1"

### Ubicación:
Busca el nodo **"2. RAG - Buscar en Supabase1"** (el que viene después de "1. RAG - Obtener Embedding1")

### Cambios a realizar:

1. **Abrir el nodo**

2. **Cambiar el campo `query_embedding` en el Body JSON:**
   - Ve a **"Specify Body"** → **"JSON"**
   - Busca el campo `query_embedding`
   - ❌ **ANTES:**
     ```json
     {
       "query_embedding": "[{{ $('1. RAG - Obtener Embedding1').item.json.data[0].embedding }}]",
       ...
     }
     ```
   - ✅ **AHORA:**
     ```json
     {
       "query_embedding": "[{{ $('1. RAG - Obtener Embedding1').item.json.embedding.join(',') }}]",
       ...
     }
     ```

3. **Guardar** el nodo

---

## 📋 PASO 4: Actualizar Nodo "1b. Obtener Embedding Humano1"

### Ubicación:
Busca el nodo **"1b. Obtener Embedding Humano1"**

### Cambios a realizar:

1. **Abrir el nodo**

2. **Cambiar la URL:**
   - ❌ **ANTES:** `https://api.openai.com/v1/embeddings`
   - ✅ **AHORA:** `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-embedding-with-cache`

3. **Eliminar autenticación:**
   - Cambia de `Bearer Auth` a **"None"**

4. **Agregar Headers:**
   - Mismos 3 headers del Paso 2:
     - `Authorization`: `Bearer [TU_SERVICE_ROLE_KEY]`
     - `apikey`: `[TU_SERVICE_ROLE_KEY]`
     - `Content-Type`: `application/json`

5. **Cambiar el Body JSON:**
   - ❌ **ANTES:**
     ```json
     {
       "model": "text-embedding-3-small",
       "input": "{{ $('human1').item.json.content }}"
     }
     ```
   - ✅ **AHORA:**
     ```json
     {
       "text": "{{ $('human1').item.json.content }}",
       "model": "text-embedding-3-small"
     }
     ```

6. **Agregar Retry:**
   - Options → Retry On Fail → Max Retries: `3`

7. **Guardar** el nodo

---

## 📋 PASO 5: Actualizar Nodo que usa "1b. Obtener Embedding Humano1"

### Ubicación:
Busca el nodo que usa el resultado de **"1b. Obtener Embedding Humano1"** (probablemente un nodo Supabase que guarda el embedding)

### Cambios a realizar:

1. **Abrir el nodo**

2. **Buscar el campo que usa el embedding:**
   - Busca algo como: `{{ $('1b. Obtener Embedding Humano1').item.json.data[0].embedding }}`

3. **Cambiar a:**
   - ✅ **AHORA:** `{{ $('1b. Obtener Embedding Humano1').item.json.embedding.join(',') }}`

4. **Guardar** el nodo

---

## 📋 PASO 6: Actualizar Nodo "2b. Obtener Embedding IA1"

### Ubicación:
Busca el nodo **"2b. Obtener Embedding IA1"**

### Cambios a realizar:

1. **Abrir el nodo**

2. **Cambiar la URL:**
   - ❌ **ANTES:** `https://api.openai.com/v1/embeddings`
   - ✅ **AHORA:** `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/generate-embedding-with-cache`

3. **Eliminar autenticación:**
   - Cambia de `Bearer Auth` a **"None"**

4. **Agregar Headers:**
   - Mismos 3 headers:
     - `Authorization`: `Bearer [TU_SERVICE_ROLE_KEY]`
     - `apikey`: `[TU_SERVICE_ROLE_KEY]`
     - `Content-Type`: `application/json`

5. **Cambiar el Body JSON:**
   - ❌ **ANTES:**
     ```json
     {
       "model": "text-embedding-3-small",
       "input": {{ JSON.stringify($('AI1').item.json.content.replace(/\\[AUDIO\\]:?|\n/gi, ' ').trim()) }}
     }
     ```
   - ✅ **AHORA:**
     ```json
     {
       "text": {{ JSON.stringify($('AI1').item.json.content.replace(/\\[AUDIO\\]:?|\n/gi, ' ').trim()) }},
       "model": "text-embedding-3-small"
     }
     ```

6. **Agregar Retry:**
   - Options → Retry On Fail → Max Retries: `3`

7. **Guardar** el nodo

---

## 📋 PASO 7: Actualizar Nodo que usa "2b. Obtener Embedding IA1"

### Ubicación:
Busca el nodo que usa el resultado de **"2b. Obtener Embedding IA1"** (probablemente un nodo Supabase que guarda el embedding)

### Cambios a realizar:

1. **Abrir el nodo**

2. **Buscar el campo que usa el embedding:**
   - Busca algo como: `{{ $('2b. Obtener Embedding IA1').item.json.data[0].embedding }}`

3. **Cambiar a:**
   - ✅ **AHORA:** `{{ $('2b. Obtener Embedding IA1').item.json.embedding.join(',') }}`

4. **Guardar** el nodo

---

## ✅ Verificación Final

### 1. Probar el workflow:
- Ejecuta el workflow manualmente
- Verifica que no haya errores 429
- Revisa los logs de la Edge Function en Supabase

### 2. Verificar el cache:
Ejecuta en Supabase SQL Editor:
```sql
SELECT COUNT(*) as total_embeddings, 
       SUM(usage_count) as total_uses
FROM embedding_cache;
```

Si ves registros, el cache está funcionando.

### 3. Monitorear logs:
- Ve a Supabase → Edge Functions → `generate-embedding-with-cache` → Logs
- Deberías ver mensajes como:
  - `"Embedding encontrado en cache..."` (cuando usa cache)
  - `"Generando nuevo embedding..."` (cuando llama a OpenAI)

---

## 🔧 Troubleshooting

### Error: "Function not found"
- Verifica que la Edge Function esté desplegada
- Verifica que el nombre sea exactamente: `generate-embedding-with-cache`

### Error: "Unauthorized"
- Verifica que el Service Role Key sea correcto
- Verifica que los headers `Authorization` y `apikey` tengan el mismo token

### Error: "Invalid embedding format"
- Verifica que el campo `query_embedding` use `.join(',')` en lugar de `.data[0].embedding`

### El cache no funciona
- Verifica que la tabla `embedding_cache` exista (debería crearse automáticamente con la migración)
- Verifica los logs de la Edge Function para ver errores

---

## 📝 Resumen de Cambios

| Nodo | Cambio Principal |
|------|----------------|
| `1. RAG - Obtener Embedding1` | URL → Edge Function, Body: `input` → `text` |
| `2. RAG - Buscar en Supabase1` | `data[0].embedding` → `embedding.join(',')` |
| `1b. Obtener Embedding Humano1` | URL → Edge Function, Body: `input` → `text` |
| Nodo que usa `1b` | `data[0].embedding` → `embedding.join(',')` |
| `2b. Obtener Embedding IA1` | URL → Edge Function, Body: `input` → `text` |
| Nodo que usa `2b` | `data[0].embedding` → `embedding.join(',')` |

---

## 🎯 Resultado Esperado

Después de estos cambios:
- ✅ No más errores 429 (o significativamente reducidos)
- ✅ Respuestas más rápidas gracias al cache
- ✅ Menor costo en llamadas a OpenAI
- ✅ Retry automático en caso de rate limit temporal

