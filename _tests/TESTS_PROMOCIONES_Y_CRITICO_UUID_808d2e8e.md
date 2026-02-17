# 🧪 Tests para Promociones y Crítico - UUID: 808d2e8e-dc76-4244-9584-3e7d4dea0246

## 📊 Datos del Usuario

**UUID:** `808d2e8e-dc76-4244-9584-3e7d4dea0246`  
**Email:** `hola@elinaia.com.mx`  
**Nombre:** `ElinaIA`  
**Teléfono de Notificaciones:** `5219995169313`  
**Plan:** `grow` (active)  
**Instancia Evolution:** `ElinaIA`

---

## 🎯 Promoción Activa Disponible

**ID:** `103949e8-c0bd-4e31-a261-24d2225fd617`  
**Título:** `Trial 7 days`  
**Estado:** `is_active: true`  
**Sin horario:** `no_schedule: true` (siempre activa)

**Descripción:**
```
Prueba gratuita de 7 días

Somos un software de inteligencia artificial diseñado para atención 24/7 a través de WhatsApp, facilitando ventas y la programación de citas de manera optimizada.

Beneficios:
- Seguimientos automáticos.
- Asesoría de IA disponible 24/7.
- Optimizaciones inteligentes mediante IA.
- Conocimiento profundo de tu negocio para mejorar procesos de forma automática.
- Creación de imágenes atractivas para tus promociones.
- Administración eficiente de productos.
```

---

## 🧪 Test 1: Detección Crítica - Solicitud de Humano

### **Webhook a Enviar:**

```json
[
  {
    "headers": {
      "host": "n8n-n8n.mcjhhb.easypanel.host",
      "user-agent": "axios/1.12.2",
      "content-type": "application/json"
    },
    "params": {},
    "query": {},
    "body": {
      "event": "messages.upsert",
      "instance": "ElinaIA",
      "data": {
        "key": {
          "remoteJid": "5219991234567@s.whatsapp.net",
          "remoteJidAlt": "5219991234567@s.whatsapp.net",
          "fromMe": false,
          "id": "TEST_CRITICAL_001",
          "participant": "",
          "addressingMode": "standard"
        },
        "pushName": "Cliente Prueba Crítico",
        "status": "DELIVERY_ACK",
        "message": {
          "conversation": "Quiero hablar con un humano, por favor. Necesito ayuda urgente."
        },
        "contextInfo": {
          "mentionedJid": [],
          "groupMentions": []
        },
        "messageType": "conversation",
        "messageTimestamp": 1733068800,
        "instanceId": "e23c5673-1255-429d-8695-339a1dad426b",
        "source": "desktop"
      },
      "destination": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/",
      "date_time": "2025-12-03T12:00:00.000Z",
      "sender": "5219991234567@s.whatsapp.net",
      "server_url": "https://evolutionapi-evolution-api.mcjhhb.easypanel.host",
      "apikey": "3CCF7499C4A8-4E31-B8E1-40A7FA23951B"
    },
    "webhookUrl": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert",
    "executionMode": "production"
  }
]
```

### **Resultado Esperado:**

1. ✅ Se detecta como crítico (`is_critical: true`)
2. ✅ `detection_type: "human_request"`
3. ✅ Conversación pausada en `conversation_states`
4. ✅ Registro en `critical_detections`
5. ✅ **Notificación enviada a:** `5219995169313` (contact_phone del usuario)
6. ✅ **NO se genera respuesta de IA**

### **Verificar en Supabase:**

```sql
-- Ver última detección crítica
SELECT 
  cd.*,
  c.full_name,
  c.phone_number
FROM critical_detections cd
JOIN contacts c ON c.id = cd.contact_id
WHERE cd.user_id = '808d2e8e-dc76-4244-9584-3e7d4dea0246'
ORDER BY cd.created_at DESC
LIMIT 1;

-- Ver conversaciones pausadas
SELECT 
  cs.*,
  c.full_name,
  c.phone_number
FROM conversation_states cs
JOIN contacts c ON c.id = cs.contact_id
WHERE cs.is_paused = true
  AND cs.user_id = '808d2e8e-dc76-4244-9584-3e7d4dea0246';
```

