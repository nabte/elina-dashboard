# 🔄 Guía: Convertir Elina V4 a Versión Simulación

## 📋 Resumen

Esta guía explica **exactamente qué cambiar** en el workflow `Elina V4 (1).json` para convertirlo en una versión de simulación que:
- ✅ Retorne JSON en lugar de enviar por WhatsApp
- ✅ No verifique suscripción activa
- ✅ No verifique usuario ignorado
- ✅ Mantenga todas las funcionalidades (RAG, productos, promociones, etc.)

---

## 🎯 Cambios Principales

### **1. Cambiar el Webhook de Entrada**

**Nodo:** `Webhook1`

**Cambios:**
- **Path actual:** `a/messages-upsert`
- **Path nuevo:** `elina-simulacion`
- **Agregar detección de simulación:** El nodo debe detectar si `body.isSimulation === true`

**Código para agregar al inicio (después del webhook):**
```javascript
// Detectar si es simulación
const isSimulation = $input.item.json.body?.isSimulation === true;
return [{
  json: {
    ...$input.item.json,
    isSimulation: isSimulation
  }
}];
```

---

### **2. ELIMINAR: Verificación de Suscripción**

**Nodos a ELIMINAR o BYPASS:**
- `Get Subscription1` - Obtener suscripción
- `If2` - Verificar si está activa o en trial

**Solución:**
- **Opción A (Recomendada):** Eliminar estos nodos y conectar directamente
- **Opción B:** Agregar condición `IF isSimulation === false` antes de estos nodos

**Conexión directa:**
```
Webhook1 → (eliminar Get Subscription1 e If2) → evolution_instance_name1
```

---

### **3. ELIMINAR: Verificación de Usuario Ignorado**

**Nodos a ELIMINAR o BYPASS:**
- `ignorar?1` - Verificar si el contacto tiene etiqueta "ignorar"

**Solución:**
- Eliminar el nodo `ignorar?1` y conectar directamente
- O agregar condición `IF isSimulation === false` antes de este nodo

**Conexión directa:**
```
buscar contacto1 → (eliminar ignorar?1) → Create a row1
```

---

### **4. CAMBIAR: Todos los Nodos de Evolution API → Respond to Webhook**

**Nodos a CAMBIAR:**

#### **A. Enviar texto3**
- **Tipo actual:** `n8n-nodes-evolution-api.evolutionApi` (send-text)
- **Tipo nuevo:** `n8n-nodes-base.respondToWebhook`
- **Configuración:**
```json
{
  "respondWith": "json",
  "responseBody": "={{ JSON.stringify({\n  success: true,\n  response: $('Definir destinatario1').item.json['mensaje texto '] || $('AI Agent').item.json.output || '',\n  simulation: true,\n  message_type: 'text',\n  timestamp: new Date().toISOString()\n}) }}"
}
```

#### **B. Enviar imagem1**
- **Tipo actual:** `n8n-nodes-evolution-api.evolutionApi` (send-image)
- **Tipo nuevo:** `n8n-nodes-base.respondToWebhook`
- **Configuración:**
```json
{
  "respondWith": "json",
  "responseBody": "={{ JSON.stringify({\n  success: true,\n  response: $('Definir destinatario1').item.json['mensaje texto '] || '',\n  image_url: $('Definir destinatario1').item.json.url_imagen || '',\n  simulation: true,\n  message_type: 'image',\n  timestamp: new Date().toISOString()\n}) }}"
}
```

#### **C. Enviar Video1**
- **Tipo actual:** `n8n-nodes-evolution-api.evolutionApi` (send-video)
- **Tipo nuevo:** `n8n-nodes-base.respondToWebhook`
- **Configuración:**
```json
{
  "respondWith": "json",
  "responseBody": "={{ JSON.stringify({\n  success: true,\n  response: $('Definir destinatario1').item.json['mensaje texto '] || '',\n  video_url: $('Definir destinatario1').item.json.urlVideo || '',\n  simulation: true,\n  message_type: 'video',\n  timestamp: new Date().toISOString()\n}) }}"
}
```

