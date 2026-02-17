# 📋 Guía Paso a Paso: Integrar Sistema de Citas en Elina V4

Esta guía te muestra **exactamente** cómo modificar el workflow "Elina V4" en n8n para integrar el sistema de citas.

---

## 🎯 Resumen

Vas a agregar **3 nodos nuevos** después de la detección crítica:
1. **Detectar Intención de Cita** - Detecta si el cliente quiere agendar
2. **Obtener Slots Disponibles** - Busca horarios libres
3. **Formatear para IA** - Prepara el contexto para que la IA ofrezca opciones

---

## 📍 Paso 1: Abrir el Workflow Elina V4

1. Abre n8n
2. Busca el workflow llamado **"Elina V4"**
3. Ábrelo para editarlo

---

## 📍 Paso 2: Encontrar el Nodo de Detección Crítica

Busca el nodo que se llama algo como:
- **"Detectar Intención Crítica"** o
- **"Detección Crítica"** o
- **"detect-critical-intent"**

Este nodo debe estar **después** de:
- Obtener Contexto RAG
- Formatear Contexto

Y **antes** de:
- AI Agent1
- Generar Respuesta

---

## 📍 Paso 3: Agregar Nodo de Detección de Citas

### 3.1 Crear el Nodo

1. Haz clic derecho **después** del nodo de Detección Crítica
2. Selecciona **"Add Node"** o **"Agregar Nodo"**
3. Busca **"HTTP Request"**
4. Selecciona **"HTTP Request"**

### 3.2 Configurar el Nodo

**Nombre del nodo:** `Detectar Intención de Cita`

**Configuración:**

1. **Method:** Selecciona `POST`

2. **URL:** 
   ```
   {{ $env.SUPABASE_URL }}/functions/v1/detect-appointment-intent
   ```
   O si no tienes variable de entorno:
   ```
   https://TU_PROJECT_ID.supabase.co/functions/v1/detect-appointment-intent
   ```
   (Reemplaza `TU_PROJECT_ID` con tu project ID de Supabase)

3. **Authentication:** 
   - Selecciona `Generic Credential Type`
   - Tipo: `httpHeaderAuth`
   - O agrega manualmente los headers:

4. **Headers:**
   - `apikey`: `{{ $env.SUPABASE_SERVICE_KEY }}`
   - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
   - `Content-Type`: `application/json`

5. **Body (JSON):**
   ```json
   {
     "contact_id": {{ $('Get Contact ID').item.json.id }},
     "user_id": "{{ $env.USER_ID }}",
     "message_content": "{{ $('Procesar Mensaje').item.json.content }}",
     "message_id": {{ $('Procesar Mensaje').item.json.id }}
   }
   ```
   
   **Nota:** Ajusta los nombres de los nodos según tu workflow:
   - `Get Contact ID` → El nodo que obtiene el contact_id
   - `Procesar Mensaje` → El nodo que procesa el mensaje

6. Haz clic en **"Save"** o **"Guardar"**

### 3.3 Conectar el Nodo

1. Conecta la **salida** del nodo "Detección Crítica" → **entrada** de "Detectar Intención de Cita"
2. Conecta la **salida** de "Detectar Intención de Cita" → **entrada** del siguiente paso

---

## 📍 Paso 4: Agregar Nodo Condicional (IF)

### 4.1 Crear el Nodo

1. Haz clic derecho **después** de "Detectar Intención de Cita"
2. Selecciona **"Add Node"**
3. Busca **"IF"**
4. Selecciona **"IF"**

### 4.2 Configurar el Nodo

**Nombre del nodo:** `¿Tiene Intención de Cita?`

**Configuración:**

1. **Condition:** 
   ```
   {{ $json.has_intent === true }}
   ```

2. **True Path:** Continuará con obtener slots
3. **False Path:** Irá directamente a AI Agent1

### 4.3 Conectar los Nodos

1. **True Path (arriba):** Conecta a un nuevo nodo "Obtener Slots" (lo crearemos después)
2. **False Path (abajo):** Conecta directamente a **"AI Agent1"** (el nodo que genera la respuesta)

---

## 📍 Paso 5: Agregar Nodo para Obtener Slots

### 5.1 Crear el Nodo

1. Haz clic derecho en la conexión **True Path** del nodo IF
2. Selecciona **"Add Node"**
3. Busca **"HTTP Request"**
4. Selecciona **"HTTP Request"**

### 5.2 Configurar el Nodo

**Nombre del nodo:** `Obtener Slots Disponibles`

**Configuración:**

1. **Method:** `POST`

2. **URL:**
   ```
   {{ $env.SUPABASE_URL }}/functions/v1/get-available-slots
   ```

3. **Headers:**
   - `apikey`: `{{ $env.SUPABASE_SERVICE_KEY }}`
   - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
   - `Content-Type`: `application/json`

4. **Body (JSON):**
   ```json
   {
     "user_id": "{{ $env.USER_ID }}",
     "date": "{{ $now.toFormat('yyyy-MM-dd') }}",
     "duration_minutes": null
   }
   ```

5. Haz clic en **"Save"**

### 5.3 Conectar el Nodo

