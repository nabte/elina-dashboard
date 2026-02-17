# 🤖 Guía: Modificar Prompt de IA para Sistema de Citas

Esta guía explica cómo modificar el prompt del sistema de IA para incluir contexto de disponibilidad cuando se detecta intención de agendar citas.

---

## 🎯 Objetivo

Cuando la IA detecta que un cliente quiere agendar una cita, debe:
1. Consultar horarios disponibles
2. Ofrecer opciones de forma natural
3. Confirmar el horario cuando el cliente elija uno
4. Crear la cita automáticamente

---

## 📝 Modificación del System Prompt

### **Contexto Base para IA**

Cuando se detecta intención de cita, agrega este contexto al system prompt:

```
Eres un asistente de atención al cliente experto en agendar citas.

CONTEXTO DE CITAS:
{availability_context}

INSTRUCCIONES:
1. Si el cliente pregunta por disponibilidad, ofrece los horarios disponibles de forma natural y amigable.
2. Cuando el cliente confirme un horario específico (ej: "el miércoles a las 5pm"), confirma la cita y menciona que será agendada.
3. Si no hay horarios disponibles, sugiere que el cliente pregunte por otros días.
4. Sé claro y conciso al ofrecer opciones.

FORMATO DE RESPUESTA:
- Ofrece los horarios de forma clara y numerada
- Pregunta cuál horario prefiere el cliente
- Confirma cuando el cliente elija un horario
```

---

## 🔧 Implementación en n8n

### **Opción 1: Modificar System Prompt Dinámicamente**

En el nodo "AI Agent1" o donde generas la respuesta de la IA:

```javascript
// Obtener contexto de disponibilidad (si existe)
const availabilityData = $('Formatear Disponibilidad')?.item?.json;

let systemPrompt = 'Eres un asistente de atención al cliente...';

if (availabilityData && availabilityData.has_slots) {
  systemPrompt += `\n\nCONTEXTO DE CITAS:\n${availabilityData.availability_context}\n\n`;
  systemPrompt += `INSTRUCCIONES ESPECIALES:\n`;
  systemPrompt += `- El cliente quiere agendar una cita.\n`;
  systemPrompt += `- Ofrece los horarios disponibles de forma natural.\n`;
  systemPrompt += `- Cuando el cliente confirme un horario, confirma la cita.\n`;
  systemPrompt += `- Sé amigable y profesional.\n`;
} else if (availabilityData && !availabilityData.has_slots) {
  systemPrompt += `\n\nCONTEXTO DE CITAS:\n${availabilityData.availability_context}\n\n`;
  systemPrompt += `- Informa al cliente que no hay horarios disponibles para hoy.\n`;
  systemPrompt += `- Sugiere que pregunte por otros días.\n`;
}

// Continuar con la llamada a la IA
```

---

## 🔧 Implementación en Edge Functions

Si usas una Edge Function para generar respuestas de IA, puedes modificar el prompt allí:

```typescript
// En tu Edge Function de IA
interface AIRequest {
  message: string;
  context?: {
    has_appointment_intent?: boolean;
    available_slots?: Array<{ start: string; end: string }>;
    date?: string;
  };
}

async function generateAIResponse(request: AIRequest) {
  let systemPrompt = 'Eres un asistente de atención al cliente...';

  if (request.context?.has_appointment_intent && request.context.available_slots) {
    const slotsText = request.context.available_slots
      .map((slot, i) => `${i + 1}. ${slot.start} - ${slot.end}`)
      .join('\n');

    systemPrompt += `\n\nCONTEXTO DE CITAS:\n`;
    systemPrompt += `El cliente quiere agendar una cita. Horarios disponibles para ${request.context.date}:\n${slotsText}\n\n`;
    systemPrompt += `INSTRUCCIONES:\n`;
    systemPrompt += `- Ofrece estos horarios al cliente de forma natural.\n`;
    systemPrompt += `- Pregunta cuál horario prefiere.\n`;
    systemPrompt += `- Cuando el cliente confirme, confirma la cita.\n`;
  }

  // Llamar a OpenAI con el systemPrompt modificado
  // ...
}
```

---

## 📋 Ejemplos de Respuestas Esperadas

### **Cuando hay horarios disponibles:**

**Cliente:** "Quiero agendar una cita"

**IA:** "¡Por supuesto! Tengo estos horarios disponibles para hoy:

1. 10:00 - 11:00
2. 14:00 - 15:00
3. 16:00 - 17:00

¿Cuál te funciona mejor?"

---

### **Cuando el cliente confirma:**

**Cliente:** "El de las 2pm está bien"

**IA:** "Perfecto, he agendado tu cita para hoy a las 2:00 PM. Te enviaré un recordatorio antes de la cita. ¡Nos vemos pronto!"

*(En este punto, se debe crear la cita automáticamente)*

---

### **Cuando no hay horarios:**

**Cliente:** "¿Tienes disponibilidad?"

**IA:** "Por el momento no tengo horarios disponibles para hoy. ¿Te funciona mejor mañana o algún otro día de la semana? Puedo revisar la disponibilidad para el día que prefieras."

---

## 🔄 Flujo Completo

```
1. Cliente: "Quiero una cita"
   ↓
2. Sistema detecta intención de cita
   ↓
3. Sistema obtiene slots disponibles
   ↓
4. IA recibe contexto de disponibilidad
   ↓
5. IA ofrece horarios al cliente
   ↓
6. Cliente: "El miércoles a las 5pm"
   ↓
7. IA confirma la cita
   ↓
8. Sistema crea la cita automáticamente
   ↓
9. IA confirma al cliente que la cita está agendada
```

---

## ⚠️ Consideraciones

1. **Detección de Confirmación:** Puedes agregar lógica adicional para detectar cuando el cliente confirma un horario específico y crear la cita automáticamente.

2. **Múltiples Fechas:** Si obtienes slots de múltiples días, la IA puede ofrecer opciones más amplias.

3. **Validación:** Asegúrate de validar que el horario confirmado por el cliente esté realmente disponible antes de crear la cita.

4. **Manejo de Errores:** Si falla la creación de la cita, la IA debe informar al cliente y ofrecer alternativas.

---

## 📚 Referencias

- Guía de Integración n8n: `n8n/GUIA_INTEGRACION_SISTEMA_CITAS.md`
- Edge Function: `create-appointment`
- Edge Function: `get-available-slots`

