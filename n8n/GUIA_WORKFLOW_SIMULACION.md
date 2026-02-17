# 🧪 Guía: Workflow de Simulación Elina V4

## 📋 Descripción

Este workflow (`Elina V4 Simulacion.json`) es una versión simplificada del workflow principal de Elina V4, diseñada específicamente para **simulación y testing** del sistema de entrenamiento de prompts.

---

## ✅ Características

### **Simplificaciones:**
- ✅ **Sin filtros de suscripción:** No verifica si la cuenta está activa
- ✅ **Sin filtros de usuario ignorado:** No verifica si el contacto tiene la etiqueta "ignorar"
- ✅ **Respuesta JSON:** Todos los nodos de Evolution API fueron reemplazados por "Respond to Webhook" que retorna JSON
- ✅ **Logs mejorados:** Estructura de respuesta JSON con información de contexto usado

### **Funcionalidades Mantenidas:**
- ✅ **RAG (Memoria Largo Plazo):** Obtiene contexto de mensajes anteriores
- ✅ **Búsqueda de Productos:** Herramienta `ver_productos` disponible para el AI Agent
- ✅ **Prompt Personalizado:** Usa el prompt actualizado del usuario
- ✅ **Perfil del Usuario:** Obtiene información de la empresa

---

## 🔧 Instalación

1. **Importar el workflow en n8n:**
   - Abre n8n
   - Ve a "Workflows" → "Import from File"
   - Selecciona `Elina V4 Simulacion.json`
   - Activa el workflow

2. **Verificar el webhook:**
   - El webhook estará disponible en: `https://n8n-n8n.mcjhhb.easypanel.host/webhook/elina-simulacion`
   - Verifica que esté activo en la pestaña "Production"

---

## 📡 Estructura del Request

El sistema de entrenamiento de prompts envía requests con esta estructura:

```json
{
  "isSimulation": true,
  "simulationUserId": "uuid-del-usuario",
  "data": {
    "key": {
      "remoteJid": "521SIMxxxxxxxx@s.whatsapp.net"
    },
    "message": {
      "conversation": "mensaje del usuario"
    }
  }
}
```

---

## 📤 Estructura del Response

El workflow retorna un JSON con esta estructura:

```json
{
  "success": true,
  "response": "Respuesta generada por el AI Agent",
  "simulation": true,
  "context_used": {
    "rag_messages": "Contexto de mensajes pasados:\n...",
    "has_rag": true
  },
  "timestamp": "2025-01-03T12:00:00.000Z"
}
```

---

## 🔄 Flujo del Workflow

```
Webhook Simulación
  ↓
Parsear Simulación (extrae userId, messageText, isSimulation)
  ↓
Obtener Prompt (desde tabla prompts)
  ↓
Obtener Perfil (desde tabla profiles)
  ↓
Preparar Texto (limpia y formatea el mensaje)
  ↓
RAG - Obtener Embedding (genera embedding del mensaje)
  ↓
RAG - Buscar Contexto (busca mensajes similares)
  ↓
RAG - Formatear Contexto (prepara contexto para el AI Agent)
  ↓
AI Agent (genera respuesta usando prompt + contexto + herramientas)
  ↓
Responder JSON (retorna respuesta como JSON)
```

---

## 🛠️ Nodos Principales

### **1. Webhook Simulación**
- **Path:** `elina-simulacion`
- **Método:** POST
- Recibe el request del sistema de entrenamiento

### **2. Parsear Simulación**
- Extrae `userId`, `messageText`, `isSimulation`
- Prepara datos para los siguientes nodos

### **3. Obtener Prompt**
- Obtiene el prompt actualizado del usuario desde `prompts.prompt_content`
- Este es el prompt que el usuario está entrenando

### **4. Obtener Perfil**
- Obtiene información del perfil del usuario
- Incluye: website, company_description, etc.

### **5. RAG - Obtener Embedding**
- Genera embedding del mensaje usando `smart-embedding-router`
- Modelo: `text-embedding-3-small`

### **6. RAG - Buscar Contexto**
- Busca mensajes similares en `chat_history`
- Usa `rag-with-fallback`
- Threshold: 0.7, Máximo 3 mensajes

### **7. RAG - Formatear Contexto**
- Formatea el contexto RAG para el AI Agent
- Limita a 200 caracteres por mensaje

### **8. AI Agent**
- Genera la respuesta usando:
  - Prompt personalizado del usuario
  - Contexto RAG
  - Herramienta `ver_productos`
- Modelo: Configurado en el nodo (por defecto usa el del workflow principal)

### **9. Responder JSON**
- Retorna la respuesta como JSON
- Incluye metadata del contexto usado

---

## 🔍 Diferencias con el Workflow Principal

| Característica | Workflow Principal | Workflow Simulación |
|----------------|-------------------|-------------------|
| Filtro de Suscripción | ✅ Sí | ❌ No |
| Filtro de Usuario Ignorado | ✅ Sí | ❌ No |
| Envío por WhatsApp | ✅ Sí (Evolution API) | ❌ No |
| Respuesta JSON | ❌ No | ✅ Sí |
| Guardar en chat_history | ✅ Sí | ❌ No (opcional) |
| RAG | ✅ Sí | ✅ Sí |
| Búsqueda de Productos | ✅ Sí | ✅ Sí |
| Promociones Inteligentes | ✅ Sí | ❌ No (simplificado) |
| Detección Crítica | ✅ Sí | ❌ No (simplificado) |

---

## 🐛 Debugging

### **Ver Logs:**
1. Abre el workflow en n8n
2. Ve a "Executions"
3. Revisa las ejecuciones recientes
4. Cada nodo muestra su input/output

### **Problemas Comunes:**

**1. Error: "No se pudo obtener el perfil"**
- Verifica que el `userId` sea válido
- Verifica que exista un registro en `profiles` con ese `id`

**2. Error: "No se pudo obtener el prompt"**
- Verifica que exista un registro en `prompts` con ese `user_id`
- El sistema de entrenamiento crea/actualiza el prompt antes de llamar al webhook

**3. Respuesta vacía**
- Verifica que el AI Agent tenga acceso a las herramientas
- Revisa los logs del nodo "AI Agent"

**4. RAG no encuentra contexto**
- Es normal si es la primera conversación
- El RAG solo encuentra contexto si hay mensajes anteriores similares

---

## 📝 Notas Importantes

- ⚠️ **Este workflow NO afecta el flujo principal:** Las conversaciones reales de WhatsApp siguen usando el workflow principal
- ✅ **Usa el mismo prompt:** El workflow usa el prompt actualizado del usuario
- ✅ **Incluye RAG:** Obtiene contexto de mensajes anteriores (si existen)
- ✅ **Herramientas disponibles:** `ver_productos` está disponible para el AI Agent
- 🔒 **Solo para simulación:** No envía mensajes reales por WhatsApp

---

## 🔄 Actualizaciones Futuras

Posibles mejoras:
- [ ] Agregar soporte para promociones inteligentes
- [ ] Agregar soporte para detección crítica
- [ ] Agregar opción para guardar en `chat_history` (opcional)
- [ ] Agregar más herramientas al AI Agent
- [ ] Mejorar logging y métricas

