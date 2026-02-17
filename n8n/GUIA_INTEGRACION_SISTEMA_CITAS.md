# 📋 Guía de Integración: Sistema de Citas y Calendario

Esta guía explica cómo integrar el **Sistema de Citas y Calendario** en el workflow principal "Elina V4" de n8n.

---

## 🎯 Objetivo

Integrar la detección automática de intenciones de agendar citas y ofrecer horarios disponibles a los clientes cuando lo soliciten.

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
[DETECCIÓN CRÍTICA]
  ├─ Si es crítico → Pausar conversación → Enviar notificación → FIN
  └─ Si no es crítico → Continuar
  ↓
Generar Respuesta con IA Agent
  ↓
Enviar Respuesta → Guardar en chat_history
```

### **Flujo con Sistema de Citas:**

```
Webhook → Verificar Suscripción → Buscar/Crear Contacto
  ↓
Procesar Mensaje (texto/audio/imagen)
  ↓
Obtener Contexto RAG
  ↓
[DETECCIÓN CRÍTICA]
  ├─ Si es crítico → Pausar conversación → Enviar notificación → FIN
  └─ Si no es crítico → Continuar
  ↓
[DETECCIÓN DE INTENCIÓN DE CITA] ← NUEVO NODO
  ├─ Si tiene intención → Obtener Slots Disponibles → Generar Respuesta con Opciones
  └─ Si no tiene intención → Continuar normalmente
  ↓
Generar Respuesta con IA Agent (con contexto de disponibilidad si aplica)
  ↓
Enviar Respuesta → Guardar en chat_history
```

---

## 🔧 Paso 1: Agregar Nodo de Detección de Intención de Cita

### **Ubicación:** 
Después del nodo **"Detección Crítica"**, antes de **"AI Agent1"**

### **Nodo 1: HTTP Request - Detectar Intención de Cita**

**Tipo:** `HTTP Request`

**Configuración:**
- **Method:** `POST`
- **URL:** `={{ $env.SUPABASE_URL }}/functions/v1/detect-appointment-intent`
- **Authentication:** `Generic Credential Type` → `httpHeaderAuth`
- **Headers:**
  - `apikey`: `={{ $env.SUPABASE_SERVICE_KEY }}`
  - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "contact_id": {{ $('Get Contact ID').item.json.id }},
  "user_id": "{{ $env.USER_ID }}",
  "message_content": "{{ $('Procesar Mensaje').item.json.content }}",
  "message_id": {{ $('Procesar Mensaje').item.json.id }}
}
```

**Nombre del nodo:** `Detectar Intención de Cita`

---

## 🔧 Paso 2: Agregar Nodo Condicional

### **Nodo 2: IF - ¿Tiene Intención de Cita?**

**Tipo:** `IF`

**Configuración:**
- **Condition:** `{{ $json.has_intent === true }}`
- **True Path:** Continuar con obtención de slots
- **False Path:** Ir directamente a "AI Agent1"

**Nombre del nodo:** `¿Tiene Intención de Cita?`

---

## 🔧 Paso 3: Obtener Horarios Disponibles

### **Nodo 3: HTTP Request - Obtener Slots Disponibles**

**Tipo:** `HTTP Request`

**Configuración:**
- **Method:** `POST`
- **URL:** `={{ $env.SUPABASE_URL }}/functions/v1/get-available-slots`
- **Authentication:** `Generic Credential Type` → `httpHeaderAuth`
- **Headers:**
  - `apikey`: `={{ $env.SUPABASE_SERVICE_KEY }}`
  - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "user_id": "{{ $env.USER_ID }}",
  "date": "{{ $now.toFormat('yyyy-MM-dd') }}",
  "duration_minutes": null
}
```

**Nota:** Puedes obtener slots para los próximos 7 días iterando sobre fechas.

**Nombre del nodo:** `Obtener Slots Disponibles`

---

## 🔧 Paso 4: Formatear Contexto de Disponibilidad

### **Nodo 4: Code - Formatear Disponibilidad para IA**

**Tipo:** `Code`

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
      has_slots: false
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

**Nombre del nodo:** `Formatear Disponibilidad`

---

## 🔧 Paso 5: Modificar Prompt de IA

### **Modificar Nodo "AI Agent1"**

En el nodo donde generas la respuesta de la IA, modifica el **System Prompt** o **Context** para incluir la disponibilidad cuando se detecta intención de cita:

**Ejemplo de modificación:**

```javascript
// En el nodo AI Agent1, antes de llamar a la IA:
const availabilityContext = $('Formatear Disponibilidad')?.item?.json?.availability_context;