---

## 🧪 Test 2: Detección Crítica - Intención de Compra Urgente

### **Webhook a Enviar:**

```json
[
  {
    "headers": {
      "host": "n8n-n8n.mcjhhb.easypanel.host",
      "user-agent": "axios/1.12.2",
      "content-type": "application/json"
    },
    "params": {},
    "query": {},
    "body": {
      "event": "messages.upsert",
      "instance": "ElinaIA",
      "data": {
        "key": {
          "remoteJid": "5219997654321@s.whatsapp.net",
          "remoteJidAlt": "5219997654321@s.whatsapp.net",
          "fromMe": false,
          "id": "TEST_CRITICAL_002",
          "participant": "",
          "addressingMode": "standard"
        },
        "pushName": "Cliente Compra Urgente",
        "status": "DELIVERY_ACK",
        "message": {
          "conversation": "Necesito comprar algo urgente, ¿pueden ayudarme ahora mismo?"
        },
        "contextInfo": {
          "mentionedJid": [],
          "groupMentions": []
        },
        "messageType": "conversation",
        "messageTimestamp": 1733068800,
        "instanceId": "e23c5673-1255-429d-8695-339a1dad426b",
        "source": "desktop"
      },
      "destination": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/",
      "date_time": "2025-12-03T12:00:00.000Z",
      "sender": "5219997654321@s.whatsapp.net",
      "server_url": "https://evolutionapi-evolution-api.mcjhhb.easypanel.host",
      "apikey": "3CCF7499C4A8-4E31-B8E1-40A7FA23951B"
    },
    "webhookUrl": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert",
    "executionMode": "production"
  }
]
```

### **Resultado Esperado:**

1. ✅ Se detecta como crítico (`is_critical: true`)
2. ✅ `detection_type: "purchase_intent"`
3. ✅ Conversación pausada
4. ✅ Notificación enviada a `5219995169313`
5. ✅ **NO se genera respuesta de IA**

---

## 🧪 Test 3: Promoción Inteligente - Solicitud Explícita de Ofertas

### **Webhook a Enviar:**

```json
[
  {
    "headers": {
      "host": "n8n-n8n.mcjhhb.easypanel.host",
      "user-agent": "axios/1.12.2",
      "content-type": "application/json"
    },
    "params": {},
    "query": {},
    "body": {
      "event": "messages.upsert",
      "instance": "ElinaIA",
      "data": {
        "key": {
          "remoteJid": "5219998888888@s.whatsapp.net",
          "remoteJidAlt": "5219998888888@s.whatsapp.net",
          "fromMe": false,
          "id": "TEST_PROMO_001",
          "participant": "",
          "addressingMode": "standard"
        },
        "pushName": "Cliente Interesado",
        "status": "DELIVERY_ACK",
        "message": {
          "conversation": "¿Tienen alguna oferta o promoción disponible? Me interesa probar el servicio."
        },
        "contextInfo": {
          "mentionedJid": [],
          "groupMentions": []
        },
        "messageType": "conversation",
        "messageTimestamp": 1733068800,
        "instanceId": "e23c5673-1255-429d-8695-339a1dad426b",
        "source": "desktop"
      },
      "destination": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/",
      "date_time": "2025-12-03T12:00:00.000Z",
      "sender": "5219998888888@s.whatsapp.net",
      "server_url": "https://evolutionapi-evolution-api.mcjhhb.easypanel.host",
      "apikey": "3CCF7499C4A8-4E31-B8E1-40A7FA23951B"
    },
    "webhookUrl": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert",
    "executionMode": "production"
  }
]
```

### **Resultado Esperado:**

