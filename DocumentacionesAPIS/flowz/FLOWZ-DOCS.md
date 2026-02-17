# FLOWZ - Documentacion Completa para Continuidad
## Smart Flow Engine V10 + Router Webhook + Elina-v5 (Imagenes)

> **Fecha:** 2026-02-14
> **Proyecto Supabase:** `mytvwfbijlgbihlegmfg`
> **URL:** https://mytvwfbijlgbihlegmfg.supabase.co
> **Repositorio Local:** `E:\DESAL\ELina 26`

---

## 1. QUE ES ESTE SISTEMA

Un sistema multi-tenant de chatbot de WhatsApp que tiene DOS modos de respuesta:

1. **Smart Flow Engine V10** - Flows conversacionales guiados (tipo funnel), activados por palabras clave
2. **Elina-v5** - Conversacion libre con IA (GPT), RAG, tools, cotizaciones

Un **Router Webhook** decide cual usar para cada mensaje.

---

## 2. ARQUITECTURA GENERAL

```
WhatsApp (Evolution API)
         |
         v
[router-webhook]  <-- Este es el webhook que recibe de Evolution
    |          |
    v          v
[smart-flow]  [elina-v5]
(flows)       (IA libre)
```

### Flujo de Decision del Router:

1. Hay flow ACTIVO para este contacto? -> Smart Flow
2. Mensaje contiene PALABRA CLAVE de algun flow? -> Smart Flow
3. Sin match -> Elina-v5

---

## 3. ESTRUCTURA DE ARCHIVOS

### Smart Flow Engine V10
```
supabase/functions/smart-flow-engine-v10/
├── index.ts                    (468 lineas) - Entry point principal
├── deno.json                   - Config Deno
└── core/
    ├── types.ts                (268 lineas) - TODOS los tipos TypeScript
    ├── FlowExecutor.ts         (538 lineas) - Motor de ejecucion de flows
    ├── StateManager.ts         (276 lineas) - Persistencia de estado en BD
    ├── SmartFiller.ts          (45 lineas)  - Extraccion inteligente de variables
    ├── TemplateRenderer.ts     (52 lineas)  - Renderizado de {{variables}}
    ├── ResponseValidator.ts    (105 lineas) - Validacion LLM de respuestas
    ├── ContextCheckHandler.ts  (121 lineas) - Deteccion de contexto previo
    ├── ImageHandler.ts         (373 lineas) - Recoleccion y lectura de imagenes
    ├── QuoteHandler.ts         (226 lineas) - Creacion de cotizaciones
    ├── PaymentHandler.ts       (129 lineas) - Info de pago segura
    ├── CriticalHandler.ts      (189 lineas) - Modo critico (humano)
    └── TaskHandler.ts          (189 lineas) - Tareas y recordatorios
```

### Router Webhook
```
supabase/functions/router-webhook/
├── index.ts     - Decision logic
└── deno.json
```

### Elina-v5 (solo lo modificado)
```
supabase/functions/elina-v5/
├── index.ts                    - Seccion 10-11 modificada (imagenes)
└── utils/
    └── text-formatter.ts       - Nueva funcion splitMediaIntoMessages()
```

### Frontend
```
flow-builder.js                 - Editor visual de flows (raiz del proyecto)
dashboard.html                  - Linea 1235: <div id="ai-flows-content">
```

---

## 4. TABLAS DE BASE DE DATOS QUE USA

### Tablas Existentes
| Tabla | Uso |
|-------|-----|
| `profiles` | Datos del usuario/negocio, instance Evolution, payment_info |
| `contacts` | Contactos de WhatsApp, labels, followup_status |
| `auto_responses` | **AQUI SE GUARDAN LOS FLOWS** (is_flow=true, flow_data=JSON) |
| `flow_states` | Estado activo de cada flow por contacto |
| `processed_messages` | Deduplicacion de mensajes |
| `products` | Catalogo de productos (para auto-deteccion) |
| `quotes` | Cotizaciones generadas |
| `chat_history` | Historial de conversaciones |

### Tabla Requerida Nueva
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    contact_id INTEGER REFERENCES contacts(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_from_flow BOOLEAN DEFAULT FALSE,
    flow_id TEXT
);
```

### Columna Requerida en profiles
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_info JSONB DEFAULT '{}';
```