#### **D. Enviar audio**
- **Tipo actual:** `n8n-nodes-evolution-api.evolutionApi` (send-audio)
- **Tipo nuevo:** `n8n-nodes-base.respondToWebhook`
- **Configuración:**
```json
{
  "respondWith": "json",
  "responseBody": "={{ JSON.stringify({\n  success: true,\n  response: $('Definir destinatario1').item.json['mensaje texto '] || '',\n  audio_url: $('Convert text to speech').item.json.outputUrl || '',\n  simulation: true,\n  message_type: 'audio',\n  timestamp: new Date().toISOString()\n}) }}"
}
```

#### **E. Enviar PDF Cotización**
- **Tipo actual:** `n8n-nodes-evolution-api.evolutionApi` (send-document)
- **Tipo nuevo:** `n8n-nodes-base.respondToWebhook`
- **Configuración:**
```json
{
  "respondWith": "json",
  "responseBody": "={{ JSON.stringify({\n  success: true,\n  response: 'Cotización generada',\n  quote_pdf_url: $('Crear Cotización').item.json.pdf_url || '',\n  quote_id: $('Crear Cotización').item.json.id || '',\n  simulation: true,\n  message_type: 'document',\n  timestamp: new Date().toISOString()\n}) }}"
}
```

---

### **5. AGREGAR: Detección de Simulación en el Flujo Principal**

**Después del nodo `Webhook1`, agregar un nodo Code:**

**Nombre:** `Detectar Simulación`

**Código:**
```javascript
const body = $input.item.json.body || $input.item.json;
const isSimulation = body.isSimulation === true;

// Extraer datos necesarios
const userId = body.simulationUserId || body.data?.key?.remoteJid?.replace('@s.whatsapp.net', '').replace('+', '').replace('SIM', '');
const messageText = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || '';

return [{
  json: {
    ...$input.item.json,
    isSimulation: isSimulation,
    simulationUserId: userId,
    messageText: messageText
  }
}];
```

**Conexión:**
```
Webhook1 → Detectar Simulación → (resto del flujo)
```

---

### **6. MODIFICAR: Nodos que Dependen del Webhook Original**

**Nodos que usan `$('Webhook1')` y necesitan adaptación:**

#### **A. evolution_instance_name1**
- **Cambio:** Si es simulación, obtener userId directamente
- **Código alternativo:**
```javascript
const isSimulation = $('Detectar Simulación').item.json.isSimulation;
const userId = isSimulation 
  ? $('Detectar Simulación').item.json.simulationUserId
  : $('Webhook1').item.json.body.instance;

return [{ json: { instance: userId, isSimulation } }];
```

#### **B. buscar contacto1**
- **Cambio:** Si es simulación, crear contacto temporal o usar ID fijo
- **Código alternativo:**
```javascript
const isSimulation = $('Detectar Simulación').item.json.isSimulation;

if (isSimulation) {
  // Retornar contacto simulado
  return [{
    json: {
      id: 'SIM_CONTACT',
      user_id: $('Detectar Simulación').item.json.simulationUserId,
      phone_number: 'SIMULATION',
      full_name: 'Usuario de Simulación'
    }
  }];
}

// Flujo normal (buscar contacto real)
// ... código original ...
```

#### **C. set text1**
- **Cambio:** Si es simulación, usar messageText directamente
- **Código alternativo:**
```javascript
const isSimulation = $('Detectar Simulación').item.json.isSimulation;
const messageText = isSimulation
  ? $('Detectar Simulación').item.json.messageText
  : $('Webhook1').item.json.body.data.message.conversation;

return [{ json: { text: messageText } }];
```

---

### **7. OPCIONAL: Agregar Condición IF para Simulación**

**Agregar nodo IF después de `Definir destinatario1`:**

**Nombre:** `IF: ¿Es Simulación?`

**Configuración:**
- **Condition:** `Boolean`
- **Value 1:** `={{ $('Detectar Simulación').item.json.isSimulation }}`
- **Value 2:** `true`

**Conexiones:**
- **TRUE (es simulación):** → `Responder JSON` (nuevo nodo)
- **FALSE (no es simulación):** → Flujo normal (Enviar texto3, Enviar imagem1, etc.)

