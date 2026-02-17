# 📝 Resumen Ejecutivo: Cambios para Simulación

## 🎯 Objetivo
Convertir `Elina V4 (1).json` en versión simulación **SIN perder funcionalidades**.

---

## ✅ Cambios Mínimos Necesarios

### **1. Webhook (1 cambio)**
- **Nodo:** `Webhook1`
- **Cambio:** Path de `a/messages-upsert` → `elina-simulacion`

### **2. Eliminar Filtros (3 nodos)**
- **Eliminar conexión de:** `Get Subscription1` → `If2`
- **Eliminar conexión de:** `ignorar?1`
- **Conectar directamente:** `Webhook1` → `evolution_instance_name1` (bypass suscripción)
- **Conectar directamente:** `buscar contacto1` → `Create a row1` (bypass ignorar)

### **3. Cambiar Salidas (5 nodos)**
Reemplazar todos los nodos `Evolution API` por `Respond to Webhook`:

| Nodo Original | Tipo Nuevo | Response Body |
|--------------|-----------|---------------|
| `Enviar texto3` | `Respond to Webhook` | `{ success: true, response: $('Definir destinatario1').item.json['mensaje texto '], simulation: true }` |
| `Enviar imagem1` | `Respond to Webhook` | `{ success: true, response: $('Definir destinatario1').item.json['mensaje texto '], image_url: $('Definir destinatario1').item.json.url_imagen, simulation: true }` |
| `Enviar Video1` | `Respond to Webhook` | `{ success: true, response: $('Definir destinatario1').item.json['mensaje texto '], video_url: $('Definir destinatario1').item.json.urlVideo, simulation: true }` |
| `Enviar audio` | `Respond to Webhook` | `{ success: true, response: $('Definir destinatario1').item.json['mensaje texto '], audio_url: $('Convert text to speech').item.json.outputUrl, simulation: true }` |
| `Enviar PDF Cotización` | `Respond to Webhook` | `{ success: true, response: 'Cotización generada', quote_pdf_url: $('Crear Cotización').item.json.pdf_url, simulation: true }` |

---

## 🔄 Flujo Simplificado

### **ANTES (Elina V4 Normal):**
```
Webhook1 → Get Subscription1 → If2 → evolution_instance_name1 → ...
  → buscar contacto1 → ignorar?1 → Create a row1 → ...
  → AI Agent → Definir destinatario1 → Enviar texto3 (Evolution API)
```

### **DESPUÉS (Elina V4 Simulación):**
```
Webhook1 → evolution_instance_name1 → ...
  → buscar contacto1 → Create a row1 → ...
  → AI Agent → Definir destinatario1 → Respond to Webhook (JSON)
```

---

## 📋 Checklist Rápido

- [ ] Cambiar path del webhook a `elina-simulacion`
- [ ] Eliminar conexión `Get Subscription1` → `If2`
- [ ] Conectar `Webhook1` directamente a `evolution_instance_name1`
- [ ] Eliminar conexión `ignorar?1`
- [ ] Conectar `buscar contacto1` directamente a `Create a row1`
- [ ] Cambiar `Enviar texto3` a `Respond to Webhook`
- [ ] Cambiar `Enviar imagem1` a `Respond to Webhook`
- [ ] Cambiar `Enviar Video1` a `Respond to Webhook`
- [ ] Cambiar `Enviar audio` a `Respond to Webhook`
- [ ] Cambiar `Enviar PDF Cotización` a `Respond to Webhook`

**Total: 10 cambios**

---

## ⚠️ Importante

- ✅ **Mantiene TODO:** RAG, productos, promociones, detección crítica, cotizaciones, etc.
- ✅ **Solo cambia la salida:** JSON en lugar de WhatsApp
- ✅ **No afecta producción:** Puedes tener ambos workflows (normal y simulación)

---

## 🧪 Probar

**Request:**
```json
POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/elina-simulacion
{
  "isSimulation": true,
  "simulationUserId": "uuid-usuario",
  "data": {
    "key": { "remoteJid": "521SIM123@s.whatsapp.net" },
    "message": { "conversation": "Hola" }
  }
}
```

**Response esperado:**
```json
{
  "success": true,
  "response": "Respuesta de la IA...",
  "simulation": true
}
```

