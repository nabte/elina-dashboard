# 📝 Crear Flow de Prueba para Modo GET_ALL

## Opción 1: Usar el Frontend (Recomendado)

1. Abrir **dashboard.html** en el navegador
2. Login como nabte
3. Ir a **"Flows Inteligentes"**
4. Click en **"Crear desde Cero"**

### Configuración Básica:

**Palabras Clave:**
```
test ia, prueba get all
```

**Modo:**
- Click en **"Get All (IA)"** (muy importante)

### Agregar Steps:

**Step 1: Question**
- Tipo: Hacer una Pregunta
- Contenido: `¿Cuál es tu nombre?`
- Variable: `nombre`
- Validación: Texto libre
- Modo: Exacto (📝)

**Step 2: Question**
- Tipo: Hacer una Pregunta
- Contenido: `¿Qué edad tienes?`
- Variable: `edad`
- Validación: Solo números
- Modo: Exacto (📝)

**Step 3: Question**
- Tipo: Hacer una Pregunta
- Contenido: `¿De qué ciudad eres?`
- Variable: `ciudad`
- Validación: Texto libre
- Modo: Exacto (📝)

**Step 4: Question**
- Tipo: Hacer una Pregunta
- Contenido: `¿Qué te gusta hacer?`
- Variable: `hobby`
- Validación: Texto libre
- Modo: Exacto (📝)

**Step 5: Message**
- Tipo: Enviar Mensaje
- Contenido: `¡Perfecto {{nombre}}! Tienes {{edad}} años, vives en {{ciudad}} y te gusta {{hobby}}. ¡Gracias! 🎉`
- Modo: IA Adaptativa (🤖)

### Guardar:

Click en **"Activar Flow"**

---

## Opción 2: Ejecutar SQL Directo (Más Rápido)

**IMPORTANTE:** Ejecutar en Supabase SQL Editor con tu cuenta de superadmin:

```sql
-- Insertar flow de prueba GET_ALL
INSERT INTO auto_responses (
    user_id,
    trigger_text,
    response_text,
    is_active,
    is_flow,
    flow_data
) VALUES (
    'f2ef49c6-4646-42f8-8130-aa5cd0d3c84f', -- nabte
    'test ia, prueba get all, test get all',
    'Flow de prueba modo GET_ALL',
    true,
    true,
    '{
  "id": "flow_test_get_all_simple",
  "mode": "get_all",
  "trigger_keywords": ["test ia", "prueba get all", "test get all"],
  "recommended_products": [],
  "steps": [
    {
      "id": "step_nombre",
      "type": "question",
      "content": "¿Cuál es tu nombre?",
      "variable": "nombre",
      "validation": {"type": "text"},
      "ai_mode": false,
      "next_step": "step_edad"
    },
    {
      "id": "step_edad",
      "type": "question",
      "content": "¿Qué edad tienes?",
      "variable": "edad",
      "validation": {"type": "number"},
      "ai_mode": false,
      "next_step": "step_ciudad"
    },
    {
      "id": "step_ciudad",
      "type": "question",
      "content": "¿De qué ciudad eres?",
      "variable": "ciudad",
      "validation": {"type": "text"},
      "ai_mode": false,
      "next_step": "step_hobby"
    },
    {
      "id": "step_hobby",
      "type": "question",
      "content": "¿Qué te gusta hacer?",
      "variable": "hobby",
      "validation": {"type": "text"},
      "ai_mode": false,
      "next_step": "step_final"
    },
    {
      "id": "step_final",
      "type": "message",
      "content": "¡Perfecto {{nombre}}! Tienes {{edad}} años, vives en {{ciudad}} y te gusta {{hobby}}. ¡Gracias! 🎉",
      "ai_mode": true,
      "next_step": null
    }
  ],
  "variables": {}
}'::jsonb
);

-- Verificar creación
SELECT id, trigger_text, flow_data->>'mode' as mode, is_active
FROM auto_responses
WHERE trigger_text LIKE '%test%'
AND is_flow = true
ORDER BY id DESC
LIMIT 1;
```

---

## Después de Crear el Flow:

### Ejecutar Tests:

```bash
node test-get-all-simple.js
```

### Input de Prueba:

```
test ia
```

Luego responder:
```
Soy Juan, tengo 28 años, vivo en Mérida y me gusta programar
```

### Resultado Esperado:

```json
{
  "status": "GET_ALL_WAITING",
  "completion_percentage": 100,
  "extracted": {
    "nombre": "Juan",
    "edad": "28",
    "ciudad": "Mérida",
    "hobby": "programar"
  },
  "missing_fields": [],
  "question_sent": null
}
```

**¡La IA extrajo todos los campos de una sola respuesta!**

---

## Comparación vs Step by Step:

### Modo Step by Step (tradicional):
```
Bot: ¿Cuál es tu nombre?
Usuario: Soy Juan, tengo 28 años, vivo en Mérida y me gusta programar

Bot: ¿Qué edad tienes?  ← Repite pregunta porque no extrajo "28"
Usuario: 28

Bot: ¿De qué ciudad eres?  ← Repite pregunta
Usuario: Mérida

Bot: ¿Qué te gusta hacer?  ← Repite pregunta
Usuario: Programar

Total: 4 mensajes del bot, 4 del usuario
```

### Modo Get All (IA):
```
Bot: ¿Cuál es tu nombre?
Usuario: Soy Juan, tengo 28 años, vivo en Mérida y me gusta programar

IA extrae:
✓ nombre: "Juan"
✓ edad: "28"
✓ ciudad: "Mérida"
✓ hobby: "programar"

Bot: ¡Perfecto Juan! Tienes 28 años, vives en Mérida y te gusta programar. ¡Gracias! 🎉

Total: 1 mensaje del bot, 1 del usuario
```

**Reducción:** ~75% menos mensajes

---

## Verificar en Logs:

https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/logs/edge-functions

Buscar:
- `[SmartFlowEngine] Flow mode: get_all`
- `[GetAllHandler] Analyzing message with GPT-4`
- `[GetAllHandler] GPT-4 extracted:`
- `GET_ALL extraction result`

---

**¿Cuál opción prefieres usar?**
- Opción 1 (Frontend) = Más visual, fácil de editar después
- Opción 2 (SQL) = Más rápido, 1 minuto