let systemPrompt = 'Eres un asistente de atención al cliente...';

if (availabilityContext) {
  systemPrompt += `\n\nCONTEXTO DE CITAS:\n${availabilityContext}\n\nCuando el cliente confirme un horario, usa la función create-appointment para agendar la cita.`;
}

// Continuar con la llamada a la IA usando systemPrompt
```

---

## 🔧 Paso 6: Crear Cita cuando el Cliente Confirma

### **Nodo 6: HTTP Request - Crear Cita (Opcional - cuando el cliente confirma)**

**Tipo:** `HTTP Request`

**Configuración:**
- **Method:** `POST`
- **URL:** `={{ $env.SUPABASE_URL }}/functions/v1/create-appointment`
- **Authentication:** `Generic Credential Type` → `httpHeaderAuth`
- **Headers:**
  - `apikey`: `={{ $env.SUPABASE_SERVICE_KEY }}`
  - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "contact_id": {{ $('Get Contact ID').item.json.id }},
  "start_time": "{{ $json.selected_slot.start_datetime }}",
  "end_time": "{{ $json.selected_slot.end_datetime }}",
  "appointment_type_id": null,
  "notes": "Cita agendada automáticamente por IA",
  "summary": "Cita con {{ $('Get Contact ID').item.json.name }}"
}
```

**Nota:** Este nodo se ejecuta cuando la IA detecta que el cliente confirmó un horario específico. Puedes usar detección de intención adicional o confiar en que la IA lo maneje en su respuesta.

---

## 📝 Notas Importantes

1. **Verificación de Sistema Habilitado:** La función `detect-appointment-intent` ya verifica si el usuario tiene el sistema de citas habilitado. Si no está habilitado, retornará `has_intent: false`.

2. **Múltiples Fechas:** Puedes modificar el nodo "Obtener Slots Disponibles" para obtener slots de múltiples días (próximos 7 días) y ofrecer más opciones al cliente.

3. **Confirmación de Cita:** La IA puede detectar cuando el cliente confirma un horario específico. Puedes agregar lógica adicional para detectar confirmaciones y crear la cita automáticamente.

4. **Manejo de Errores:** Asegúrate de manejar errores en cada nodo. Si falla la obtención de slots, continúa con el flujo normal sin ofrecer citas.

---

## ✅ Checklist de Integración

- [ ] Agregar nodo "Detectar Intención de Cita" después de detección crítica
- [ ] Agregar nodo IF para verificar si tiene intención
- [ ] Agregar nodo "Obtener Slots Disponibles"
- [ ] Agregar nodo "Formatear Disponibilidad"
- [ ] Modificar prompt de IA para incluir contexto de disponibilidad
- [ ] (Opcional) Agregar nodo para crear cita cuando se confirma
- [ ] Probar flujo completo con mensajes de prueba
- [ ] Verificar que funciona cuando el sistema de citas está deshabilitado

---

## 🧪 Mensajes de Prueba

Para probar el sistema, envía estos mensajes:

1. **"Quiero agendar una cita"** - Debe detectar intención
2. **"¿Tienes disponibilidad?"** - Debe detectar intención
3. **"Necesito una consulta"** - Debe detectar intención
4. **"Hola, ¿cómo están?"** - No debe detectar intención

---

## 📚 Referencias

- Edge Function: `detect-appointment-intent`
- Edge Function: `get-available-slots`
- Edge Function: `create-appointment`
- Función SQL: `detect_appointment_intent()`
- Función SQL: `get_available_slots()`