Conecta la salida de este nodo al siguiente paso (Formatear Disponibilidad)

---

## 📍 Paso 6: Agregar Nodo para Formatear Disponibilidad

### 6.1 Crear el Nodo

1. Haz clic derecho después de "Obtener Slots Disponibles"
2. Selecciona **"Add Node"**
3. Busca **"Code"**
4. Selecciona **"Code"**

### 6.2 Configurar el Nodo

**Nombre del nodo:** `Formatear Disponibilidad`

**Lenguaje:** JavaScript

**Código:**
```javascript
const slots = $input.item.json.available_slots || [];
const date = $input.item.json.date || '';
const timezone = $input.item.json.timezone || 'America/Mexico_City';

if (slots.length === 0) {
  return [{
    json: {
      availability_context: 'No hay horarios disponibles para hoy. Puedes sugerir que el cliente pregunte por otros días.',
      has_slots: false,
      slots: [],
      date: date
    }
  }];
}

// Formatear slots para el contexto
const slotsText = slots.map((slot, index) => {
  return `${index + 1}. ${slot.start} - ${slot.end}`;
}).join('\n');

const context = `El cliente quiere agendar una cita. Horarios disponibles para ${date}:\n${slotsText}\n\nOfrece estos horarios al cliente de forma natural y pregunta cuál prefiere.`;

return [{
  json: {
    availability_context: context,
    has_slots: true,
    slots: slots,
    date: date
  }
}];
```

5. Haz clic en **"Save"**

---

## 📍 Paso 7: Modificar el Nodo AI Agent1

### 7.1 Abrir el Nodo AI Agent1

Busca el nodo que genera la respuesta de la IA (puede llamarse "AI Agent1", "OpenAI", "Generar Respuesta", etc.)

### 7.2 Modificar el System Prompt

En el campo **"System Prompt"** o **"System Message"**, agrega al final:

```
{{ $('Formatear Disponibilidad')?.item?.json?.availability_context || '' }}
```

O si prefieres hacerlo con un nodo Code antes:

1. Agrega un nodo **Code** antes de AI Agent1
2. En el código, combina el prompt original con el contexto de disponibilidad:

```javascript
const availabilityData = $('Formatear Disponibilidad')?.item?.json;
const originalPrompt = 'Eres un asistente de atención al cliente...'; // Tu prompt original

let finalPrompt = originalPrompt;

if (availabilityData && availabilityData.has_slots) {
  finalPrompt += `\n\nCONTEXTO DE CITAS:\n${availabilityData.availability_context}\n\n`;
  finalPrompt += `INSTRUCCIONES:\n`;
  finalPrompt += `- El cliente quiere agendar una cita.\n`;
  finalPrompt += `- Ofrece los horarios disponibles de forma natural.\n`;
  finalPrompt += `- Cuando el cliente confirme un horario, confirma la cita.\n`;
}

return [{
  json: {
    ...$input.item.json,
    enhanced_prompt: finalPrompt
  }
}];
```

3. Usa `{{ $json.enhanced_prompt }}` en el nodo AI Agent1

---

## 📍 Paso 8: Conectar Todo

Asegúrate de que el flujo quede así:

```
[Detección Crítica]
  ↓ (si no es crítico)
[Detectar Intención de Cita]
  ↓
[¿Tiene Intención de Cita?]
  ├─ True → [Obtener Slots] → [Formatear Disponibilidad] → [AI Agent1]
  └─ False → [AI Agent1]
```

---

## ✅ Paso 9: Probar el Workflow

1. Haz clic en **"Save"** para guardar el workflow
2. Activa el workflow si no está activo
3. Envía un mensaje de prueba: **"Quiero agendar una cita"**
4. Verifica que:
   - Se detecta la intención de cita
   - Se obtienen los slots disponibles
   - La IA ofrece los horarios

---

## 🐛 Solución de Problemas

### Error: "Cannot read property 'json' of undefined"

**Solución:** Verifica que los nombres de los nodos en las expresiones coincidan exactamente con los nombres reales.

### No se detecta la intención de cita

**Solución:** 
1. Verifica que el sistema de citas esté activado en Configuración
2. Revisa los logs del nodo "Detectar Intención de Cita"
3. Verifica que el `user_id` sea correcto

### No se obtienen slots

**Solución:**
1. Verifica que tengas horarios configurados en Configuración → Sistema de Citas
2. Revisa que la fecha sea válida
3. Verifica los logs del nodo "Obtener Slots Disponibles"

---

## 📚 Referencias

- Edge Function: `detect-appointment-intent`
- Edge Function: `get-available-slots`
- Guía de Integración: `GUIA_INTEGRACION_SISTEMA_CITAS.md`
- Guía de Prompt: `../GUIA_PROMPT_IA_CITAS.md`

---

## 💡 Tips

1. **Prueba primero con mensajes simples:** "Quiero una cita", "¿Tienes disponibilidad?"
2. **Revisa los logs:** Cada nodo tiene logs que te ayudan a debuggear
3. **Guarda versiones:** Antes de modificar, exporta el workflow como backup
4. **Itera gradualmente:** Agrega un nodo a la vez y prueba antes de continuar