Estructura de `payment_info`:
```json
{
  "bank_name": "BBVA",
  "bank_account": "0123456789",
  "account_holder": "Nombre Titular",
  "clabe": "012345678901234567",
  "card_last4": "4321",
  "paypal_email": "pago@negocio.com",
  "qr_code_url": "https://...url-del-qr.png",
  "business_name": "Mi Negocio"
}
```

---

## 5. STEP TYPES DISPONIBLES

### Originales (ya existian)
| Type | Que hace |
|------|----------|
| `message` | Envia un mensaje de texto, puede incluir media_url |
| `question` | Hace una pregunta, guarda respuesta en variable |
| `condition` | Condicional: evalua variable y decide next_step |
| `action` | Ejecuta accion: calculate_custom, calculate_quote, etc |
| `wait_for_input` | Pausa generica esperando input |
| `context_check` | Revisa si hay cotizaciones/pedidos previos |

### Nuevos (implementados 2026-02-14)
| Type | Que hace | Handler |
|------|----------|---------|
| `collect_image` | Espera imagen del usuario, la guarda | ImageHandler.ts |
| `read_image` | Lee contenido de imagen con GPT-4 Vision | ImageHandler.ts |
| `create_quote` | Crea cotizacion con productos (auto-detect o manual) | QuoteHandler.ts |
| `send_payment_info` | Envia datos de pago con placeholders seguros | PaymentHandler.ts |
| `trigger_critical` | Pausa flow, notifica admin, agrega label | CriticalHandler.ts |
| `create_task` | Crea tarea/recordatorio con fecha y prioridad | TaskHandler.ts |

### Modos de Flow
- **`step_by_step`**: Pregunta una cosa a la vez (funnel guiado)
- **`get_all`**: Pide todos los datos de golpe

---

## 6. COMO SE GUARDAN LOS FLOWS EN LA BD

Los flows se guardan en la tabla `auto_responses` con:

```sql
INSERT INTO auto_responses (
    user_id,
    trigger_text,     -- "llaveros, impresion 3d" (palabras clave separadas por coma)
    response_text,    -- placeholder, no se usa para flows
    is_active,        -- true/false
    is_flow,          -- true (marca que es un flow)
    flow_data         -- JSONB con la estructura del flow
) VALUES (...);
```

Estructura de `flow_data`:
```json
{
  "id": "mi_flow_123",
  "mode": "step_by_step",
  "trigger_keywords": ["llaveros", "cotizar"],
  "steps": [
    {
      "id": "step_welcome",
      "type": "message",
      "content": "Hola! Bienvenido",
      "next_step": "step_pregunta1"
    },
    {
      "id": "step_pregunta1",
      "type": "question",
      "content": "Cuantas piezas necesitas?",
      "variable": "cantidad",
      "validation": { "type": "number", "error_message": "Dime un numero" },
      "next_step": "step_imagen"
    },
    {
      "id": "step_imagen",
      "type": "collect_image",
      "content": "Envia tu diseno",
      "variable": "imagen_diseno",
      "max_images": 3,
      "read_content": true,
      "next_step": "step_cotizar"
    },
    {
      "id": "step_cotizar",
      "type": "create_quote",
      "products": "auto_detect",
      "quantity_variable": "cantidad",
      "send_to_customer": true,
      "next_step": "step_pago"
    },
    {
      "id": "step_pago",
      "type": "send_payment_info",
      "message_template": "Transfiere a:\n🏦 {{bank_name}}\n💳 {{bank_account}}",
      "include_image": true,
      "payment_method": "transfer",
      "next_step": "step_tarea"
    },
    {
      "id": "step_tarea",
      "type": "create_task",
      "task_title": "Entregar pedido de {{cantidad}} piezas",
      "due_date_offset_days": 7,
      "priority": "high",
      "next_step": null
    }
  ],
  "variables": {}
}
```

---

## 7. COMO FUNCIONA EL MOTOR (FlowExecutor)

