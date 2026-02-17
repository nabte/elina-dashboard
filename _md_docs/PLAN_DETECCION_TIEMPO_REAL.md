# 🚨 Plan: Detección Crítica en Tiempo Real

## 📋 Resumen

Sistema que detecta intenciones críticas en mensajes entrantes **en tiempo real** y pausa automáticamente la conversación con IA cuando se requiere atención humana.

---

## ✅ Componentes Implementados

### 1. **Base de Datos (SQL)**
**Archivo:** `supabase/schema/20251125_realtime_critical_detection.sql`

**Tablas creadas:**
- `conversation_states` - Gestiona estado de pausa/reanudación
- `critical_detections` - Registra todas las detecciones críticas
- `critical_keywords` - Palabras clave personalizadas por usuario

**Funciones SQL:**
- `detect_critical_intent()` - Detecta intenciones críticas
- `pause_conversation()` - Pausa una conversación
- `resume_conversation()` - Reanuda una conversación

**Trigger:**
- `trg_chat_history_critical_detection` - Se dispara automáticamente cuando se inserta un mensaje nuevo

### 2. **Edge Function**
**Archivo:** `supabase/functions/detect-critical-intent/index.ts`

**Qué hace:**
- Detecta intenciones críticas en mensajes
- Pausa conversaciones automáticamente
- Registra detecciones en la base de datos

**Endpoint:** `POST /functions/v1/detect-critical-intent`

### 3. **Workflow n8n**
**Archivo:** `n8n/realtime-critical-detection-flow.json`

**Qué hace:**
- Recibe mensajes nuevos via webhook
- Llama a la Edge Function para detección
- Envía notificaciones inmediatas si es crítico

**Webhook:** `POST /webhook/realtime-critical-detection`

---

## 🔄 Flujo de Funcionamiento

### Escenario 1: Detección Automática (Trigger)

1. **Usuario envía mensaje** → Se inserta en `chat_history`
2. **Trigger se dispara** → `trg_chat_history_critical_detection`
3. **Función SQL detecta** → `detect_critical_intent()`
4. **Si es crítico:**
   - Registra en `critical_detections`
   - Pausa conversación en `conversation_states`
   - **Nota:** La notificación se puede enviar desde n8n o Edge Function

### Escenario 2: Detección via n8n (Webhook)

1. **Sistema externo envía mensaje** → Webhook n8n
2. **n8n llama Edge Function** → `detect-critical-intent`
3. **Edge Function detecta** → Usa función SQL
4. **Si es crítico:**
   - Pausa conversación
   - n8n envía notificación inmediata

---

## 🎯 Tipos de Detección

### Patrones Predefinidos:

1. **Solicitud de Humano** (`human_request`)
   - Palabras: "quiero hablar con un humano", "necesito un agente", "no bot"
   - Confianza: 0.9

2. **Intención de Compra** (`purchase_intent`)
   - Palabras: "quiero comprar", "me interesa", "deseo adquirir"
   - Confianza: 0.85

3. **Atención Urgente** (`urgent_attention`)
   - Palabras: "urgente", "inmediato", "molesto", "problema", "queja"
   - Confianza: 0.75

### Palabras Clave Personalizadas:

- Los usuarios pueden agregar sus propias palabras clave
- Se almacenan en `critical_keywords`
- Pueden ser case-sensitive o no

---

## 📝 Instrucciones de Ejecución

### Paso 1: Ejecutar SQL en Supabase

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia y pega el contenido de `supabase/schema/20251125_realtime_critical_detection.sql`
3. Ejecuta (RUN)

### Paso 2: Desplegar Edge Function

```bash
# Desde la raíz del proyecto
supabase functions deploy detect-critical-intent
```

O manualmente:
1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Crea nueva función: `detect-critical-intent`
3. Copia el contenido de `supabase/functions/detect-critical-intent/index.ts`

### Paso 3: Importar Workflow n8n

1. Ve a tu instancia de n8n
2. **Workflows** → **Import from File**
3. Selecciona `n8n/realtime-critical-detection-flow.json`
4. Configura las variables de entorno:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_KEY` (anon key)

### Paso 4: Configurar Webhook en tu Sistema

Cuando recibas un mensaje nuevo, llama al webhook:

```javascript
// Ejemplo desde tu backend
await fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/realtime-critical-detection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contact_id: 123,
    user_id: 'uuid-del-usuario',
    content: 'Mensaje del cliente',
    message_id: 456 // opcional
  })
});
```

---

## 🔧 Configuración Adicional

### Agregar Palabras Clave Personalizadas

```sql
INSERT INTO public.critical_keywords (user_id, keyword, detection_type, is_active)
VALUES 
  ('uuid-del-usuario', 'cancelar', 'urgent_attention', true),
  ('uuid-del-usuario', 'reembolso', 'urgent_attention', true);
```

### Ver Conversaciones Pausadas

```sql
SELECT 
  cs.*,
  c.full_name,
  c.phone_number
FROM public.conversation_states cs
JOIN public.contacts c ON c.id = cs.contact_id
WHERE cs.is_paused = true
ORDER BY cs.paused_at DESC;
```

### Reanudar Conversación Manualmente

```sql
SELECT public.resume_conversation(
  p_contact_id := 123,
  p_resumed_by := 'uuid-del-usuario'
);
```

---

## 🎨 Integración con Frontend

### Mostrar Estado de Pausa

En `chats.js`, agregar:

```javascript
async function checkConversationState(contactId) {
  const { data: state } = await window.auth.sb
    .from('conversation_states')
    .select('*')
    .eq('contact_id', contactId)
    .single();
  
  if (state?.is_paused) {
    // Mostrar banner de "Conversación pausada"
    showPausedBanner(state);
  }
}
```

### Suscripción en Tiempo Real

```javascript
// Suscribirse a cambios en conversation_states
window.auth.sb
  .channel('conversation-states')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'conversation_states' },
    (payload) => {
      if (payload.new.contact_id === currentContactId) {
        updatePausedState(payload.new.is_paused);
      }
    }
  )
  .subscribe();
```

---

## ⚠️ Notas Importantes

1. **El trigger se ejecuta automáticamente** cuando se inserta un mensaje en `chat_history`
2. **Las notificaciones** se pueden enviar desde:
   - El trigger (usando `pg_net` o llamando a n8n)
   - La Edge Function (después de pausar)
   - n8n workflow (recomendado para notificaciones complejas)
3. **Performance:** El trigger es rápido, pero si tienes muchos mensajes, considera usar n8n en lugar del trigger directo
4. **Etiquetas IA sensibles:** Si una etiqueta tiene `notify_on_assign = true`, también se puede pausar automáticamente

---

## 🚀 Próximos Pasos

1. ✅ Ejecutar SQL
2. ✅ Desplegar Edge Function
3. ✅ Importar workflow n8n
4. ⏳ Actualizar frontend para mostrar estado de pausa
5. ⏳ Agregar botón "Reanudar conversación"
6. ⏳ Integrar con sistema de notificaciones existente

---

**¡Listo para implementar!** 🎉

