# 📋 Guía de Cambios Manuales: Auto-Responses con Media en Elina V4

Esta guía detalla los cambios que debes hacer manualmente en el workflow `Elina V4 (1).json` para agregar soporte de archivos multimedia (imagen, video, audio, documento) a las auto-responses.

---

## 🎯 Cambios Requeridos

### **1. Nodo "Buscar Auto Responses" (Ya existe, solo verificar)**

**Ubicación:** Después del nodo "Merge"

**Configuración actual:**
- ✅ Operation: `getAll`
- ✅ Table: `auto_responses`
- ✅ Filters:
  - `user_id` = `{{ $('Get a row1').item.json.id }}`
  - `is_active` = `true`
- ✅ `alwaysOutputData: true` (IMPORTANTE: debe estar activado)

**Verificar que tenga:**
```json
"alwaysOutputData": true
```

---

### **2. Nodo "Verificar Match Auto Response" (Modificar código JavaScript)**

**Ubicación:** Después de "Buscar Auto Responses"

**Código JavaScript completo a usar:**

```javascript
const autoResponses = $input.all() || [];
const messageText = $('set text1').item.json.text || ''; // ⚠️ NOMBRE EXACTO: set text1
const normalizedMessage = messageText.toLowerCase().trim();

// Filtrar solo items válidos (que tengan json y no sean null)
const validResponses = autoResponses.filter(item => {
  return item && item.json && item.json !== null && typeof item.json === 'object';
});

// Si no hay auto-responses válidas, retornar sin coincidencia (la IA continuará normalmente)
if (!validResponses || validResponses.length === 0) {
  return [{ json: { hasMatch: false, matchedResponse: null, responseText: null } }];
}

// Buscar coincidencia
for (const response of validResponses) {
  // Verificar que esté activa
  if (!response.json.is_active) {
    continue;
  }
  
  const triggerText = response.json.trigger_text || '';
  const matchType = response.json.match_type || 'contains';
  const normalizedTrigger = triggerText.toLowerCase().trim();
  
  // Si el trigger está vacío, saltar
  if (!normalizedTrigger) {
    continue;
  }
  
  let matches = false;
  
  if (matchType === 'exact') {
    matches = normalizedMessage === normalizedTrigger;
  } else {
    // contains
    matches = normalizedMessage.includes(normalizedTrigger);
  }
  
  if (matches) {
    // Verificar si hay regex para tipo dinámico
    let finalMediaType = response.json.media_type || 'text';
    let finalMediaUrl = response.json.media_url || null;
    
    // Si hay regex, verificar si el mensaje coincide
    if (response.json.response_regex && messageText) {
      try {
        // Extraer el patrón y flags del regex (formato: /patrón/flags o patrón)
        const regexStr = response.json.response_regex.trim();
        let pattern, flags = '';
        
        if (regexStr.startsWith('/')) {
          // Formato: /patrón/flags
          const match = regexStr.match(/^\/(.+?)\/([gimuy]*)$/);
          if (match) {
            pattern = match[1];
            flags = match[2] || '';
          } else {
            pattern = regexStr.slice(1); // Quitar solo la primera /
          }
        } else {
          pattern = regexStr;
        }
        
        const regex = new RegExp(pattern, flags);
        if (regex.test(messageText)) {
          // El regex coincide, usar el tipo de media configurado
          finalMediaType = response.json.media_type || 'text';
        } else {
          // El regex no coincide, usar solo texto
          finalMediaType = 'text';
          finalMediaUrl = null;
        }
      } catch (e) {
        // Si el regex es inválido, usar el tipo configurado
        console.warn('Regex inválido en auto-response:', e);
      }
    }
    
    return [{
      json: {
        hasMatch: true,
        matchedResponse: response.json,
        responseText: response.json.response_text,
        mediaType: finalMediaType,
        mediaUrl: finalMediaUrl
      }
    }];
  }
}

// No hay coincidencia
return [{ json: { hasMatch: false, matchedResponse: null, responseText: null } }];
```

**Cambios clave:**
- ✅ Filtra items null/válidos
- ✅ Retorna `mediaType` y `mediaUrl` cuando hay coincidencia
- ✅ Evalúa `response_regex` si existe para determinar tipo dinámico

---

