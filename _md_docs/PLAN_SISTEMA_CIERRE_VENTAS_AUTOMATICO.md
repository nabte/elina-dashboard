# 🛒 Plan: Sistema de Cierre de Ventas Automático para Elina

## 📋 Resumen Ejecutivo

Sistema completo para que Elina pueda cerrar ventas automáticamente por WhatsApp, detectar cuándo necesita intervención humana, generar cotizaciones/pedidos, y crear PDFs. Incluye integración con Ryze para usuarios que tengan ambos sistemas.

---

## 🎯 Objetivos

1. **Cerrar ventas automáticamente** cuando el cliente está listo
2. **Detectar cuándo necesita humano** (ya tenemos base con detección crítica)
3. **Sistema de carrito/pedidos** para gestionar compras
4. **Generación de PDFs** de pedidos/cotizaciones
5. **Integración con Ryze** para usuarios premium
6. **Mejorar inteligencia del prompt** para evitar redundancias

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────┐
│                    ELINA (WhatsApp)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Sistema de Detección de Intención                   │
│     ├─ Detección de productos mencionados               │
│     ├─ Detección de cantidades                          │
│     ├─ Detección de intención de compra                 │
│     └─ Detección de necesidad de humano                 │
│                                                          │
│  2. Sistema de Carrito/Pedidos                          │
│     ├─ Carrito por contacto (en memoria + DB)           │
│     ├─ Gestión de productos y cantidades                │
│     ├─ Cálculo de totales                               │
│     └─ Estados: draft, pending, confirmed, cancelled    │
│                                                          │
│  3. Sistema de Cotizaciones                             │
│     ├─ Similar a Ryze pero simplificado                 │
│     ├─ Generación automática desde carrito              │
│     └─ Envío por WhatsApp                               │
│                                                          │
│  4. Cierre Automático de Ventas                        │
│     ├─ Confirmación de pedido                           │
│     ├─ Generación de orden                              │
│     └─ Notificación al usuario                          │
│                                                          │
│  5. Generación de PDFs                                  │
│     ├─ PDF de cotización                                │
│     ├─ PDF de pedido/orden                              │
│     └─ Envío por WhatsApp                                │
│                                                          │
│  6. Integración con Ryze (Opcional)                     │
│     ├─ Sincronización de productos                      │
│     ├─ Creación de cotizaciones en Ryze                 │
│     └─ Sincronización de pedidos                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Base de Datos (SQL)

### 1. Tabla: `cart_items` (Carrito de compras)

```sql
create table if not exists public.cart_items (
    id bigint generated always as identity primary key,
    contact_id bigint not null references public.contacts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    product_id bigint references public.products(id) on delete set null,
    product_sku text, -- Por si el producto se elimina
    product_name text not null,
    quantity numeric not null default 1,
    unit_price numeric not null,
    subtotal numeric not null, -- quantity * unit_price
    notes text, -- Notas del cliente sobre este item
    added_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null,
    unique(contact_id, product_id) -- Un producto solo una vez en el carrito
);
```

### 2. Tabla: `orders` (Órdenes/Pedidos)

```sql
create table if not exists public.orders (
    id text primary key, -- Formato: ORD-YYYYMMDD-001
    contact_id bigint not null references public.contacts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'draft', -- draft, pending, confirmed, cancelled, completed
    items jsonb not null, -- Array de items del carrito
    subtotal numeric not null,
    discount numeric default 0,
    tax numeric default 0,
    total numeric not null,
    payment_method text, -- efectivo, transferencia, tarjeta, credito
    payment_status text default 'pending', -- pending, partial, paid
    notes text, -- Notas del cliente
    shipping_address text,
    estimated_delivery timestamptz,
    confirmed_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz,
    cancelled_reason text,
    pdf_url text, -- URL del PDF generado
    ryze_quote_id text, -- ID de cotización en Ryze (si está integrado)
    metadata jsonb default '{}', -- Datos adicionales
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null
);
```

### 3. Tabla: `quotes` (Cotizaciones)

