# 📝 Detalles de Implementación: Sistema de Ventas Automático

## 🎯 Ajustes al Plan Original

### 1. Almacenamiento: Bunny.net

**Estructura de carpetas:**
```
bunnynet/elina/{user_name}/pdfs/quotes/{archivo}.pdf
bunnynet/elina/{user_name}/pdfs/orders/{archivo}.pdf
```

**Edge Function:** `generate-pdf`
- Genera PDF usando `pdfkit` o `puppeteer`
- Sube a Bunny.net usando la misma estructura que `bunny-upload`
- Retorna URL del CDN

### 2. Mejora del Prompt en Wizard

**Sección CONTEXT_AWARENESS agregada automáticamente** cuando se crea el prompt desde el wizard.

**Ubicación:** `app.js` → `buildPromptFromAnswers()`

Ya implementado ✅

---

## 🔄 n8n: ¿Necesario o No?

### ✅ SÍ, pero solo para:

1. **Recibir mensajes de WhatsApp** (ya existe)
2. **Enviar mensajes por WhatsApp** (ya existe)
3. **Procesar mensajes entrantes** (nuevo workflow)

### ❌ NO necesitamos n8n para:

- Detección de productos (Edge Function)
- Generación de PDFs (Edge Function)
- Gestión de carrito (Supabase)
- Cálculo de totales (Supabase)

### Workflow n8n Necesario

**Nombre:** `procesar-mensaje-ventas`

**Flujo:**
```
1. Webhook recibe mensaje de WhatsApp
   ↓
2. Llama Edge Function: extract-products
   - Extrae productos del mensaje
   - Retorna productos detectados
   ↓
3. Si hay productos detectados:
   - Llama Edge Function: add-to-cart
   - Agrega productos al carrito
   ↓
4. Genera respuesta con IA (smart-worker)
   - Incluye resumen del carrito
   - Ofrece generar cotización
   ↓
5. Envía respuesta por WhatsApp
```

---

## 🚨 Lo que FALTA para Caso Real

### Crítico (Debe estar para funcionar)

1. **✅ Webhook de mensajes entrantes** (Ya existe en n8n)
2. **❌ Procesamiento automático** (Edge Function `process-incoming-message`)
3. **❌ Extracción de productos** (Edge Function `extract-products`)
4. **❌ Sistema de carrito** (Tablas SQL + Frontend)
5. **❌ Generación de PDFs** (Edge Function `generate-pdf`)
6. **❌ Envío de PDFs por WhatsApp** (n8n workflow)

### Importante (Mejora la experiencia)

7. **❌ Confirmación de pedidos** (Botones o texto)
8. **❌ Validación de stock** (Antes de agregar al carrito)
9. **❌ Actualización de stock** (Al confirmar pedido)
10. **❌ Notificaciones al usuario** (Cuando se confirma pedido)

### Opcional (Nice to have)

11. **❌ Integración con métodos de pago** (Stripe, Mercado Pago)
12. **❌ Seguimiento de pedidos** (Estados, tracking)
13. **❌ Reportes y analytics** (Dashboard de ventas)
14. **❌ Descuentos automáticos** (Por cantidad, cliente)
15. **❌ Integración con Ryze** (Sincronización)

---

## 📦 Edge Functions Necesarias

### 1. `extract-products`
**Input:**
```json
{
  "message": "Necesito 3 toners CE285A",
  "user_id": "uuid",
  "contact_id": 123
}
```

**Output:**
```json
{
  "products": [
    {
      "product_id": 456,
      "sku": "CE285A",
      "name": "Toner CE285A",
      "quantity": 3,
      "confidence": 0.95
    }
  ]
}
```

### 2. `add-to-cart`
**Input:**
```json
{
  "contact_id": 123,
  "user_id": "uuid",
  "items": [
    {
      "product_id": 456,
      "quantity": 3
    }
  ]
}
```

**Output:**
```json
{
  "success": true,
  "cart_summary": {
    "items_count": 1,
    "subtotal": 1350,
    "total": 1350
  }
}
```

### 3. `generate-pdf`
**Input:**
```json
{
  "type": "quote", // o "order"
  "quote_id": "COT-20251125-001",
  "user_id": "uuid",
  "contact_id": 123,
  "items": [...],
  "totals": {...}
}
```