### **3. NUEVO Nodo: "Preparar Auto Response Media" (Crear nuevo)**

**Ubicación:** Entre "IF: ¿Hay Auto Response?" (TRUE) y "Switch"

**Tipo:** `Code` (JavaScript)

**Conexiones:**
- **Input:** "IF: ¿Hay Auto Response?" (salida TRUE)
- **Output:** "Switch"

**Código JavaScript:**

```javascript
// Preparar datos de auto-response para envío según tipo de media
const autoResponseData = $input.item.json;
const responseText = autoResponseData.responseText || '';
const mediaType = autoResponseData.mediaType || 'text';
const mediaUrl = autoResponseData.mediaUrl || null;

// Preparar datos según el tipo de media
let outputData = {
  'mensaje texto ': responseText,
  url_imagen: '',
  urlVideo: '',
  urlAudio: '',
  urlDocument: '',
  mediaType: mediaType
};

// Asignar URL según tipo de media
if (mediaType === 'image' && mediaUrl) {
  outputData.url_imagen = mediaUrl;
  outputData.url = 'url'; // Para el Switch
} else if (mediaType === 'video' && mediaUrl) {
  outputData.urlVideo = mediaUrl;
  outputData.video = 'video'; // Para el Switch
} else if (mediaType === 'audio' && mediaUrl) {
  outputData.urlAudio = mediaUrl;
  outputData.audio = 'audio'; // Para el Switch
} else if (mediaType === 'document' && mediaUrl) {
  outputData.urlDocument = mediaUrl;
  outputData.doc = 'doc'; // Para el Switch
} else {
  // Solo texto
  outputData.t = 't'; // Para el Switch
}

// Agregar datos del contacto
const contactData = $('Merge5').item.json;
if (contactData) {
  outputData.id = contactData.id;
}

// Agregar número del destinatario
const remoteJid = $('Webhook1').item.json.body.data.key.remoteJid;
outputData.numer = remoteJid ? remoteJid.replace('@s.whatsapp.net', '') : '';

return [{ json: outputData }];
```

**Propósito:** Prepara los datos en el formato que espera el nodo "Switch" para enviar según el tipo de media.

---

### **4. Modificar Nodo "Switch" (Agregar reglas para audio y documento)**

**Ubicación:** Después de "Preparar Auto Response Media"

**Reglas actuales:**
1. `text` → cuando `t === 't'`
2. `imagen` → cuando `url === 'url'`
3. `video` → cuando `video === 'video'`
4. `doc` → cuando `doc === 'doc'`

**AGREGAR 2 nuevas reglas:**

**Regla 5: Audio**
- **Condición:**
  - `leftValue`: `={{ $json.audio }}`
  - `operator`: `equals`
  - `rightValue`: `audio`
- **Output Key:** `audio`

**Regla 6: Documento** (ya existe, solo verificar)
- **Condición:**
  - `leftValue`: `={{ $json.doc }}`
  - `operator`: `equals`
  - `rightValue`: `doc`
- **Output Key:** `doc`

---

### **5. NUEVOS Nodos: Enviar Audio y Documento (Crear 2 nodos nuevos)**

**Ubicación:** Después del nodo "Enviar Video"

#### **Nodo 1: "Enviar Audio Auto Response"**

**Tipo:** `Evolution API`

**Configuración:**
- **Resource:** `messages-api`
- **Operation:** `send-audio`
- **Instance Name:** `={{ $('Set Fields1').item.json.instance.name }}`
- **Remote Jid:** `={{ ( $node["Webhook1"].json["body"]["data"]["key"]["remoteJid"].includes("@lid") ? $node["Webhook1"].json["body"]["data"]["key"]["remoteJidAlt"] : $node["Webhook1"].json["body"]["data"]["key"]["remoteJid"] ).replace("@s.whatsapp.net", "") }}`
- **Media:** `={{ $('Preparar Auto Response Media').item.json.urlAudio }}`
- **Options:** (vacío)

**Conexión:**
- **Input:** "Switch" (salida `audio`)
- **Output:** "No Operation, do nothing"

---

#### **Nodo 2: "Enviar Documento Auto Response"**

**Tipo:** `Evolution API`

