# 📋 Sistema de Respuestas Programadas (Auto Responses)

## 🎯 ¿Qué es?

Las **Respuestas Programadas** permiten configurar respuestas automáticas que se envían cuando el sistema detecta ciertos textos en los mensajes entrantes, **ANTES** de activar la IA.

---

## 💾 ¿Cómo se Guardan en la Base de Datos?

### **Tabla: `auto_responses`**

```sql
CREATE TABLE auto_responses (
    id BIGINT PRIMARY KEY,                    -- ID único
    user_id UUID NOT NULL,                     -- ID del usuario (dueño)
    trigger_text TEXT NOT NULL,                -- Texto que activa la respuesta
    response_text TEXT NOT NULL,               -- Texto de respuesta a enviar
    is_active BOOLEAN DEFAULT false,           -- Si está activa o no
    match_type TEXT DEFAULT 'exact',           -- 'exact' o 'contains'
    created_at TIMESTAMPTZ DEFAULT now(),      -- Fecha de creación
    updated_at TIMESTAMPTZ DEFAULT now()        -- Fecha de última actualización
);
```

### **Ejemplo de Registro:**

```json
{
  "id": 1,
  "user_id": "uuid-del-usuario",
  "trigger_text": "Hola, vi tu anuncio en Facebook",
  "response_text": "¡Hola! Gracias por contactarnos...",
  "is_active": true,
  "match_type": "contains",
  "created_at": "2025-01-03T12:00:00Z",
  "updated_at": "2025-01-03T12:00:00Z"
}
```

### **Índices para Búsqueda Rápida:**

1. **`idx_auto_responses_user_active`**: Búsqueda rápida por usuario y estado activo
   ```sql
   CREATE INDEX idx_auto_responses_user_active 
   ON auto_responses(user_id, is_active) 
   WHERE is_active = true;
   ```

2. **`idx_auto_responses_trigger_text`**: Búsqueda de texto (para match_type contains)
   ```sql
   CREATE INDEX idx_auto_responses_trigger_text 
   ON auto_responses USING gin(to_tsvector('spanish', trigger_text));
   ```

---

## 🔍 ¿Cómo se Consultan en n8n?

### **Paso 1: Obtener Respuestas Activas del Usuario**

**Nodo Supabase:** `Buscar Auto Responses`

```javascript
// Configuración:
Table: auto_responses
Filters:
  - user_id: eq.{{ $('Get a row1').item.json.id }}
  - is_active: eq.true
Return All: true
```

**Resultado:** Array de todas las respuestas automáticas activas del usuario.

---

### **Paso 2: Verificar si el Mensaje Coincide**

**Nodo Code:** `Verificar Match Auto Response`

```javascript
const autoResponses = $input.all(); // Todas las respuestas activas
const messageText = $('set text1').item.json.text || '';
const normalizedMessage = messageText.toLowerCase().trim();

// Buscar coincidencia
for (const response of autoResponses) {
  const triggerText = response.json.trigger_text || '';
  const matchType = response.json.match_type || 'contains';
  const normalizedTrigger = triggerText.toLowerCase().trim();
  
  let matches = false;
  
  if (matchType === 'exact') {
    // Coincidencia exacta
    matches = normalizedMessage === normalizedTrigger;
  } else {
    // Contiene el texto
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

---

### **Paso 3: Decidir el Flujo**

**Nodo IF:** `IF: ¿Hay Auto Response?`

- **Si `hasMatch === true`**:
  - Enviar respuesta automática
  - **NO activar la IA** (terminar flujo)
  
- **Si `hasMatch === false`**:
  - Continuar flujo normal
  - Activar RAG, detección crítica, AI Agent, etc.

---

## 🔄 Flujo Completo en n8n

```
1. Webhook recibe mensaje
   ↓
2. Obtener user_id (Get a row1)
   ↓
3. Buscar Auto Responses (Supabase)
   ├─ Filtro: user_id = X AND is_active = true
   └─ Retorna: Array de respuestas activas
   ↓
4. Verificar Match (Code)
   ├─ Compara mensaje con trigger_text
   ├─ Usa match_type (exact o contains)
   └─ Retorna: hasMatch + responseText
   ↓
5. IF: ¿Hay Match?
   ├─ TRUE → Enviar Auto Response → FIN (no activar IA)
   └─ FALSE → Continuar flujo normal → RAG → AI Agent