1. Recibe un `SmartFlow` (definicion) y un `FlowState` (estado actual)
2. Ejecuta steps en un `while` loop
3. Para cada step, hace `switch(step.type)` y ejecuta el handler correspondiente
4. Si el step requiere input del usuario (question, collect_image), pone `status='paused'`
5. Cuando llega nuevo mensaje, el StateManager carga el estado pausado
6. ResponseValidator (usa GPT-4o-mini via OpenRouter) valida la respuesta del usuario
7. Si es valida, guarda en variable y avanza. Si no, repite pregunta
8. Si el usuario hace una pregunta fuera de contexto, retorna `OUT_OF_CONTEXT` y el Router redirige a Elina-v5
9. Los mensajes se acumulan en `collectedMessages[]` y se envian todos al final via Evolution API

---

## 8. ELINA-V5: CAMBIOS DE IMAGENES (Implementados 2026-02-14)

### Problema Original
Los regex para detectar imagenes no coincidian entre `index.ts` y `text-formatter.ts`, causando que las imagenes no se enviaran correctamente.

### Solucion
Se sincronizo el REGEX de n8n V4 en todos los archivos:
```typescript
/https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|mp4)/gi
```

### Cambios Clave en index.ts (Seccion 10-11)

**ANTES:** Un solo array `mediaToSend` mezclaba imagenes y videos
**AHORA:** Arrays separados `imagesToSend[]` y `videosToSend[]`

**ANTES:** Un solo flujo para enviar media
**AHORA:** Switch tipo de mensaje (como n8n V4):
```typescript
if (hasAudio) { /* ya enviado */ }
else if (hasImages) { /* Flujo de imagenes: splitMediaIntoMessages() */ }
else if (hasVideos) { /* Flujo de video */ }
else if (hasTextOnly) { /* Flujo de texto puro */ }
```

### Nueva Funcion: splitMediaIntoMessages()
En `utils/text-formatter.ts` - Replica EXACTA del nodo n8n "IMG - Split a 3 envios":
- Extrae hasta 3 URLs del texto
- Divide el texto en captions por imagen
- En la ultima imagen, agrega todo el texto restante
- Limpia URLs sobrantes y etiquetas "Imagen:"

---

## 9. VARIABLES DE ENTORNO REQUERIDAS

```
SUPABASE_URL=https://mytvwfbijlgbihlegmfg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ANON_KEY=<anon-key>
OPENAI_API_KEY=<openai-key>          # Para Vision AI (ImageHandler)
OPENROUTER_API_KEY=<openrouter-key>  # Para ResponseValidator (GPT-4o-mini)
```

---

## 10. COMO CONECTAR

### Webhook de Evolution API
El webhook debe apuntar a:
```
https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/router-webhook
```

Esto lo configuras en Evolution API > Settings > Webhook URL.

### MCP de Supabase (para Claude Code)
Archivo `.mcp.json` en la raiz del proyecto:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=mytvwfbijlgbihlegmfg"
    }
  }
}
```

Para autorizar en nueva maquina:
```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=mytvwfbijlgbihlegmfg"
```

---

## 11. COMO HACER TESTING

### Test 1: Logica de Imagenes (Elina-v5)
Existe un archivo de test:
```
supabase/functions/elina-v5/test-image-logic.ts
```
Ejecutar con:
```bash
cd supabase/functions/elina-v5
deno run --allow-read test-image-logic.ts
```

### Test 2: Flow Completo via curl

```bash
# Simular mensaje que activa un flow
curl -X POST https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/router-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "instance": "<NOMBRE_INSTANCIA_EVOLUTION>",
    "data": {
      "key": {
        "remoteJid": "5219995169313@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST_'$(date +%s)'"
      },
      "pushName": "Test User",
      "message": {
        "conversation": "Quiero cotizar llaveros"
      }
    }
  }'
```

### Test 3: Smart Flow Engine directo

```bash
curl -X POST https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/smart-flow-engine-v10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "input_text": "Quiero 50 llaveros rojos",
    "conversation_id": "5219995169313",
    "instance": "<NOMBRE_INSTANCIA>"
  }'
```

### Test 4: Verificar flows en BD
```sql
-- Ver flows activos
SELECT id, trigger_text, is_active, flow_data
FROM auto_responses
WHERE is_flow = true
ORDER BY created_at DESC;