**Configuración:**
- **Resource:** `messages-api`
- **Operation:** `send-document`
- **Instance Name:** `={{ $('Set Fields1').item.json.instance.name }}`
- **Remote Jid:** `={{ ( $node["Webhook1"].json["body"]["data"]["key"]["remoteJid"].includes("@lid") ? $node["Webhook1"].json["body"]["data"]["key"]["remoteJidAlt"] : $node["Webhook1"].json["body"]["data"]["key"]["remoteJid"] ).replace("@s.whatsapp.net", "") }}`
- **Media:** `={{ $('Preparar Auto Response Media').item.json.urlDocument }}`
- **Caption:** `={{ $('Preparar Auto Response Media').item.json['mensaje texto '] }}`
- **Options:** (vacío)

**Conexión:**
- **Input:** "Switch" (salida `doc`)
- **Output:** "No Operation, do nothing"

---

### **6. Modificar Nodos de Envío Existentes (Actualizar referencias)**

**Nodos a modificar:**
- "Enviar texto"
- "Enviar imagem"
- "Enviar Video"

**Cambio en cada uno:**

**ANTES:**
```
messageText: "={{ $('Definir destinatario1').item.json['mensaje texto '] }}"
media: "={{ $('Definir destinatario1').item.json.url_imagen }}"
```

**DESPUÉS:**
```
messageText: "={{ $('Preparar Auto Response Media').item.json['mensaje texto '] || $('Definir destinatario1').item.json['mensaje texto '] }}"
media: "={{ $('Preparar Auto Response Media').item.json.url_imagen || $('Definir destinatario1').item.json.url_imagen }}"
```

**Aplicar a:**
- ✅ "Enviar texto" → `messageText`
- ✅ "Enviar imagem" → `media` y `caption`
- ✅ "Enviar Video" → `media` y `caption`

---

### **7. Actualizar Conexiones del Switch**

**Conexiones del nodo "Switch":**

1. **Output `text`** → "Enviar texto"
2. **Output `imagen`** → "Enviar imagem"
3. **Output `video`** → "Enviar Video"
4. **Output `audio`** → "Enviar Audio Auto Response" (NUEVO)
5. **Output `doc`** → "Enviar Documento Auto Response" (NUEVO)

---

## 📊 Flujo Completo

```
Buscar Auto Responses
  ↓
Verificar Match Auto Response
  ↓
IF: ¿Hay Auto Response?
  ├─ TRUE → Preparar Auto Response Media → Switch
  │                                    ├─ text → Enviar texto
  │                                    ├─ imagen → Enviar imagem
  │                                    ├─ video → Enviar Video
  │                                    ├─ audio → Enviar Audio Auto Response
  │                                    └─ doc → Enviar Documento Auto Response
  └─ FALSE → Obtener Prompt y Configuración1 (IA normal)
```

---

## ✅ Checklist de Implementación

- [ ] Verificar nodo "Buscar Auto Responses" tiene `alwaysOutputData: true`
- [ ] Actualizar código de "Verificar Match Auto Response" con regex y media
- [ ] Crear nodo "Preparar Auto Response Media" entre IF y Switch
- [ ] Agregar reglas `audio` y `doc` al nodo "Switch"
- [ ] Crear nodo "Enviar Audio Auto Response"
- [ ] Crear nodo "Enviar Documento Auto Response"
- [ ] Actualizar referencias en "Enviar texto", "Enviar imagem", "Enviar Video"
- [ ] Conectar salidas del Switch a los nodos correspondientes
- [ ] Conectar nodos de audio y documento a "No Operation, do nothing"

---

## 🔍 Verificación

Después de hacer los cambios, verifica:

1. **Conexiones:** Todos los nodos deben estar conectados correctamente
2. **Referencias:** Los nodos deben poder acceder a `$('Preparar Auto Response Media')`
3. **Switch:** Debe tener 5 salidas (text, imagen, video, audio, doc)
4. **Prueba:** Crear una auto-response con archivo y probar el envío

---

## 📝 Notas Importantes

- El nodo "Preparar Auto Response Media" solo se ejecuta cuando hay una auto-response activa
- Si no hay auto-response, el flujo continúa normalmente a la IA
- El regex es opcional: si no se configura, usa el `media_type` directamente
- Los archivos se suben a Bunny.net CDN y se guarda la URL en `media_url`

