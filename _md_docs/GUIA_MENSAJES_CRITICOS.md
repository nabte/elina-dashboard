# 🚨 Guía: Sistema de Detección de Mensajes Críticos

## 📋 Resumen

El sistema detecta automáticamente cuando un cliente quiere hablar con un humano o requiere atención especial, y **pausa automáticamente** la conversación con la IA.

---

## 🔄 ¿Cómo Funciona?

### 1. **Detección Automática (n8n)**

Cuando llega un mensaje nuevo, el workflow de n8n (`Elina V4`) hace lo siguiente:

```
Mensaje recibido → Detectar Intención Crítica → ¿Es crítico? → Acciones
```

**Nodo clave:** `Detectar Intención Crítica` (línea 2137 del JSON)
- Llama a: `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/detect-critical-intent`
- Envía: `contact_id`, `user_id`, `message_content`

### 2. **Tipos de Intenciones que Detecta**

El sistema detecta estos patrones:

#### ✅ **Solicitud de Humano** (`human_request`)
- **Patrones:** "quiero hablar con un humano", "dame el contacto", "necesito un agente", "no quiero bot"
- **Confianza:** 90%
- **Ejemplos:**
  - "Quiero hablar con una persona"
  - "Dame el contacto con alguien"
  - "No quiero hablar con un bot"
  - "Necesito un asesor"

#### ✅ **Intención de Compra** (`purchase_intent`)
- **Patrones:** "quiero comprar", "me interesa adquirir", "deseo contratar"
- **Confianza:** 85%

#### ✅ **Atención Urgente** (`urgent_attention`)
- **Patrones:** "urgente", "inmediato", "molesto", "problema", "queja"
- **Confianza:** 75%

#### ✅ **Palabras Clave Personalizadas** (`custom_keyword`)
- Configurables por usuario en la tabla `critical_keywords`

### 3. **Qué Pasa Cuando se Detecta Algo Crítico**

Cuando `is_critical = true`, el workflow hace:

1. **Pausa la conversación** automáticamente
   - Inserta/actualiza en `conversation_states` con `is_paused = true`
   - Guarda el `pause_reason` (tipo de detección)

2. **Registra la detección**
   - Inserta en `critical_detections` con todos los detalles

3. **Envía notificación WhatsApp** al dueño del negocio
   - Mensaje con: nombre del contacto, tipo de detección, confianza, mensaje detectado

4. **Marca el contacto con "ignorar"**
   - Agrega la etiqueta "ignorar" al contacto para que la IA no responda

---

## 💻 Cómo se Maneja en la App (Frontend)

### Estado de Pausa en el Chat

El archivo `chats.js` ya tiene implementado:

1. **Verificación automática** al cargar un chat:
   ```javascript
   checkConversationState(contactId)
   ```
   - Consulta `conversation_states` para ver si está pausado

2. **Suscripción en tiempo real**:
   ```javascript
   subscribeToConversationState(contactId)
   ```
   - Escucha cambios en `conversation_states` via Supabase Realtime
   - Actualiza el banner automáticamente cuando cambia el estado

3. **Banner de pausa** (en `chats.html`):
   - Muestra: "Conversación pausada - Requiere atención humana"
   - Muestra el tipo de detección (ej: "Solicitud de atención humana")
   - Botón "Reanudar" para volver a activar la IA

4. **Deshabilitación del input**:
   - Cuando está pausado, el campo de mensaje se deshabilita
   - Placeholder: "Conversación pausada - Requiere atención humana"

### Reanudar Conversación

El usuario puede reanudar manualmente:

```javascript
resumeConversation()
```
- Llama a `resume_conversation(contact_id, user_id)`
- Actualiza `conversation_states` con `is_paused = false`
- Oculta el banner y habilita el input

---

## 🔍 Verificación del Flujo en n8n

### Nodos Importantes en el Workflow

1. **"3. RAG - Formatear Contexto"** → **"Detectar Intención Crítica"**
   - ✅ Conectado correctamente (línea 3104)

2. **"Detectar Intención Crítica"** → **"IF: ¿Es Crítico?"**
   - ✅ Conectado correctamente (línea 3386)
   - Verifica: `is_critical === true`

3. **"IF: ¿Es Crítico?"** → **"Obtener Número Notificación"** (si es crítico)
   - ✅ Conectado (línea 3397)
   - Obtiene el número de WhatsApp del dueño