```sql
create table if not exists public.quotes (
    id text primary key, -- Formato: COT-YYYYMMDD-001
    contact_id bigint not null references public.contacts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'draft', -- draft, sent, accepted, rejected, expired
    items jsonb not null,
    subtotal numeric not null,
    discount numeric default 0,
    tax numeric default 0,
    total numeric not null,
    valid_until timestamptz, -- Fecha de expiración
    terms text, -- Términos y condiciones
    notes text,
    pdf_url text,
    ryze_quote_id text, -- ID en Ryze si está integrado
    sent_at timestamptz,
    accepted_at timestamptz,
    rejected_at timestamptz,
    metadata jsonb default '{}',
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null
);
```

### 4. Tabla: `product_extractions` (Extracción de productos mencionados)

```sql
create table if not exists public.product_extractions (
    id bigint generated always as identity primary key,
    contact_id bigint not null references public.contacts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    message_id bigint references public.chat_history(id),
    extracted_text text not null, -- Texto original del mensaje
    detected_products jsonb not null, -- Array de productos detectados
    confidence_score numeric(3,2), -- 0.00 a 1.00
    processed boolean default false,
    added_to_cart boolean default false,
    created_at timestamptz default timezone('utc', now()) not null
);
```

### 5. Tabla: `ryze_integrations` (Integración con Ryze)

```sql
create table if not exists public.ryze_integrations (
    user_id uuid primary key references auth.users(id) on delete cascade,
    ryze_user_id uuid, -- ID del usuario en Ryze
    ryze_organization_id uuid, -- ID de la organización en Ryze
    ryze_supabase_url text, -- URL de Supabase de Ryze
    ryze_api_key text, -- API key para autenticación
    sync_products boolean default true,
    sync_quotes boolean default true,
    sync_orders boolean default true,
    last_sync_at timestamptz,
    is_active boolean default true,
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null
);
```

---

## 🤖 Lógica de Detección y Cierre Automático

### Flujo de Conversación Inteligente

```
1. Cliente menciona producto/cantidad
   ↓
2. Sistema detecta y extrae:
   - Productos mencionados (SKU, nombre, cantidad)
   - Intención (pregunta, cotización, compra directa)
   ↓
3. Sistema consulta base de productos:
   - Verifica existencia
   - Obtiene precio
   - Verifica stock
   ↓
4. Sistema agrega al carrito automáticamente
   ↓
5. Sistema responde confirmando:
   - "He agregado X piezas de [Producto] a tu pedido"
   - Muestra resumen del carrito
   ↓
6. Sistema detecta intención de cierre:
   - "quiero comprar"
   - "preparar pedido"
   - "confirmar"
   - "dame precio final"
   ↓
7. Sistema genera cotización/pedido:
   - Calcula totales
   - Genera PDF
   - Envía por WhatsApp
   ↓
8. Sistema espera confirmación:
   - Si confirma → Crea orden
   - Si rechaza → Cancela
   - Si no responde → Envía recordatorio
```

### Mejora del Prompt para Evitar Redundancias

**Problema actual:** El asistente pregunta cosas que ya se mencionaron.

**Solución:** Agregar al prompt:

```
## 7. CONTEXT_AWARENESS (Conciencia de Contexto)

**Reglas de Memoria:**
- NO preguntes por información que YA se mencionó en la conversación
- Si el cliente dice "3 piezas CE285A", NO preguntes "¿cuántas piezas necesitas?"
- Si el cliente dice "es HP", NO preguntes "¿qué marca es tu impresora?"
- Revisa TODO el historial antes de hacer preguntas
- Si falta información crítica, pregunta SOLO por lo que falta
- Si ya tienes suficiente información, procede directamente

**Ejemplo de MAL comportamiento:**
- Cliente: "3 piezas CE285A"
- Asistente: "¿Cuántas piezas necesitas?" ❌

**Ejemplo de BUEN comportamiento:**
- Cliente: "3 piezas CE285A"
- Asistente: "Perfecto, 3 piezas de CE285A. ¿Es para impresora Canon o HP?" ✅
```

---

## 🔄 Integración con Ryze

### Flujo de Integración

1. **Usuario vincula Ryze:**
   - Configura credenciales en Elina
   - Se valida conexión
   - Se sincronizan productos inicialmente

2. **Sincronización de Productos:**
   - Elina consulta productos de Ryze
   - Crea/actualiza productos en Elina
   - Mantiene SKU como referencia