1. ✅ **NO es crítico** → Continúa el flujo normal
2. ✅ Se busca promoción activa
3. ✅ Se encuentra la promoción "Trial 7 days"
4. ✅ Se agrega al contexto de la IA con indicador de solicitud explícita
5. ✅ La IA menciona la promoción en su respuesta
6. ✅ La respuesta incluye información sobre el trial de 7 días

### **Verificar en n8n:**

- Revisa los logs del nodo "Agregar Promo al Contexto"
- El `rag_context` debe incluir:
  ```
  [PROMOCIÓN ACTIVA DISPONIBLE]
  Título: Trial 7 days
  Descripción: Prueba gratuita de 7 días...
  Beneficios: ...
  ```

---

## 🧪 Test 4: Promoción Inteligente - Sin Solicitud Explícita

### **Webhook a Enviar:**

```json
[
  {
    "headers": {
      "host": "n8n-n8n.mcjhhb.easypanel.host",
      "user-agent": "axios/1.12.2",
      "content-type": "application/json"
    },
    "params": {},
    "query": {},
    "body": {
      "event": "messages.upsert",
      "instance": "ElinaIA",
      "data": {
        "key": {
          "remoteJid": "5219997777777@s.whatsapp.net",
          "remoteJidAlt": "5219997777777@s.whatsapp.net",
          "fromMe": false,
          "id": "TEST_PROMO_002",
          "participant": "",
          "addressingMode": "standard"
        },
        "pushName": "Cliente Consulta",
        "status": "DELIVERY_ACK",
        "message": {
          "conversation": "Hola, ¿qué servicios ofrecen? Me gustaría conocer más sobre lo que hacen."
        },
        "contextInfo": {
          "mentionedJid": [],
          "groupMentions": []
        },
        "messageType": "conversation",
        "messageTimestamp": 1733068800,
        "instanceId": "e23c5673-1255-429d-8695-339a1dad426b",
        "source": "desktop"
      },
      "destination": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/",
      "date_time": "2025-12-03T12:00:00.000Z",
      "sender": "5219997777777@s.whatsapp.net",
      "server_url": "https://evolutionapi-evolution-api.mcjhhb.easypanel.host",
      "apikey": "3CCF7499C4A8-4E31-B8E1-40A7FA23951B"
    },
    "webhookUrl": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert",
    "executionMode": "production"
  }
]
```

### **Resultado Esperado:**

1. ✅ **NO es crítico** → Continúa el flujo normal
2. ✅ Se busca promoción activa
3. ✅ Se encuentra la promoción "Trial 7 days"
4. ✅ Se agrega al contexto (sin indicador de solicitud explícita)
5. ✅ La IA puede mencionar la promoción de forma natural si es relevante
6. ✅ La respuesta es contextual y natural

---

## 🧪 Test 5: Mensaje Normal (Sin Crítico ni Promo Relevante)

### **Webhook a Enviar:**

```json
[
  {
    "headers": {
      "host": "n8n-n8n.mcjhhb.easypanel.host",
      "user-agent": "axios/1.12.2",
      "content-type": "application/json"
    },
    "params": {},
    "query": {},
    "body": {
      "event": "messages.upsert",
      "instance": "ElinaIA",
      "data": {
        "key": {
          "remoteJid": "5219996666666@s.whatsapp.net",
          "remoteJidAlt": "5219996666666@s.whatsapp.net",
          "fromMe": false,
          "id": "TEST_NORMAL_001",
          "participant": "",
          "addressingMode": "standard"
        },
        "pushName": "Cliente Normal",
        "status": "DELIVERY_ACK",
        "message": {
          "conversation": "Hola, ¿cómo están? Solo quería saludar."
        },
        "contextInfo": {
          "mentionedJid": [],
          "groupMentions": []
        },
        "messageType": "conversation",
        "messageTimestamp": 1733068800,
        "instanceId": "e23c5673-1255-429d-8695-339a1dad426b",
        "source": "desktop"
      },
      "destination": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/",
      "date_time": "2025-12-03T12:00:00.000Z",
      "sender": "5219996666666@s.whatsapp.net",
      "server_url": "https://evolutionapi-evolution-api.mcjhhb.easypanel.host",
      "apikey": "3CCF7499C4A8-4E31-B8E1-40A7FA23951B"
    },
    "webhookUrl": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert",
    "executionMode": "production"
  }
]
```

