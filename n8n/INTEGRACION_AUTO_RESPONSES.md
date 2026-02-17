# 📋 Integración de Auto Responses en Elina V4

Esta guía explica cómo integrar la verificación de **Respuestas Automáticas** en el workflow principal "Elina V4" de n8n.

---

## 🎯 Objetivo

Verificar si el mensaje entrante coincide con alguna respuesta automática configurada ANTES de activar la IA. Si hay coincidencia, enviar la respuesta predefinida y terminar el flujo (no activar IA).

---

## 📍 Punto de Integración

### **Ubicación EXACTA:** 
**DESPUÉS del nodo:** `set text1`  
**DESPUÉS del nodo:** `Get a row1`  
**ANTES del nodo:** `1. RAG - Obtener Embedding1`

### **Orden de los nodos:**
```
... (nodos anteriores) ...
  ↓
set text1  ← Aquí ya tienes el texto procesado
  ↓
Get a row1  ← Aquí ya tienes el user_id
  ↓
[INSERTAR AQUÍ LA SECCIÓN DE AUTO RESPONSES]
  ↓
1. RAG - Obtener Embedding1  ← El siguiente nodo en el flujo
  ↓
... (resto del flujo) ...
```

### **Flujo Actual:**
```
Webhook → Verificar Suscripción → Buscar/Crear Contacto
  ↓
Procesar Mensaje (texto/audio/imagen)
  ↓
Obtener Contexto RAG
  ↓
Detección Crítica
  ↓
AI Agent
```

### **Flujo con Auto Responses:**
```
Webhook → Verificar Suscripción → Buscar/Crear Contacto
  ↓
Procesar Mensaje (texto/audio/imagen)
  ↓
[VERIFICAR AUTO RESPONSES] ← NUEVO NODO
  ├─ Si hay match y está activo → Enviar respuesta predefinida → FIN (no activar IA)
  └─ Si no hay match → Continuar flujo normal
  ↓
Obtener Contexto RAG
  ↓
Detección Crítica
  ↓
AI Agent
```

---

## 🔧 Paso 1: Agregar Nodo de Verificación de Auto Responses

### **Nodo 1: Supabase - Buscar Auto Responses**

**Tipo:** `Supabase`

**Configuración:**
- **Operation:** `Get`
- **Table:** `auto_responses`
- **Filters:**
  - `user_id`: `eq.{{ $('Get a row1').item.json.id }}` ⚠️ **NOMBRE EXACTO: Get a row1**
  - `is_active`: `eq.true`
- **Options:**
  - `Return All`: `true`

**Nombre del nodo:** `Buscar Auto Responses`

**Nota:** Este nodo buscará todas las respuestas automáticas activas del usuario.

---

## 🔧 Paso 2: Agregar Nodo de Code para Verificar Match

### **Nodo 2: Code - Verificar Match de Trigger**

**Tipo:** `Code`

**Código:**
```javascript
const autoResponses = $input.all();
const messageText = $('set text1').item.json.text || ''; // ⚠️ NOMBRE EXACTO: set text1
const normalizedMessage = messageText.toLowerCase().trim();

if (!autoResponses || autoResponses.length === 0) {
  return [{ json: { hasMatch: false, matchedResponse: null } }];
}

// Buscar coincidencia
for (const response of autoResponses) {
  const triggerText = response.json.trigger_text || '';
  const matchType = response.json.match_type || 'contains';
  const normalizedTrigger = triggerText.toLowerCase().trim();
  
  let matches = false;
  
  if (matchType === 'exact') {
    matches = normalizedMessage === normalizedTrigger;
  } else {
    // contains
    matches = normalizedMessage.includes(normalizedTrigger);
  }
  
  if (matches) {
    return [{
      json: {
        hasMatch: true,
        matchedResponse: response.json,
        responseText: response.json.response_text
      }
    }];
  }
}

// No hay coincidencia
return [{ json: { hasMatch: false, matchedResponse: null } }];
```

**Nombre del nodo:** `Verificar Match Auto Response`

**Nota:** El nodo exacto es `set text1` - no cambiar este nombre.

---

## 🔧 Paso 3: Agregar Nodo IF para Decidir Flujo

### **Nodo 3: IF - ¿Hay Match?**

**Tipo:** `IF`

**Configuración:**
- **Condition:**
  - `Value 1`: `={{ $json.hasMatch }}`
  - `Operation`: `Equal`
  - `Value 2`: `true`