3. **Creación de Cotización:**
   - Cuando se genera cotización en Elina
   - Se crea también en Ryze (si está integrado)
   - Se guarda el ID de Ryze en `quotes.ryze_quote_id`

4. **Sincronización de Pedidos:**
   - Cuando se confirma orden en Elina
   - Se crea venta en Ryze (opcional)
   - Se actualiza stock en ambos sistemas

---

## 📄 Generación de PDFs

### Estructura del PDF

1. **Header:**
   - Logo de la empresa
   - Nombre de la empresa
   - Fecha y número de cotización/pedido

2. **Información del Cliente:**
   - Nombre
   - Teléfono
   - Dirección (si está disponible)

3. **Items:**
   - Tabla con productos
   - Cantidad, descripción, precio unitario, subtotal

4. **Totales:**
   - Subtotal
   - Descuentos
   - Impuestos
   - Total

5. **Footer:**
   - Términos y condiciones
   - Información de contacto
   - Válido hasta (para cotizaciones)

### Tecnología

- **Edge Function:** `generate-pdf`
- **Librería:** `pdfkit` o `puppeteer` (HTML a PDF)
- **Almacenamiento:** **Bunny.net** (NO Supabase Storage)
- **Estructura de carpetas:** `elina/{user_name}/pdfs/{tipo}/{archivo}.pdf`
  - Ejemplo: `elina/juan_perez/pdfs/quotes/COT-20251125-001.pdf`
  - Ejemplo: `elina/juan_perez/pdfs/orders/ORD-20251125-001.pdf`
- **Envío:** URL del PDF por WhatsApp (URL de Bunny CDN)

---

## 🎯 Estados y Flujos

### Estados del Carrito

- **active:** Carrito activo del contacto
- **converted:** Convertido a orden/cotización
- **abandoned:** Abandonado (sin actividad por X días)

### Estados de Orden

- **draft:** Borrador (en carrito)
- **pending:** Pendiente de confirmación
- **confirmed:** Confirmada por el cliente
- **cancelled:** Cancelada
- **completed:** Completada/entregada

### Estados de Cotización

- **draft:** Borrador
- **sent:** Enviada al cliente
- **accepted:** Aceptada (se convierte en orden)
- **rejected:** Rechazada
- **expired:** Expirada

---

## 🔧 Funciones SQL Necesarias

1. **`extract_products_from_message(p_message text, p_user_id uuid)`**
   - Extrae productos mencionados del texto
   - Busca coincidencias en base de productos
   - Retorna array de productos detectados

2. **`add_to_cart(p_contact_id bigint, p_product_id bigint, p_quantity numeric)`**
   - Agrega producto al carrito
   - Actualiza cantidad si ya existe
   - Calcula subtotal

3. **`get_cart_summary(p_contact_id bigint)`**
   - Retorna resumen del carrito
   - Calcula totales
   - Incluye productos y precios

4. **`create_quote_from_cart(p_contact_id bigint, p_valid_days int)`**
   - Crea cotización desde carrito
   - Genera ID único
   - Calcula totales

5. **`confirm_order_from_quote(p_quote_id text)`**
   - Convierte cotización en orden
   - Cambia estado
   - Notifica al usuario

6. **`sync_products_with_ryze(p_user_id uuid)`**
   - Sincroniza productos con Ryze
   - Crea/actualiza productos en Elina

---

## 🚀 Edge Functions Necesarias

1. **`extract-products`**
   - Usa IA para extraer productos de mensajes
   - Retorna productos detectados con confianza

2. **`generate-pdf`**
   - Genera PDF de cotización/pedido
   - Sube a Supabase Storage
   - Retorna URL

3. **`sync-ryze`**
   - Sincroniza datos con Ryze
   - Crea cotizaciones/órdenes en Ryze

4. **`close-sale`**
   - Procesa cierre de venta automático
   - Genera orden
   - Envía confirmación

---

## 📱 Frontend (UI)

### Nuevas Secciones

1. **Panel de Pedidos:**
   - Lista de órdenes
   - Filtros por estado
   - Vista de detalle

2. **Panel de Cotizaciones:**
   - Lista de cotizaciones
   - Envío de cotizaciones
   - Seguimiento