4. **"Obtener Número Notificación"** → **"Enviar Notificación WhatsApp"**
   - ✅ Conectado (línea 3415)
   - Envía mensaje al dueño

5. **"Enviar Notificación WhatsApp"** → **"Preparar Labels con Ignorar"**
   - ✅ Conectado (línea 3466)
   - Agrega etiqueta "ignorar" al contacto

6. **"IF: ¿Es Crítico?"** → **"Buscar Promociones Activas"** (si NO es crítico)
   - ✅ Conectado (línea 3404)
   - Continúa el flujo normal

---

## 🛠️ Cómo Probar que Funciona

### 1. **Probar desde WhatsApp**

Envía un mensaje como:
- "Quiero hablar con un humano"
- "Dame el contacto con alguien"
- "Necesito un agente"

### 2. **Verificar en n8n**

1. Abre el workflow `Elina V4` en n8n
2. Ejecuta manualmente o espera un mensaje real
3. Revisa el nodo `Detectar Intención Crítica`:
   - Debe retornar: `is_critical: true`
   - Debe tener: `detection_type: "human_request"`
   - Debe tener: `confidence: 0.9`

### 3. **Verificar en la Base de Datos**

```sql
-- Ver detecciones recientes
SELECT * FROM critical_detections 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver conversaciones pausadas
SELECT cs.*, c.full_name, c.phone_number
FROM conversation_states cs
JOIN contacts c ON c.id = cs.contact_id
WHERE cs.is_paused = true
ORDER BY cs.paused_at DESC;
```

### 4. **Verificar en la App**

1. Abre el chat del contacto que envió el mensaje crítico
2. Debe aparecer el banner amarillo: "Conversación pausada"
3. El input debe estar deshabilitado
4. Debe mostrar el tipo de detección

---

## 📊 Estructura de Datos

### Tabla `conversation_states`

```sql
{
  id: bigint,
  contact_id: bigint,
  user_id: uuid,
  is_paused: boolean,
  pause_reason: text,  -- 'human_request', 'purchase_intent', etc.
  paused_at: timestamptz,
  paused_by: uuid,    -- null si fue automático
  resumed_at: timestamptz,
  resumed_by: uuid,
  metadata: jsonb     -- Detalles adicionales
}
```

### Tabla `critical_detections`

```sql
{
  id: bigint,
  contact_id: bigint,
  user_id: uuid,
  message_id: bigint,
  detection_type: text,
  detected_content: text,
  confidence_score: numeric(3,2),
  metadata: jsonb,
  processed: boolean,
  created_at: timestamptz
}
```

---

## ⚙️ Configuración Avanzada

### Agregar Palabras Clave Personalizadas

Puedes agregar palabras clave específicas para tu negocio:

```sql
INSERT INTO critical_keywords (user_id, keyword, detection_type, is_active)
VALUES 
  ('tu-user-id', 'cancelar pedido', 'urgent_attention', true),
  ('tu-user-id', 'reembolso', 'urgent_attention', true);
```

### Ajustar Patrones de Detección

Los patrones están en la función SQL `detect_critical_intent()`:
- Archivo: `supabase/schema/20251125_realtime_critical_detection.sql`
- Líneas: 94-107

---

## 🐛 Troubleshooting

### Problema: No se detecta como crítico

**Solución:**
1. Verifica que el nodo `Detectar Intención Crítica` esté ejecutándose
2. Revisa los logs del nodo para ver la respuesta
3. Verifica que el mensaje coincida con los patrones

### Problema: No aparece el banner en la app

**Solución:**
1. Verifica que `checkConversationState()` se esté llamando
2. Revisa la consola del navegador por errores
3. Verifica que la suscripción a Realtime esté activa

### Problema: La notificación no llega

**Solución:**
1. Verifica que `contact_phone` esté configurado en `profiles`
2. Revisa que la instancia "ElinaHead" esté activa
3. Verifica los logs del nodo `Enviar Notificación WhatsApp`

---

## 📝 Resumen del Flujo Completo