```

---

## 📝 Tipos de Coincidencia

### **1. Coincidencia Exacta (`match_type: 'exact'`)**

El mensaje debe ser **exactamente igual** al trigger (ignorando mayúsculas/minúsculas).

**Ejemplo:**
- **Trigger:** `"Información"`
- **Mensaje:** `"Información"` ✅ Coincide
- **Mensaje:** `"Quiero información"` ❌ No coincide
- **Mensaje:** `"información"` ✅ Coincide (case-insensitive)

---

### **2. Contiene el Texto (`match_type: 'contains'`)**

El mensaje debe **contener** el trigger en cualquier parte.

**Ejemplo:**
- **Trigger:** `"Hola, vi tu anuncio"`
- **Mensaje:** `"Hola, vi tu anuncio en Facebook"` ✅ Coincide
- **Mensaje:** `"Hola, vi tu anuncio y me interesa"` ✅ Coincide
- **Mensaje:** `"Hola"` ❌ No coincide

---

## 🎨 Interfaz de Usuario

### **Crear Nueva Respuesta:**
1. Click en "Agregar Respuesta"
2. Llenar campos:
   - **Espero este texto:** El trigger
   - **Envío este texto:** La respuesta
   - **Activar automáticamente:** Switch on/off
   - **Tipo de coincidencia:** Exacta o Contiene
3. Click en "Guardar"

### **Editar Respuesta:**
1. Click en el botón de editar (lápiz) en cualquier respuesta
2. Modificar los campos
3. Click en "Guardar Cambios"

**✅ TODAS las respuestas son editables**, incluyendo las que se crean por defecto.

### **Eliminar Respuesta:**
1. Click en el botón de eliminar (papelera)
2. Confirmar eliminación

### **Activar/Desactivar:**
- Click en el switch de cada respuesta
- Se actualiza automáticamente en la base de datos

---

## 🔐 Seguridad (RLS - Row Level Security)

Cada usuario **solo puede ver y modificar sus propias respuestas**:

```sql
-- Política RLS
CREATE POLICY "Users can view their own auto responses"
ON auto_responses FOR SELECT
USING (auth.uid() = user_id);
```

Esto garantiza que:
- ✅ Usuario A no puede ver respuestas de Usuario B
- ✅ Usuario A no puede modificar respuestas de Usuario B
- ✅ Cada usuario tiene su propio conjunto de respuestas

---

## 📊 Ejemplos de Uso

### **Ejemplo 1: Respuesta a Anuncios de Meta**

**Trigger:** `"Hola, vi tu anuncio"`
**Response:** `"¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?"`
**Match Type:** `contains`
**Active:** `true`

**Resultado:** Cuando alguien escriba "Hola, vi tu anuncio en Facebook", se enviará automáticamente la respuesta sin activar la IA.

---

### **Ejemplo 2: Respuesta a Solicitud de Información**

**Trigger:** `"Información"`
**Response:** `"Con gusto te proporcionamos información. ¿Sobre qué producto te gustaría saber más?"`
**Match Type:** `contains`
**Active:** `true`

**Resultado:** Cualquier mensaje que contenga "Información" activará esta respuesta.

---

### **Ejemplo 3: Respuesta Exacta**

**Trigger:** `"Precio"`
**Response:** `"Nuestros precios varían según el producto. ¿Qué producto te interesa?"`
**Match Type:** `exact`
**Active:** `true`

**Resultado:** Solo se activa si el mensaje es exactamente "Precio" (sin otras palabras).

---

## ⚠️ Notas Importantes

1. **Orden de Verificación:**
   - Auto Responses se verifica **ANTES** de la IA
   - Si hay match, **NO se activa la IA**
   - Esto permite respuestas rápidas sin costo de IA

2. **Múltiples Coincidencias:**
   - Si hay múltiples triggers que coinciden, se usa el **primero** encontrado
   - El orden depende del orden en la base de datos

3. **Normalización:**
   - El texto se normaliza a minúsculas para comparación
   - Esto hace que "Hola" y "hola" sean iguales

4. **Performance:**
   - Los índices garantizan búsquedas rápidas
   - Solo se consultan respuestas activas (`is_active = true`)

---

## 🧪 Testing

### **Probar en n8n:**

1. **Crear respuesta automática:**
   - Trigger: `"test"`
   - Response: `"Esta es una respuesta de prueba"`
   - Active: `true`
   - Match Type: `contains`

2. **Enviar mensaje de prueba:**
   - Mensaje: `"Hola, esto es un test"`
   - Debe enviar la respuesta automática
   - **NO debe activar la IA**

3. **Verificar logs:**
   - Revisar que el nodo "Verificar Match Auto Response" retorne `hasMatch: true`
   - Revisar que se envíe la respuesta
   - Revisar que el flujo termine (no continúe a RAG/AI)

---

## 📚 Referencias

- **Tabla:** `auto_responses`
- **Workflow n8n:** `Elina V4 (1).json`
- **Nodos clave:**
  - `Buscar Auto Responses` (Supabase)
  - `Verificar Match Auto Response` (Code)
  - `IF: ¿Hay Auto Response?` (IF)
  - `Enviar Auto Response` (Evolution API)