3. **Integración Ryze:**
   - Configuración de conexión
   - Sincronización manual
   - Estado de sincronización

4. **Mejora en Chats:**
   - Mostrar carrito activo
   - Botón "Ver carrito"
   - Botón "Generar cotización"

---

## 🔄 Flujo Completo de Ejemplo

### Escenario: Cliente compra 3 toners

```
1. Cliente: "Hola, necesito 3 toners CE285A"
   ↓
2. Sistema detecta:
   - Producto: CE285A
   - Cantidad: 3
   - Intención: compra
   ↓
3. Sistema busca producto en DB
   ↓
4. Sistema agrega al carrito automáticamente
   ↓
5. Asistente responde:
   "¡Perfecto! He agregado 3 piezas de toner CE285A a tu pedido.
   
   📦 Tu carrito:
   - 3x Toner CE285A: $450 c/u = $1,350
   
   Total: $1,350
   
   ¿Quieres que prepare tu cotización o tienes alguna pregunta?"
   ↓
6. Cliente: "Sí, prepara mi pedido"
   ↓
7. Sistema:
   - Genera cotización
   - Crea PDF
   - Envía por WhatsApp
   ↓
8. Cliente: "Confirmo"
   ↓
9. Sistema:
   - Crea orden
   - Actualiza stock
   - Notifica al usuario
   - Si tiene Ryze, sincroniza
```

---

## 📋 Checklist de Implementación

### Fase 1: Base de Datos
- [ ] Crear tabla `cart_items`
- [ ] Crear tabla `orders`
- [ ] Crear tabla `quotes`
- [ ] Crear tabla `product_extractions`
- [ ] Crear tabla `ryze_integrations`
- [ ] Crear funciones SQL

### Fase 2: Detección Inteligente
- [ ] Edge Function `extract-products`
- [ ] Mejorar prompt con CONTEXT_AWARENESS
- [ ] Trigger para detectar productos en mensajes
- [ ] Lógica de agregar al carrito automático

### Fase 3: Sistema de Carrito
- [ ] Frontend: Panel de carrito
- [ ] API: Agregar/quitar productos
- [ ] API: Obtener resumen
- [ ] Integración en chat

### Fase 4: Cotizaciones
- [ ] Frontend: Panel de cotizaciones
- [ ] Edge Function: Generar PDF
- [ ] Envío por WhatsApp
- [ ] Seguimiento de estado

### Fase 5: Cierre Automático
- [ ] Detección de intención de cierre
- [ ] Edge Function: `close-sale`
- [ ] Generación de orden
- [ ] Notificaciones

### Fase 6: Integración Ryze
- [ ] Frontend: Configuración
- [ ] Edge Function: `sync-ryze`
- [ ] Sincronización de productos
- [ ] Sincronización de cotizaciones

### Fase 7: Testing y Ajustes
- [ ] Pruebas de flujo completo
- [ ] Ajustes de prompt
- [ ] Optimización de detección
- [ ] Documentación

---

## 🎨 Mejoras al Prompt de Comportamiento

### Sección Nueva: CONTEXT_AWARENESS (Agregada al Wizard)

**IMPORTANTE:** Esta sección se agregará automáticamente cuando se crea el prompt desde el wizard, NO solo cuando se mejora manualmente.

```markdown
## 7. CONTEXT_AWARENESS (Conciencia de Contexto)

**Reglas de Memoria Conversacional:**

1. **NO REPITAS PREGUNTAS:**
   - Si el cliente ya mencionó una cantidad, NO preguntes de nuevo
   - Si el cliente ya mencionó una marca, NO preguntes de nuevo
   - Si el cliente ya mencionó un modelo, NO preguntes de nuevo
   - Si el cliente ya mencionó un producto, NO preguntes "¿qué producto necesitas?"

2. **REVISA EL HISTORIAL COMPLETO:**
   - Antes de hacer cualquier pregunta, revisa TODO el historial de la conversación
   - Identifica qué información YA tienes
   - Identifica qué información FALTA
   - Usa la información del historial para evitar redundancias

3. **PREGUNTA SOLO LO NECESARIO:**
   - Si tienes producto + cantidad + marca → Procede directamente
   - Si falta información crítica → Pregunta SOLO por lo que falta
   - Si tienes suficiente → Ofrece agregar al carrito o generar cotización

4. **CONFIRMACIÓN INTELIGENTE:**
   - En lugar de preguntar de nuevo, confirma lo que entendiste:
   - ❌ "¿Cuántas piezas necesitas?" (si ya lo dijo)
   - ✅ "Perfecto, 3 piezas de CE285A para HP. ¿Algo más?"

5. **PROACTIVIDAD:**
   - Si detectas intención de compra clara, ofrece directamente:
   - "¿Quieres que prepare tu cotización ahora?"
   - "¿Te agrego esto a tu pedido?"

6. **MENSAJES CONCISOS:**
   - Evita escribir párrafos largos cuando una frase corta es suficiente
   - Si el cliente pregunta "precio", responde directamente con el precio, no con un párrafo explicativo
   - Mantén las respuestas relevantes y al punto
```