---

### **8. CREAR: Nodo Final "Responder JSON"**

**Nuevo nodo después de `Definir destinatario1`:**

**Tipo:** `n8n-nodes-base.respondToWebhook`

**Nombre:** `Responder JSON Simulación`

**Configuración:**
```json
{
  "respondWith": "json",
  "responseBody": "={{ JSON.stringify({\n  success: true,\n  response: $('Definir destinatario1').item.json['mensaje texto '] || $('AI Agent').item.json.output || '',\n  image_url: $('Definir destinatario1').item.json.url_imagen || null,\n  video_url: $('Definir destinatario1').item.json.urlVideo || null,\n  audio_url: $('Definir destinatario1').item.json.url_audio || null,\n  quote_pdf_url: $('Crear Cotización')?.item?.json?.pdf_url || null,\n  quote_id: $('Crear Cotización')?.item?.json?.id || null,\n  simulation: true,\n  context_used: {\n    rag_messages: $('3. RAG - Formatear Contexto1').item.json.rag_context || 'N/A',\n    has_rag: !!$('3. RAG - Formatear Contexto1').item.json.rag_context,\n    has_promotions: !!$('Buscar Promociones Activas')?.item?.json?.promotions?.length,\n    critical_detected: $('Detectar Intención Crítica')?.item?.json?.is_critical || false\n  },\n  timestamp: new Date().toISOString()\n}) }}"
}
```

---

## 📝 Checklist de Cambios

- [ ] Cambiar path del webhook a `elina-simulacion`
- [ ] Agregar nodo "Detectar Simulación" después del webhook
- [ ] Eliminar o bypass nodo "Get Subscription1"
- [ ] Eliminar o bypass nodo "If2" (verificación suscripción)
- [ ] Eliminar o bypass nodo "ignorar?1" (usuario ignorado)
- [ ] Modificar "evolution_instance_name1" para soportar simulación
- [ ] Modificar "buscar contacto1" para soportar simulación
- [ ] Modificar "set text1" para soportar simulación
- [ ] Cambiar "Enviar texto3" → "Respond to Webhook"
- [ ] Cambiar "Enviar imagem1" → "Respond to Webhook"
- [ ] Cambiar "Enviar Video1" → "Respond to Webhook"
- [ ] Cambiar "Enviar audio" → "Respond to Webhook"
- [ ] Cambiar "Enviar PDF Cotización" → "Respond to Webhook"
- [ ] Agregar nodo "IF: ¿Es Simulación?" antes de los nodos de respuesta
- [ ] Crear nodo "Responder JSON Simulación"
- [ ] Probar con request de simulación
- [ ] Verificar que el flujo normal siga funcionando

---

## 🔄 Flujo Final

### **Flujo Normal (isSimulation = false):**
```
Webhook1 → Verificar Suscripción → Buscar Contacto → ... → Enviar por WhatsApp
```

### **Flujo Simulación (isSimulation = true):**
```
Webhook1 → Detectar Simulación → (bypass filtros) → ... → Responder JSON
```

---

## ⚠️ Notas Importantes

1. **No afecta el flujo normal:** Si `isSimulation === false`, todo funciona igual
2. **Mantiene funcionalidades:** RAG, productos, promociones, detección crítica, etc.
3. **Solo cambia la salida:** En lugar de WhatsApp, retorna JSON
4. **Logs mejorados:** El JSON incluye información del contexto usado

---

## 🧪 Testing

**Request de prueba:**
```json
{
  "isSimulation": true,
  "simulationUserId": "uuid-del-usuario",
  "data": {
    "key": {
      "remoteJid": "521SIMxxxxxxxx@s.whatsapp.net"
    },
    "message": {
      "conversation": "Hola, quiero información sobre productos"
    }
  }
}
```

**Response esperado:**
```json
{
  "success": true,
  "response": "Respuesta generada por la IA...",
  "simulation": true,
  "context_used": {
    "rag_messages": "...",
    "has_rag": true,
    "has_promotions": false,
    "critical_detected": false
  },
  "timestamp": "2025-01-03T12:00:00.000Z"
}
```