### **Resultado Esperado:**

1. ✅ **NO es crítico** → Continúa el flujo normal
2. ✅ Se busca promoción activa
3. ✅ La promoción está disponible pero no es relevante para este mensaje
4. ✅ La IA genera respuesta normal sin mencionar promociones
5. ✅ Respuesta natural y contextual

---

## 📋 Cómo Ejecutar los Tests

### **Opción 1: Usando cURL**

```bash
# Test 1: Crítico - Solicitud de Humano
curl -X POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert \
  -H "Content-Type: application/json" \
  -d @test_critical_001.json

# Test 3: Promoción - Solicitud Explícita
curl -X POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert \
  -H "Content-Type: application/json" \
  -d @test_promo_001.json
```

### **Opción 2: Usando Postman o Insomnia**

1. Crea una nueva petición POST
2. URL: `https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert`
3. Headers: `Content-Type: application/json`
4. Body: Copia el JSON del test que quieras ejecutar

### **Opción 3: Desde WhatsApp Real**

Envía los mensajes desde un número de WhatsApp real a la instancia "ElinaIA" del usuario.

---

## ✅ Checklist de Verificación

### **Para Tests Críticos:**

- [ ] Se creó registro en `critical_detections`
- [ ] Conversación pausada en `conversation_states`
- [ ] Notificación enviada a `5219995169313`
- [ ] NO se generó respuesta de IA
- [ ] El mensaje de notificación contiene:
  - 🚨 Emoji de alerta
  - Nombre del contacto
  - Tipo de detección
  - Mensaje detectado

### **Para Tests de Promociones:**

- [ ] Se encontró la promoción "Trial 7 days"
- [ ] Se agregó al `rag_context` de la IA
- [ ] La respuesta de la IA menciona la promoción (si es relevante)
- [ ] La respuesta es natural y contextual

---

## 🔍 Verificar Resultados en Supabase

```sql
-- Ver todas las detecciones críticas recientes
SELECT 
  cd.*,
  c.full_name,
  c.phone_number
FROM critical_detections cd
JOIN contacts c ON c.id = cd.contact_id
WHERE cd.user_id = '808d2e8e-dc76-4244-9584-3e7d4dea0246'
ORDER BY cd.created_at DESC
LIMIT 10;

-- Ver conversaciones pausadas
SELECT 
  cs.*,
  c.full_name,
  c.phone_number
FROM conversation_states cs
JOIN contacts c ON c.id = cs.contact_id
WHERE cs.is_paused = true
  AND cs.user_id = '808d2e8e-dc76-4244-9584-3e7d4dea0246';

-- Verificar que la promoción está activa
SELECT 
  id,
  title,
  is_active,
  no_schedule,
  start_at,
  end_at
FROM smart_promotions
WHERE user_id = '808d2e8e-dc76-4244-9584-3e7d4dea0246'
  AND is_active = true;
```

---

## 📝 Notas Importantes

1. **Números de Teléfono:** Los números en los tests son ejemplos. Reemplázalos con números reales si quieres probar con contactos existentes.

2. **IDs Únicos:** Cada test usa un `id` único en `data.key.id` para evitar conflictos.

3. **Timestamps:** Los `messageTimestamp` están en formato Unix. Ajusta según necesites.

4. **Instancia:** Asegúrate de que la instancia "ElinaIA" esté activa y configurada correctamente.

---

¿Listo para probar? 🚀

