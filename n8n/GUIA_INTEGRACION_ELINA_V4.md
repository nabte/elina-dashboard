# 📋 Guía de Integración: Detección Crítica y Promociones en Elina V4

Esta guía explica cómo integrar **Detección Crítica** y **Promociones Inteligentes** en el flow principal "Elina V4" de n8n.

---

## 🎯 Objetivo

Integrar ambas funcionalidades en el flow principal para:
- **Detección Crítica**: Detectar intenciones críticas ANTES de generar respuesta de IA y pausar la conversación si es necesario
- **Promociones Inteligentes**: Buscar promociones activas y agregarlas al contexto de la IA para que las mencione naturalmente

---

## 📍 Puntos de Integración en el Flow

### **Flujo Actual del Flow "Elina V4":**

```
Webhook → Verificar Suscripción → Buscar/Crear Contacto
  ↓
Procesar Mensaje (texto/audio/imagen)
  ↓
Obtener Contexto RAG
  ↓
Generar Respuesta con IA Agent
  ↓
Enviar Respuesta → Guardar en chat_history
```

### **Flujo con Integraciones:**

```
Webhook → Verificar Suscripción → Buscar/Crear Contacto
  ↓
Procesar Mensaje (texto/audio/imagen)
  ↓
Obtener Contexto RAG
  ↓
[DETECCIÓN CRÍTICA] ← NUEVO NODO
  ├─ Si es crítico → Pausar conversación → Enviar notificación → FIN (no generar respuesta IA)
  └─ Si no es crítico → Continuar
  ↓
[PROMOCIONES INTELIGENTES] ← NUEVO NODO
  └─ Buscar promos activas → Agregar al contexto si hay
  ↓
Generar Respuesta con IA Agent (con contexto RAG + promos)
  ↓
Enviar Respuesta → Guardar en chat_history
```

---

## 🔧 Paso 1: Agregar Nodo de Detección Crítica

### **Ubicación:** 
Después del nodo **"3. RAG - Formatear Contexto"**, antes de **"AI Agent1"**

### **Nodo 1: HTTP Request - Detectar Intención Crítica**

**Tipo:** `HTTP Request`

**Configuración:**
- **Method:** `POST`
- **URL:** `={{ $env.SUPABASE_URL }}/functions/v1/detect-critical-intent`
- **Authentication:** `Generic Credential Type` → `httpHeaderAuth`
- **Headers:**
  - `apikey`: `={{ $env.SUPABASE_SERVICE_KEY }}`
  - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "contact_id": {{ $('Get Contact ID').item.json.id }},
  "user_id": "{{ $('Get a row').item.json.id }}",
  "message_content": "{{ $('set text').item.json.text }}",
  "message_id": {{ $('human').item.json.id || null }}
}
```

**Nombre del nodo:** `Detectar Intención Crítica`

---

### **Nodo 2: IF - ¿Es Crítico?**

**Tipo:** `IF`

**Configuración:**
- **Condition:** `Boolean`
- **Value 1:** `={{ $json.is_critical }}`
- **Value 2:** `true`

**Nombre del nodo:** `IF: ¿Es Crítico?`

**Conexiones:**
- **TRUE (es crítico):** → Nodo "Pausar y Notificar"
- **FALSE (no es crítico):** → Nodo "Buscar Promociones"

---

### **Nodo 3: Obtener Número de Notificación**

**Tipo:** `Supabase` (o `HTTP Request` a Supabase)

**Configuración:**
- **Operation:** `Get`
- **Table:** `profiles`
- **Filters:**
  - `id` = `{{ $('Get a row').item.json.id }}`
- **Select:** `contact_phone`

**Nombre del nodo:** `Obtener Número Notificación`

**Nota:** Este nodo obtiene el número guardado en `profiles.contact_phone` (el que configuraste en Settings).

---

### **Nodo 4: Enviar Notificación WhatsApp**

**Tipo:** `Evolution API` (o `HTTP Request`)

**Configuración:**
- **Resource:** `messages-api`
- **Operation:** `send-text` (o `send-message`)
- **Instance Name:** `={{ $('Set Fields').item.json.instance.name }}`
- **Remote Jid:** `={{ $('Obtener Número Notificación').item.json.contact_phone.replace('+', '').replace('@s.whatsapp.net', '') }}`
- **Message Text:**
```
🚨 *ATENCIÓN REQUERIDA*

Se detectó una intención crítica en una conversación:

