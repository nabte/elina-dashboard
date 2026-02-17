# 🔧 Workflow de Simulación Elina V4

## 🎯 Objetivo

**NOTA:** Este documento está obsoleto. Ahora usamos un workflow separado: `Elina V4 Simulacion.json`

Ver la guía completa en: `GUIA_WORKFLOW_SIMULACION.md`

---

## 📋 Resumen

En lugar de modificar el workflow principal, creamos un **workflow separado y simplificado** específicamente para simulación:

- ✅ **Sin filtros innecesarios:** No verifica suscripción ni usuario ignorado
- ✅ **Respuesta JSON:** Retorna JSON en lugar de enviar por WhatsApp
- ✅ **Logs mejorados:** Estructura JSON con información de contexto
- ✅ **No satura automatización:** Workflow independiente del principal

---

## 🔄 Workflow Principal vs Simulación

| Aspecto | Workflow Principal | Workflow Simulación |
|---------|-------------------|-------------------|
| Archivo | `Elina V4 (1).json` | `Elina V4 Simulacion.json` |
| Webhook | `/webhook/a/messages-upsert` | `/webhook/elina-simulacion` |
| Filtros | ✅ Suscripción, Ignorar | ❌ Sin filtros |
| Respuesta | WhatsApp (Evolution API) | JSON (Respond to Webhook) |
| Uso | Producción | Testing/Simulación |

---

## 📝 Documentación Completa

Ver `GUIA_WORKFLOW_SIMULACION.md` para:
- Instrucciones de instalación
- Estructura de requests/responses
- Flujo completo del workflow
- Guía de debugging

---

## 📍 Punto de Modificación

**Ubicación:** Después del nodo que genera la respuesta de la IA (antes de enviar por WhatsApp)

**Nodo a modificar:** El nodo que envía la respuesta por WhatsApp (probablemente un nodo de Evolution API o HTTP Request)

---

## 🔧 Paso 1: Detectar Simulación

Agregar un nodo **IF** después de obtener la respuesta de la IA para detectar si es una simulación:

### **Nodo: IF - ¿Es Simulación?**

**Tipo:** `IF`

**Configuración:**
- **Condition:** `Boolean`
- **Value 1:** `={{ $('Webhook1').item.json.body.isSimulation || false }}`
- **Value 2:** `true`

**Conexiones:**
- **TRUE (es simulación):** → Nodo "Responder JSON Simulación"
- **FALSE (no es simulación):** → Continuar flujo normal (enviar por WhatsApp)

---

## 🔧 Paso 2: Crear Nodo de Respuesta JSON

### **Nodo: Responder JSON Simulación**

**Tipo:** `Respond to Webhook` (o `HTTP Response`)

**Configuración:**
- **Response Code:** `200`
- **Response Body:** `JSON`
- **Response Body Content:**
```json
{
  "success": true,
  "response": "={{ $('AI Agent1').item.json.output || $('AI Agent1').item.json.text || $('AI Agent1').item.json.message }}",
  "simulation": true,
  "context_used": {
    "rag_messages": "={{ $('3. RAG - Formatear Contexto').item.json.context || 'N/A' }}",
    "promotions": "={{ $('Buscar Promociones Activas').item.json.promotions || [] }}",
    "critical_detected": "={{ $('Detectar Intención Crítica').item.json.is_critical || false }}"
  }
}
```

**Nota:** Ajusta los nombres de los nodos según tu workflow actual.

---

## 🔧 Paso 3: Modificar el Flujo Normal

Asegúrate de que el flujo normal (cuando NO es simulación) continúe funcionando igual que antes, enviando la respuesta por WhatsApp.

---

## 📋 Estructura del Body de Simulación

Cuando el sistema de entrenamiento de prompts llama al webhook, envía:

```json
{
  "event": "messages.upsert",
  "instance": "nombre_instancia",
  "apikey": "api_key",
  "isSimulation": true,
  "simulationUserId": "uuid_del_usuario",
  "data": {
    "key": {
      "remoteJid": "521SIMxxxxxxxx@s.whatsapp.net",
      ...
    },
    "message": {
      "conversation": "mensaje del usuario"
    }
  }
}
```

---

## ✅ Resultado Esperado

Cuando `isSimulation=true`:
1. ✅ El workflow procesa el mensaje normalmente
2. ✅ Obtiene contexto RAG
3. ✅ Detecta críticos (si aplica)
4. ✅ Busca promociones
5. ✅ Genera respuesta con IA Agent
6. ✅ **Retorna JSON** en lugar de enviar por WhatsApp

Cuando `isSimulation=false` o no existe:
1. ✅ El workflow funciona normalmente
2. ✅ Envía la respuesta por WhatsApp

---

## 🔍 Verificación

Para verificar que funciona:

1. Desde el sistema de entrenamiento de prompts, envía un mensaje de prueba
2. El workflow debe retornar un JSON con la respuesta
3. El sistema de entrenamiento debe mostrar la respuesta en el chat de simulación

---

## 📝 Notas Importantes

- ⚠️ **No afecta el flujo normal:** Las conversaciones reales de WhatsApp siguen funcionando igual
- ✅ **Usa el mismo prompt:** El workflow usa el prompt actualizado del usuario
- ✅ **Incluye todas las capacidades:** RAG, promociones, detección crítica, etc.
- 🔒 **Seguridad:** Verifica que `simulationUserId` coincida con el usuario autenticado