-- Ver estados de flow activos
SELECT * FROM flow_states
WHERE status IN ('active', 'paused')
ORDER BY last_updated DESC;
```

---

## 12. PENDIENTES / TODO

### Integracion Completa de Handlers con FlowExecutor
Los handlers nuevos (QuoteHandler, PaymentHandler, TaskHandler) tienen implementaciones completas pero el FlowExecutor usa placeholders para algunos porque necesita `userId` y `contactId` que vienen del `index.ts`. Para conectarlos completamente:

1. Pasar `userId`, `contactId`, y `evolutionConfig` como parametros al FlowExecutor constructor
2. Usar los handlers reales en lugar de placeholders en los metodos:
   - `executeCreateQuoteStep()` - Necesita llamar a `QuoteHandler.executeCreateQuoteStep()`
   - `executeSendPaymentInfoStep()` - Necesita llamar a `PaymentHandler.executeSendPaymentInfoStep()`
   - `executeCreateTaskStep()` - Necesita llamar a `TaskHandler.executeCreateTaskStep()`

### Tabla `tasks`
- Crear la tabla en Supabase (ver SQL arriba en seccion 4)
- Agregar RLS policies

### Frontend Editor Avanzado
- Formularios de edicion especificos para cada nuevo step type en `renderStepEditorModal()` de flow-builder.js
- Actualmente los nuevos steps se pueden agregar y ver, pero la edicion usa el editor JSON avanzado
- Falta agregar formularios visuales para:
  - collect_image: max_images, optional, read_content
  - create_quote: products source, quantity_variable
  - send_payment_info: message_template editor, payment_method selector
  - trigger_critical: reason, auto_response
  - create_task: title, due_date, priority

### Deploy de Edge Functions
Las funciones NO estan desplegadas todavia. Para desplegar:
```bash
# Desde la raiz del proyecto
supabase functions deploy router-webhook
supabase functions deploy smart-flow-engine-v10
supabase functions deploy elina-v5
```

O usar el MCP de Supabase para deploy desde Claude.

### Modo GET_ALL
La interfaz de `get_all_config` esta definida en types.ts pero la logica de ejecucion en el FlowExecutor aun no implementa el comportamiento de "pedir todos los datos de una vez". Actualmente solo funciona `step_by_step`.

---

## 13. NOTAS IMPORTANTES

1. **Multi-tenant**: TODO se filtra por `user_id`. Nada esta hardcodeado para un negocio especifico
2. **Evolution API format**: Los payloads tienen `data.key.remoteJid` con `@s.whatsapp.net` que se limpia. Tambien maneja `@lid` (Linked Devices) con fallback a `remoteJidAlt`
3. **Deduplicacion**: La tabla `processed_messages` evita que un mismo mensaje se procese 2 veces (comun con webhooks de Evolution)
4. **SmartFiller**: Extrae variables del primer mensaje (cantidad, color, urgencia) para SALTAR preguntas que ya fueron respondidas
5. **ResponseValidator**: Usa GPT-4o-mini via OpenRouter para validar respuestas. Si detecta pregunta fuera de contexto, retorna `OUT_OF_CONTEXT` y el Router redirige a Elina-v5
6. **Criticos**: Cuando se activa `trigger_critical`, se agrega label "ignorar" al contacto, se pausa el flow, se notifica al admin por WhatsApp, y se envia respuesta automatica al cliente
7. **WhatsApp numero del dueno**: `5219995169313` es el numero de test usado en las pruebas

---

## 14. CLAVES Y REFERENCIAS RAPIDAS

| Concepto | Ubicacion |
|----------|-----------|
| Router webhook | `supabase/functions/router-webhook/index.ts` |
| Smart Flow main | `supabase/functions/smart-flow-engine-v10/index.ts` |
| Elina-v5 main | `supabase/functions/elina-v5/index.ts` |
| Tipos de steps | `smart-flow-engine-v10/core/types.ts` |
| Motor de ejecucion | `smart-flow-engine-v10/core/FlowExecutor.ts` |
| Estado y persistencia | `smart-flow-engine-v10/core/StateManager.ts` |
| Frontend editor | `flow-builder.js` (raiz) |
| Dashboard seccion | `dashboard.html` linea 1235 (#ai-flows) |
| Regex de imagenes n8n | `/https?:\/\/[^\s"'<>]+\.(?:png\|jpg\|jpeg\|gif\|webp\|mp4)/gi` |
| Seccion imagenes elina-v5 | `elina-v5/index.ts` lineas 633-895 |
| splitMediaIntoMessages | `elina-v5/utils/text-formatter.ts` linea 144 |