**Nombre del nodo:** `IF: ¿Hay Auto Response?`

**Conexiones:**
- **TRUE** → `Enviar Auto Response`
- **FALSE** → Continuar flujo normal (Obtener Contexto RAG o Detección Crítica)

---

## 🔧 Paso 4: Agregar Nodo para Enviar Respuesta Automática

### **Nodo 4: Evolution API - Enviar Auto Response**

**Tipo:** `Evolution API`

**Configuración:**
- **Resource:** `messages-api`
- **Operation:** `send-text`
- **Instance Name:** `={{ $('Obtener Perfil de Usuario1').item.json.evolution_instance_name }}` ⚠️ **NOMBRE EXACTO: Obtener Perfil de Usuario1**
- **Remote Jid:** `={{ $('Webhook1').item.json.body.data.key.remoteJid }}` ⚠️ **NOMBRE EXACTO: Webhook1**
- **Message Text:** `={{ $('Verificar Match Auto Response').item.json.responseText }}`

**Nombre del nodo:** `Enviar Auto Response`

---

## 🔧 Paso 5: Agregar Nodo de Fin

### **Nodo 5: No Operation - Fin con Auto Response**

**Tipo:** `No Operation`

**Nombre del nodo:** `FIN - Auto Response Enviada`

**Propósito:** Detener el flujo cuando se envía una respuesta automática (no activar IA).

---

## 📊 Diagrama de Conexiones

### **Conexiones desde "Get a row1":**
- Conectar a → **"Buscar Auto Responses"** (nuevo nodo)
- Desde "Buscar Auto Responses" → **"Verificar Match Auto Response"** (nuevo nodo)
- Desde "Verificar Match Auto Response" → **"IF: ¿Hay Auto Response?"** (nuevo nodo)

### **Conexiones desde "IF: ¿Hay Auto Response?" (TRUE):**
- Conectar a → **"Enviar Auto Response"**
- Desde "Enviar Auto Response" → **"FIN - Auto Response Enviada"**

### **Conexiones desde "IF: ¿Hay Auto Response?" (FALSE):**
- Conectar a → **"1. RAG - Obtener Embedding1"** ⚠️ **NOMBRE EXACTO del siguiente nodo**

---

## ⚠️ Notas Importantes

1. **Orden de Verificación:**
   - Auto Responses se verifica ANTES de la detección crítica
   - Esto permite respuestas rápidas sin activar la IA

2. **Match Type:**
   - `exact`: Coincidencia exacta del texto
   - `contains`: El mensaje contiene el trigger

3. **Manejo de Errores:**
   - Si falla la búsqueda de auto_responses, continuar con el flujo normal
   - Si falla el envío de la respuesta automática, continuar con el flujo normal

4. **Normalización:**
   - El código normaliza el texto a minúsculas para comparación
   - Ajusta según tus necesidades (puedes hacer case-sensitive si prefieres)

---

## ✅ Checklist de Implementación

- [ ] Agregar nodo "Buscar Auto Responses"
- [ ] Agregar nodo "Verificar Match Auto Response"
- [ ] Agregar nodo "IF: ¿Hay Auto Response?"
- [ ] Agregar nodo "Enviar Auto Response"
- [ ] Agregar nodo "FIN - Auto Response Enviada"
- [ ] Conectar todos los nodos según el diagrama
- [ ] Ajustar nombres de nodos en el código según tu workflow
- [ ] Probar con mensaje que coincida con trigger activo
- [ ] Probar con mensaje que no coincida
- [ ] Verificar que la respuesta automática se envíe correctamente
- [ ] Verificar que el flujo continúe normalmente si no hay match

---

## 🧪 Datos para Probar

### **Para Probar Auto Responses:**

1. **Crear una respuesta automática en la UI:**
   - Trigger: "Hola, vi tu anuncio en Facebook"
   - Response: "¡Hola! Gracias por contactarnos..."
   - Activar: `true`
   - Match Type: `contains`

2. **Enviar mensaje de prueba:**
   - "Hola, vi tu anuncio en Facebook"
   - Debería enviar la respuesta automática y NO activar la IA

3. **Verificar:**
   - ¿Se envió la respuesta automática?
   - ¿Se detuvo el flujo antes de activar la IA?
   - ¿El flujo continúa normalmente con otros mensajes?

---

¿Necesitas ayuda con algún nodo específico o con la configuración?