**Output:**
```json
{
  "pdf_url": "https://cdn.bunny.net/elina/juan_perez/pdfs/quotes/COT-20251125-001.pdf",
  "success": true
}
```

**Estructura en Bunny:**
- Usa `bunny-upload` como referencia
- Path: `elina/{user_name}/pdfs/{type}/{filename}.pdf`
- Obtener `user_name` desde `profiles.full_name` o `profiles.email`

### 4. `process-incoming-message`
**Input:**
```json
{
  "message": "Necesito 3 toners CE285A",
  "user_id": "uuid",
  "contact_id": 123,
  "message_id": 789
}
```

**Output:**
```json
{
  "response": "¡Perfecto! He agregado 3 piezas de toner CE285A...",
  "products_detected": [...],
  "cart_updated": true,
  "should_send_pdf": false
}
```

### 5. `sync-ryze` (Opcional)
**Input:**
```json
{
  "action": "sync_products" | "create_quote" | "create_order",
  "user_id": "uuid",
  "data": {...}
}
```

---

## 🔧 Ajustes en n8n

### Workflow Existente: `manual-send`
**No cambiar**, solo usar para envíos manuales.

### Nuevo Workflow: `process-incoming-message`

**Nodos:**
1. **Webhook** - Recibe mensaje de WhatsApp
2. **Code** - Parsea mensaje
3. **HTTP Request** - Llama `process-incoming-message` Edge Function
4. **IF** - ¿Hay productos detectados?
   - Sí → Agregar al carrito
   - No → Continuar
5. **HTTP Request** - Genera respuesta con IA (smart-worker)
6. **HTTP Request** - Envía respuesta por WhatsApp
7. **Respond** - Retorna éxito

### Nuevo Workflow: `send-quote-pdf`

**Nodos:**
1. **Webhook** - Recibe solicitud de cotización
2. **HTTP Request** - Llama `generate-pdf` Edge Function
3. **HTTP Request** - Envía mensaje con PDF por WhatsApp
4. **Respond** - Retorna éxito

---

## 📊 Flujo Completo Real

### Escenario: Cliente compra 3 toners

```
1. Cliente envía: "Necesito 3 toners CE285A"
   ↓
2. WhatsApp → n8n (webhook)
   ↓
3. n8n → Edge Function `process-incoming-message`
   ↓
4. Edge Function:
   - Extrae productos (CE285A, cantidad 3)
   - Busca en DB productos
   - Agrega al carrito automáticamente
   - Genera respuesta con IA
   ↓
5. Edge Function retorna:
   - Respuesta: "¡Perfecto! He agregado 3 piezas..."
   - Carrito actualizado
   ↓
6. n8n envía respuesta por WhatsApp
   ↓
7. Cliente: "Sí, prepara mi pedido"
   ↓
8. n8n → Edge Function `generate-pdf`
   - Genera PDF de cotización
   - Sube a Bunny.net: elina/{user}/pdfs/quotes/COT-XXX.pdf
   ↓
9. n8n envía PDF por WhatsApp
   ↓
10. Cliente: "Confirmo"
    ↓
11. n8n → Edge Function `close-sale`
    - Crea orden
    - Actualiza stock
    - Notifica al usuario
```

---

## ✅ Checklist Final

### Base de Datos
- [ ] Tablas SQL
- [ ] Funciones SQL
- [ ] Índices

### Edge Functions
- [ ] `extract-products`
- [ ] `add-to-cart`
- [ ] `generate-pdf` (con Bunny.net)
- [ ] `process-incoming-message`
- [ ] `close-sale`
- [ ] `sync-ryze` (opcional)

### Frontend
- [ ] Panel de carrito
- [ ] Panel de pedidos
- [ ] Panel de cotizaciones
- [ ] Integración Ryze (opcional)

### n8n Workflows
- [ ] `process-incoming-message`
- [ ] `send-quote-pdf`
- [ ] `confirm-order`

### Wizard
- [ ] CONTEXT_AWARENESS en prompt (✅ Ya hecho)

---

**¿Empezamos con la implementación?** 🚀

