# Verificación del Sistema RAG - ELINA V5

## Resumen de Cambios

### 1. **Logs Reducidos**
Se eliminaron logs innecesarios de:
- ✅ Suscripciones
- ✅ AI Labels (evaluaciones automáticas)
- ✅ Promociones
- ✅ RAG (búsquedas)
- ✅ Conversational Agent
- ✅ Evolution API

### 2. **Logs Críticos Agregados**

#### **Envío de Respuestas**
```
📤 [SEND] Destination: 5215512345678@s.whatsapp.net
📝 [SEND] Response preview: "Hola! Sí, tenemos planes telefónicos..."
```

#### **RAG Knowledge Base**
```
🔍 [RAG] Found 3 knowledge chunks
📄 [RAG] First chunk: "Planes telefónicos: Ofrecemos planes desde $299..." (similarity: 0.85)
```

---

## Cómo Verificar que el RAG Funciona

### **Paso 1: Verificar que los archivos se guardaron correctamente**

1. Ve a Supabase Dashboard → Table Editor → `knowledge_base`
2. Filtra por `user_id = f2ef49c6-4646-42f8-8130-aa5cd0d3c84f` (tu user_id)
3. Verifica que existan registros con:
   - `content`: El texto del archivo
   - `embedding`: Un array de números (vector de 1536 dimensiones)
   - `metadata`: Información del archivo (nombre, tipo, etc.)

**Si NO hay registros:**
- El problema está en `knowledge-files` (no está guardando)
- Revisa los logs de esa función

**Si SÍ hay registros:**
- Los archivos se guardaron correctamente ✅
- Continúa al Paso 2

---

### **Paso 2: Verificar que el RPC funciona**

Ejecuta este query en Supabase SQL Editor:

```sql
SELECT 
    content,
    metadata,
    1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM knowledge_base
WHERE user_id = 'f2ef49c6-4646-42f8-8130-aa5cd0d3c84f'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 3;
```

**Reemplaza** `[0.1, 0.2, ...]` con un embedding real de prueba (puedes copiar uno de la tabla).

**Si devuelve resultados:**
- El RPC `search_knowledge_base` funciona ✅

**Si NO devuelve resultados:**
- Hay un problema con el RPC
- Verifica que la función `search_knowledge_base` exista en Database → Functions

---

### **Paso 3: Verificar que elina-v5 llama al RAG**

Envía un mensaje a tu WhatsApp que debería activar el RAG, por ejemplo:
```
"¿Tienen planes telefónicos?"
```

**En los logs de Supabase (Functions → elina-v5 → Logs), deberías ver:**

```
🔍 [RAG] Found 3 knowledge chunks
📄 [RAG] First chunk: "Planes telefónicos: Ofrecemos..." (similarity: 0.85)
```

**Si ves `Found 0 knowledge chunks`:**
- El RAG está buscando pero no encuentra coincidencias
- Posibles causas:
  1. El `user_id` no coincide
  2. El threshold de similitud es muy alto (0.7)
  3. El contenido del archivo no es relevante para la pregunta

**Si NO ves ningún log de RAG:**
- `elina-v5` no está llamando al RAG
- Verifica que el intent sea correcto

---

### **Paso 4: Verificar el user_id**

El `user_id` debe ser el mismo en:
1. `knowledge_base` (donde se guardan los archivos)
2. `elina-v5` (cuando busca en el RAG)

**Para verificar:**

1. En los logs de `knowledge-files`, busca:
```
✅ [UPLOAD] File uploaded successfully for user: f2ef49c6-4646-42f8-8130-aa5cd0d3c84f
```

2. En los logs de `elina-v5`, busca:
```
🔍 [RAG] Searching knowledge base for user: f2ef49c6-4646-42f8-8130-aa5cd0d3c84f
```

**Si los user_id NO coinciden:**
- Hay un problema de autenticación
- Verifica que estés usando el mismo `SUPABASE_ANON_KEY` en ambas funciones

---

## Sobre "No te respondió"

### **Posibles Causas**

1. **Evolution API no está conectada**
   - Verifica en Evolution Dashboard que la instancia esté "Connected"

2. **Número incorrecto**
   - Ahora los logs muestran: `📤 [SEND] Destination: 5215512345678@s.whatsapp.net`
   - Verifica que ese sea TU número

3. **El mensaje se envió pero WhatsApp lo bloqueó**
   - WhatsApp puede bloquear mensajes si:
     - Envías demasiados mensajes seguidos
     - El contenido parece spam
     - La instancia está marcada como spam

4. **Error en Evolution API**
   - Los logs mostrarán: `❌ [EVOLUTION] Error sending message: ...`

---

## Checklist de Verificación

- [ ] Los archivos están en `knowledge_base` con embeddings
- [ ] El RPC `search_knowledge_base` devuelve resultados
- [ ] Los logs muestran `🔍 [RAG] Found X knowledge chunks`
- [ ] El `user_id` coincide en ambas funciones
- [ ] Los logs muestran el número de destino correcto
- [ ] Evolution API está conectada
- [ ] No hay errores de `❌ [EVOLUTION]`

---

## Próximos Pasos

1. **Envía un mensaje de prueba** y revisa los logs
2. **Comparte los logs** si algo no funciona
3. **Verifica la tabla `knowledge_base`** para confirmar que los archivos están ahí