**Implementación:** Se agregará automáticamente en `buildPromptFromAnswers()` del wizard.

---

## 🔐 Seguridad y Permisos

- **RLS en todas las tablas:** Solo el usuario puede ver sus datos
- **Validación de productos:** Verificar existencia y stock antes de agregar
- **Límites de carrito:** Máximo X items o Y valor total
- **Validación de precios:** No permitir cambios de precio sin autorización

---

## 📊 Métricas y Analytics

- Carritos abandonados
- Tasa de conversión (carrito → orden)
- Tiempo promedio de cierre
- Productos más vendidos
- Valor promedio de pedido

---

## 🔄 Integración con n8n

### ¿Necesitamos n8n?

**SÍ, pero de forma limitada:**

1. **Webhook de mensajes entrantes** (ya existe)
   - n8n recibe mensajes de WhatsApp
   - Llama a Edge Function para procesar
   - Edge Function detecta productos y agrega al carrito
   - Edge Function genera respuesta con IA
   - n8n envía respuesta por WhatsApp

2. **Envío de mensajes con PDFs** (nuevo)
   - Cuando se genera PDF, se envía URL por WhatsApp
   - n8n maneja el envío del mensaje con archivo

3. **Notificaciones** (ya existe)
   - Cuando se confirma pedido
   - Cuando se necesita atención humana

### Flujo con n8n

```
WhatsApp → n8n (webhook) → Edge Function (procesar) → Supabase (guardar) → IA (generar respuesta) → n8n (enviar) → WhatsApp
```

**Ventaja:** n8n ya maneja la conexión con WhatsApp (Evolution API), solo necesitamos que llame a nuestras Edge Functions.

---

## 🚨 Lo que FALTA para un Caso Práctico Real

### 1. **Webhook de Mensajes Entrantes** ✅ (Ya existe)
- n8n recibe mensajes de WhatsApp
- **Falta:** Llamar a Edge Function para procesar productos

### 2. **Procesamiento Automático de Mensajes** ❌ (Falta)
- Edge Function que:
  - Recibe mensaje entrante
  - Extrae productos mencionados
  - Agrega al carrito automáticamente
  - Genera respuesta inteligente
  - Retorna respuesta para enviar

### 3. **Base de Productos Completa** ⚠️ (Parcial)
- Ya existe tabla `products`
- **Falta:** Mejorar búsqueda por SKU, nombre, sinónimos
- **Falta:** Sincronización con Ryze (si está integrado)

### 4. **Sistema de Carrito Persistente** ❌ (Falta)
- Carrito que sobrevive entre sesiones
- Carrito visible en el chat
- Botones para gestionar carrito

### 5. **Generación de PDFs** ❌ (Falta)
- Edge Function para generar PDFs
- Subida a Bunny.net con estructura correcta
- Envío por WhatsApp

### 6. **Confirmación de Pedidos** ❌ (Falta)
- Sistema para que cliente confirme pedido
- Botones de WhatsApp (si es posible) o confirmación por texto
- Actualización de stock

### 7. **Notificaciones al Usuario** ⚠️ (Parcial)
- Ya existe sistema de notificaciones
- **Falta:** Notificar cuando se confirma pedido
- **Falta:** Notificar cuando se necesita atención