```
1. Cliente envía: "Quiero hablar con un humano"
   ↓
2. n8n recibe el mensaje (Webhook)
   ↓
3. n8n llama a detect-critical-intent
   ↓
4. Edge Function detecta: is_critical = true, type = "human_request"
   ↓
5. Edge Function pausa la conversación (conversation_states)
   ↓
6. n8n recibe la respuesta y verifica is_critical
   ↓
7. n8n envía notificación WhatsApp al dueño
   ↓
8. n8n marca contacto con "ignorar"
   ↓
9. App detecta el cambio (Realtime) y muestra banner
   ↓
10. Usuario puede reanudar manualmente desde la app
```

### 🔀 Diagrama del Flujo en n8n

```
[3. RAG - Formatear Contexto]
         ↓
[Detectar Intención Crítica] → POST a /functions/v1/detect-critical-intent
         ↓
    [IF: ¿Es Crítico?]
         ↓
    ┌────┴────┐
    │         │
   SÍ        NO
    │         │
    ↓         ↓
[Obtener Número]  [Buscar Promociones Activas]
    │              (continúa flujo normal)
    ↓
[Enviar Notificación WhatsApp]
    │
    ↓
[Preparar Labels con Ignorar]
    │
    ↓
[Update a row] → Marca contacto con "ignorar"
    │
    └─→ (FLUJO SE DETIENE - La IA NO responde)
```

**Nota importante:** Cuando se detecta algo crítico, el flujo se detiene después de actualizar las labels. Esto es correcto porque **no queremos que la IA responda** cuando el cliente quiere hablar con un humano.

---

## ✅ Checklist de Implementación

- [x] Función SQL `detect_critical_intent()` implementada
- [x] Edge Function `detect-critical-intent` desplegada
- [x] Nodo en n8n `Detectar Intención Crítica` configurado
- [x] Flujo condicional `IF: ¿Es Crítico?` funcionando
- [x] Notificación WhatsApp al dueño implementada
- [x] Tabla `conversation_states` creada
- [x] Tabla `critical_detections` creada
- [x] Frontend: Banner de pausa implementado
- [x] Frontend: Suscripción Realtime funcionando
- [x] Frontend: Botón reanudar implementado

**Todo está implementado y funcionando.** Solo necesitas probarlo enviando un mensaje crítico desde WhatsApp.

---

## 🧪 Prueba Rápida (5 minutos)

### Paso 1: Enviar Mensaje de Prueba
Desde WhatsApp, envía a tu bot:
```
"Quiero hablar con un humano"
```

### Paso 2: Verificar en n8n
1. Abre el workflow `Elina V4` en n8n
2. Ve a "Executions" (Ejecuciones)
3. Busca la ejecución más reciente
4. Abre el nodo `Detectar Intención Crítica`
5. Debe mostrar:
   ```json
   {
     "is_critical": true,
     "detection_type": "human_request",
     "confidence": 0.9,
     "detected_content": "Quiero hablar con un humano"
   }
   ```

### Paso 3: Verificar Notificación
- Debes recibir un WhatsApp en el número configurado en `profiles.contact_phone`
- El mensaje debe incluir: nombre del contacto, tipo de detección, confianza

### Paso 4: Verificar en la App
1. Abre la app y ve al chat del contacto
2. Debe aparecer el banner amarillo: "Conversación pausada"
3. El input debe estar deshabilitado
4. Debe mostrar: "(Solicitud de atención humana)"

### Paso 5: Verificar en Base de Datos
```sql
-- Ver la detección
SELECT * FROM critical_detections 
ORDER BY created_at DESC 
LIMIT 1;

-- Ver el estado de pausa
SELECT * FROM conversation_states 
WHERE is_paused = true 
ORDER BY paused_at DESC 
LIMIT 1;
```

### Paso 6: Reanudar Manualmente
1. En la app, haz clic en "Reanudar"
2. El banner debe desaparecer
3. El input debe habilitarse
4. La IA puede responder nuevamente

---

## 🎯 Puntos Clave para Recordar

1. **El sistema funciona automáticamente** - No necesitas hacer nada manualmente
2. **La IA NO responde** cuando está pausado - Esto es intencional
3. **El dueño recibe notificación** - Para que sepa que necesita atención
4. **Se puede reanudar desde la app** - Botón "Reanudar" en el banner
5. **Se registra todo** - En `critical_detections` y `conversation_states`

---

## 📞 Soporte

Si algo no funciona:
1. Revisa los logs del nodo `Detectar Intención Crítica` en n8n
2. Verifica que la Edge Function esté desplegada
3. Revisa la consola del navegador en la app
4. Verifica que las tablas existan en Supabase