*Contacto:* {{ $('Get Contact ID').item.json.full_name || $('Webhook').item.json.body.data.pushName }}
*Número:* {{ $('Webhook').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net', '') }}

*Tipo de detección:* {{ $('Detectar Intención Crítica').item.json.detection_type }}
*Confianza:* {{ $('Detectar Intención Crítica').item.json.confidence * 100 }}%

*Mensaje detectado:*
"{{ $('Detectar Intención Crítica').item.json.detected_content }}"

La conversación ha sido pausada automáticamente. Revisa el chat en la aplicación.
```

**Nombre del nodo:** `Enviar Notificación WhatsApp`

---

### **Nodo 5: No Operation (Fin si es crítico)**

**Tipo:** `No Operation`

**Nombre del nodo:** `FIN - Conversación Pausada`

**Propósito:** Detener el flujo cuando es crítico (no generar respuesta de IA).

---

## 🔧 Paso 2: Agregar Nodo de Promociones Inteligentes

### **Ubicación:**
Después del nodo **"IF: ¿Es Crítico?"** (rama FALSE), antes de **"AI Agent1"**

### **Nodo 6: Buscar Promociones Activas**

**Tipo:** `HTTP Request` (o `Supabase`)

**Configuración:**
- **Method:** `GET`
- **URL:** `={{ $env.SUPABASE_URL }}/rest/v1/smart_promotions`
- **Query Parameters:**
  - `select`: `*`
  - `user_id`: `eq.{{ $('Get a row').item.json.id }}`
  - `is_active`: `eq.true`
- **Headers:**
  - `apikey`: `={{ $env.SUPABASE_KEY }}`
  - `Authorization`: `Bearer {{ $env.SUPABASE_KEY }}`

**Nombre del nodo:** `Buscar Promociones Activas`

---

### **Nodo 7: Code - Filtrar y Seleccionar Promoción**

**Tipo:** `Code`

**Código:**
```javascript
const promos = $input.item.json;
if (!Array.isArray(promos) || !promos.length) {
  return [{ json: { promo: null } }];
}

const now = new Date();
const selected = promos.find(promo => {
  if (!promo.is_active) return false;
  if (!promo.no_schedule) {
    if (promo.start_at && new Date(promo.start_at) > now) return false;
    if (promo.end_at && new Date(promo.end_at) < now) return false;
  }
  return true;
});

return [{ json: { promo: selected || null } }];
```

**Nombre del nodo:** `Filtrar Promoción Válida`

---

### **Nodo 8: IF - ¿Hay Promoción?**

**Tipo:** `IF`

**Configuración:**
- **Condition:** `Collection`
- **Field:** `={{ $json.promo }}`
- **Operation:** `isNotEmpty`

**Nombre del nodo:** `IF: ¿Hay Promoción?`

**Conexiones:**
- **TRUE (hay promo):** → Nodo "Agregar Promo al Contexto"
- **FALSE (no hay promo):** → Continuar a "AI Agent1"

---

### **Nodo 9: Code - Agregar Promo al Contexto**

**Tipo:** `Code`

**Código:**
```javascript
const promo = $('Filtrar Promoción Válida').item.json.promo;
const ragContext = $('3. RAG - Formatear Contexto').item.json.rag_context || '';
const text = $('set text').item.json.text || '';

let promoContext = '';
if (promo) {
  promoContext = `\n\n[PROMOCIÓN ACTIVA DISPONIBLE]\n` +
    `Título: ${promo.title || 'Promoción especial'}\n` +
    `Descripción: ${promo.description || ''}\n` +
    `Descuento/Oferta: ${promo.discount || promo.offer || ''}\n` +
    `Vigencia: ${promo.start_at ? new Date(promo.start_at).toLocaleDateString() : 'Activa'} - ${promo.end_at ? new Date(promo.end_at).toLocaleDateString() : 'Sin límite'}\n` +
    `\nSi el contexto de la conversación lo permite, menciona esta promoción de forma natural. No la fuerces si no es relevante.\n`;
}

return [{
  json: {
    ...$('3. RAG - Formatear Contexto').item.json,
    rag_context: ragContext + promoContext,
    promo_id: promo?.id || null
  }
}];
```

**Nombre del nodo:** `Agregar Promo al Contexto`

---

## 🔗 Conexiones Finales

### **Conexiones desde "3. RAG - Formatear Contexto":**
- Conectar a → **"Detectar Intención Crítica"**

### **Conexiones desde "Detectar Intención Crítica":**
- Conectar a → **"IF: ¿Es Crítico?"**

### **Conexiones desde "IF: ¿Es Crítico?" (TRUE):**
- Conectar a → **"Obtener Número Notificación"**
- Desde "Obtener Número Notificación" → **"Enviar Notificación WhatsApp"**
- Desde "Enviar Notificación WhatsApp" → **"FIN - Conversación Pausada"**

### **Conexiones desde "IF: ¿Es Crítico?" (FALSE):**
- Conectar a → **"Buscar Promociones Activas"**
- Desde "Buscar Promociones Activas" → **"Filtrar Promoción Válida"**
- Desde "Filtrar Promoción Válida" → **"IF: ¿Hay Promoción?"**
- Desde "IF: ¿Hay Promoción?" (TRUE) → **"Agregar Promo al Contexto"**
- Desde "IF: ¿Hay Promoción?" (FALSE) → **"AI Agent1"**
- Desde "Agregar Promo al Contexto" → **"AI Agent1"**

---

## 📝 Modificar el Prompt del AI Agent

En el nodo **"AI Agent1"**, actualizar el prompt para incluir el contexto de promociones:

**En la sección del prompt, agregar:**
```
{{ $json.rag_context || '' }}{{ $json.text || '' }}
{{ $json['descripcion de la imagen'] ? '\n[Descripción de imagen]: ' + $json['descripcion de la imagen'] : '' }}
{{ $json.promo_context ? '\n' + $json.promo_context : '' }}
```

---

## 🧪 Datos para Probar

### **Para Probar Detección Crítica:**

1. **Mensaje que debería ser crítico:**
   - "Quiero hablar con un humano"
   - "Necesito atención urgente"
   - "Estoy muy molesto con el servicio"

2. **Verificar:**
   - ¿Se pausó la conversación en `conversation_states`?
   - ¿Se registró en `critical_detections`?
   - ¿Llegó la notificación al número configurado en Settings?

### **Para Probar Promociones:**

1. **Crear una promoción activa en `smart_promotions`:**
   - `is_active: true`
   - `user_id: [tu user_id]`
   - `start_at: [fecha pasada]`
   - `end_at: [fecha futura]` o `null`

2. **Enviar un mensaje que podría activar la promoción:**
   - "¿Tienen ofertas?"
   - "¿Hay descuentos disponibles?"

3. **Verificar:**
   - ¿La IA mencionó la promoción en su respuesta?
   - ¿Se incluyó en el contexto correctamente?

---

## ⚠️ Notas Importantes

1. **Número de Notificación:**
   - Se obtiene de `profiles.contact_phone`
   - Debe estar en formato E.164 (ej: `+521234567890`)
   - Si no está configurado, el nodo de notificación debe manejar el error gracefully

2. **Detección Crítica:**
   - Si es crítico, **NO se genera respuesta de IA**
   - La conversación se pausa automáticamente
   - Se envía notificación al administrador

3. **Promociones:**
   - Solo se buscan promociones activas y dentro de su rango de fechas
   - Se agregan al contexto, pero la IA decide si mencionarlas o no
   - No se fuerza la promoción si no es relevante

4. **Manejo de Errores:**
   - Si falla la detección crítica, continuar normalmente (no bloquear)
   - Si falla la búsqueda de promociones, continuar sin promociones
   - Si falla la notificación, registrar error pero no bloquear el flujo

---

## ✅ Checklist de Implementación

- [ ] Agregar nodo "Detectar Intención Crítica"
- [ ] Agregar nodo "IF: ¿Es Crítico?"
- [ ] Agregar nodo "Obtener Número Notificación"
- [ ] Agregar nodo "Enviar Notificación WhatsApp"
- [ ] Agregar nodo "FIN - Conversación Pausada"
- [ ] Agregar nodo "Buscar Promociones Activas"
- [ ] Agregar nodo "Filtrar Promoción Válida"
- [ ] Agregar nodo "IF: ¿Hay Promoción?"
- [ ] Agregar nodo "Agregar Promo al Contexto"
- [ ] Conectar todos los nodos según el diagrama
- [ ] Modificar prompt del AI Agent para incluir promociones
- [ ] Probar con mensaje crítico
- [ ] Probar con promoción activa
- [ ] Verificar que las notificaciones lleguen correctamente

---

¿Necesitas ayuda con algún nodo específico o con la configuración de las credenciales?