### 8. **Gestión de Stock** ⚠️ (Parcial)
- Ya existe campo `stock` en productos
- **Falta:** Validar stock antes de agregar al carrito
- **Falta:** Actualizar stock al confirmar pedido
- **Falta:** Notificar cuando no hay stock

### 9. **Manejo de Precios** ⚠️ (Parcial)
- Ya existe campo `price` en productos
- **Falta:** Descuentos por cantidad
- **Falta:** Precios especiales por cliente
- **Falta:** Sincronización con Ryze (listas de precios)

### 10. **Integración con Métodos de Pago** ❌ (Falta)
- Link de pago (Stripe, Mercado Pago, etc.)
- Confirmación de pago
- Actualización de estado de orden

### 11. **Seguimiento de Pedidos** ❌ (Falta)
- Estados: pendiente, en preparación, enviado, entregado
- Notificaciones de cambios de estado
- Código de seguimiento

### 12. **Reportes y Analytics** ❌ (Falta)
- Ventas por día/semana/mes
- Productos más vendidos
- Carritos abandonados
- Tasa de conversión

---

## 📋 Checklist de Implementación Actualizado

### Fase 1: Base de Datos
- [ ] Crear tabla `cart_items`
- [ ] Crear tabla `orders`
- [ ] Crear tabla `quotes`
- [ ] Crear tabla `product_extractions`
- [ ] Crear tabla `ryze_integrations`
- [ ] Crear funciones SQL
- [ ] Agregar índices para búsqueda rápida de productos

### Fase 2: Mejora del Prompt (Wizard)
- [ ] Agregar sección CONTEXT_AWARENESS al `buildPromptFromAnswers()`
- [ ] Probar generación de prompt desde wizard
- [ ] Verificar que se incluye en todos los prompts nuevos

### Fase 3: Detección Inteligente
- [ ] Edge Function `extract-products`
- [ ] Mejorar búsqueda de productos (SKU, nombre, sinónimos)
- [ ] Trigger para detectar productos en mensajes
- [ ] Lógica de agregar al carrito automático

### Fase 4: Sistema de Carrito
- [ ] Frontend: Panel de carrito
- [ ] API: Agregar/quitar productos
- [ ] API: Obtener resumen
- [ ] Integración en chat (mostrar carrito activo)
- [ ] Persistencia entre sesiones

### Fase 5: Cotizaciones
- [ ] Frontend: Panel de cotizaciones
- [ ] Edge Function: Generar PDF (usando Bunny.net)
- [ ] Edge Function: Subir PDF a Bunny.net con estructura `elina/{user_name}/pdfs/quotes/`
- [ ] Envío por WhatsApp (via n8n)
- [ ] Seguimiento de estado

### Fase 6: Cierre Automático
- [ ] Detección de intención de cierre
- [ ] Edge Function: `close-sale`
- [ ] Generación de orden
- [ ] Actualización de stock
- [ ] Notificaciones

### Fase 7: Integración Ryze
- [ ] Frontend: Configuración
- [ ] Edge Function: `sync-ryze`
- [ ] Sincronización de productos
- [ ] Sincronización de cotizaciones
- [ ] Sincronización de pedidos

### Fase 8: n8n Workflows
- [ ] Workflow: Procesar mensaje entrante → Extraer productos → Agregar carrito → Generar respuesta
- [ ] Workflow: Enviar cotización con PDF
- [ ] Workflow: Confirmar pedido
- [ ] Workflow: Notificaciones

### Fase 9: Validaciones y Seguridad
- [ ] Validar stock antes de agregar
- [ ] Validar precios
- [ ] Límites de carrito
- [ ] Manejo de errores

### Fase 10: Testing y Ajustes
- [ ] Pruebas de flujo completo
- [ ] Ajustes de prompt
- [ ] Optimización de detección
- [ ] Documentación

---

## 🚀 Próximos Pasos

1. **Revisar y aprobar este plan**
2. **Crear archivos SQL con las tablas**
3. **Crear Edge Functions** (extract-products, generate-pdf, close-sale, sync-ryze)
4. **Actualizar wizard** para incluir CONTEXT_AWARENESS
5. **Crear workflows n8n** para procesamiento automático
6. **Implementar frontend**
7. **Testing completo**
8. **Documentación final**

---

**¿Listo para empezar la implementación?** 🎉

