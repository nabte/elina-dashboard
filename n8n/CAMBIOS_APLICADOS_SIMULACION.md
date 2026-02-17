# ✅ Cambios Aplicados al Workflow de Simulación

## 📋 Archivo Generado
`Elina V4 Simulacion COMPLETO.json` - Workflow completo basado en Elina V4 adaptado para simulación

---

## ✅ Cambios Aplicados

### **1. Webhook de Entrada**
- ✅ **Path cambiado:** `a/messages-upsert` → `elina-simulacion`
- ✅ **Webhook ID:** `elina-simulacion-completo`
- ✅ **Nombre del workflow:** "Elina V4 Simulación Completo"

### **2. Nodo de Detección de Simulación**
- ✅ **Agregado:** Nodo "Detectar Simulación" después del webhook
- ✅ **Funcionalidad:** Extrae `isSimulation`, `simulationUserId`, `messageText`
- ✅ **Conexión:** Webhook1 → Detectar Simulación → evolution_instance_name1

### **3. Bypass de Filtros**
- ✅ **Suscripción:** evolution_instance_name1 ahora conecta directamente a buscar contacto1 (bypass Get Subscription1 e If2)
- ✅ **Usuario Ignorado:** Merge5 ahora conecta directamente a Create a row1 (bypass ignorar?1)

### **4. Nodos de Respuesta (Evolution API → Respond to Webhook)**
- ✅ **Enviar texto3** → **Responder JSON - Texto**
- ✅ **Enviar imagem1** → **Responder JSON - Imagen**
- ✅ **Enviar Video1** → **Responder JSON - Video**
- ✅ **Enviar audio** → **Responder JSON - Audio**
- ✅ **Enviar PDF Cotización** → **Responder JSON - PDF Cotización**

Todos los nodos ahora retornan JSON con estructura:
```json
{
  "success": true,
  "response": "...",
  "simulation": true,
  "message_type": "text|image|video|audio|document",
  "context_used": {
    "rag_messages": "...",
    "has_rag": true,
    "has_promotions": false,
    "critical_detected": false
  },
  "timestamp": "..."
}
```

---

## ⚠️ Ajustes Manuales Necesarios

### **1. Referencias a Webhook1 en Nodos**
Algunos nodos aún usan `$('Webhook1')` y pueden necesitar adaptación para simulación. Estos nodos funcionarán si el body del request de simulación tiene la misma estructura, pero podrían necesitar ajustes:

**Nodos que usan Webhook1:**
- `set text1` - Extrae texto del mensaje
- `buscar contacto1` - Busca contacto por phone_number
- `Create Contact1` - Crea contacto nuevo
- `Create a row1` - Guarda mensaje en chat_history
- Varios nodos de procesamiento de audio/imagen

**Solución:** El nodo "Detectar Simulación" prepara los datos, pero algunos nodos pueden necesitar usar `$('Detectar Simulación')` en lugar de `$('Webhook1')` si hay problemas.

### **2. Nodos que Dependen de Estructura de Evolution API**
Algunos nodos esperan la estructura específica de Evolution API. Para simulación, el request debe tener estructura similar:

```json
{
  "isSimulation": true,
  "simulationUserId": "uuid",
  "data": {
    "key": {
      "remoteJid": "521SIMxxx@s.whatsapp.net"
    },
    "message": {
      "conversation": "mensaje"
    },
    "pushName": "Usuario Simulación"
  },
  "instance": "nombre_instancia",
  "apikey": "api_key"
}
```

### **3. Guardado en chat_history (Opcional)**
El workflow actual **NO guarda** mensajes en `chat_history` para simulación. Si quieres que se guarden:
- Modifica `Create a row1` para que también funcione con simulación
- O agrega condición `IF isSimulation === false` antes de guardar

---

## 🧪 Testing

### **Request de Prueba:**
```json
POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/elina-simulacion
{
  "isSimulation": true,
  "simulationUserId": "uuid-del-usuario",
  "data": {
    "key": {
      "remoteJid": "521SIM1234567890@s.whatsapp.net"
    },
    "message": {
      "conversation": "Hola, quiero información sobre productos"
    },
    "pushName": "Usuario de Simulación"
  },
  "instance": "nombre_instancia",
  "apikey": "api_key"
}
```

### **Response Esperado:**
```json
{
  "success": true,
  "response": "Respuesta generada por la IA...",
  "simulation": true,
  "message_type": "text",
  "context_used": {
    "rag_messages": "Contexto...",
    "has_rag": true,
    "has_promotions": false,
    "critical_detected": false
  },
  "timestamp": "2025-01-03T12:00:00.000Z"
}
```

---

## 📝 Notas Importantes

1. **Mantiene TODAS las funcionalidades:**
   - ✅ RAG (Memoria largo plazo)
   - ✅ Búsqueda de productos
   - ✅ Promociones inteligentes (si están integradas)
   - ✅ Detección crítica (si está integrada)
   - ✅ Cotizaciones
   - ✅ Procesamiento de audio/imagen/video
   - ✅ Placeholders de productos

2. **Solo cambia la salida:**
   - ❌ No envía por WhatsApp
   - ✅ Retorna JSON

3. **No afecta el workflow principal:**
   - El workflow original `Elina V4 (1).json` sigue intacto
   - Puedes tener ambos workflows activos simultáneamente

---

## 🔧 Si Hay Problemas

### **Error: "No se encuentra nodo X"**
- Verifica que todos los nodos referenciados existan
- Algunos nodos pueden tener nombres ligeramente diferentes

### **Error: "No se puede obtener datos de Webhook1"**
- Modifica el nodo para usar `$('Detectar Simulación')` en lugar de `$('Webhook1')`
- O ajusta el código para manejar ambos casos

### **Error: "Falta campo X"**
- Verifica que el request de simulación tenga todos los campos necesarios
- El nodo "Detectar Simulación" prepara los datos básicos, pero algunos nodos pueden necesitar más

---

## ✅ Checklist Final

- [x] Webhook path cambiado
- [x] Nodo "Detectar Simulación" agregado
- [x] Bypass de suscripción
- [x] Bypass de usuario ignorado
- [x] Todos los nodos de Evolution API cambiados a Respond to Webhook
- [ ] Probar con request de simulación
- [ ] Verificar que todos los nodos funcionen correctamente
- [ ] Ajustar referencias a Webhook1 si es necesario
- [ ] Verificar que el RAG funcione
- [ ] Verificar que la búsqueda de productos funcione
- [ ] Verificar que las cotizaciones funcionen

