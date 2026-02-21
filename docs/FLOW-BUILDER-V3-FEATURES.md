# Flow Builder V3 - Nuevas Características

## 🎯 Mejoras Implementadas

### 1. **Selector de Productos Inteligente**

#### Antes (V2):
```javascript
products: 'auto_detect' // Simple auto-detección
```

#### Ahora (V3):
```javascript
products: 'recommended', // Usa productos recomendados
product_priority: 'ai_confidence', // IA decide por nivel de confianza
recommended_products: [9531, 9532] // IDs de productos seleccionados
```

#### ¿Cómo Funciona?
1. Al seleccionar un template, aparece un modal
2. Usuario selecciona 1 o varios productos relacionados al flow
3. Durante la ejecución, la IA analiza la conversación
4. IA asigna un "nivel de confianza" a cada producto según contexto
5. Se usa el producto con mayor confianza

#### Ejemplo Práctico:
**Flow de Diseño con 3 productos recomendados:**
- Llaveros 3D ($25)
- Diseño Gráfico ($350)
- Página Web ($4,500)

**Conversación 1:**
Cliente: "Quiero llaveros personalizados"
→ IA detecta: "llaveros" (95% confianza) → Usa Llaveros 3D

**Conversación 2:**
Cliente: "Necesito un diseño para mi logo"
→ IA detecta: "diseño" + "logo" (92% confianza) → Usa Diseño Gráfico

**Conversación 3:**
Cliente: "Quiero una web para mi negocio"
→ IA detecta: "web" + "negocio" (98% confianza) → Usa Página Web

### 2. **Variables Documentadas (Placeholders)**

#### Modal de Ayuda de Variables

Cuando el usuario edita un mensaje con placeholders, aparece un botón "📋 Variables Disponibles" que muestra:

```
┌─────────────────────────────────────────────┐
│ Variables Disponibles                       │
├─────────────────────────────────────────────┤
│                                             │
│ 🟣 Variables del Flow                       │
│   {{contact_name}}                          │
│   Nombre del contacto                       │
│   Ejemplo: Juan Pérez                       │
│                                             │
│   {{contact_phone}}                         │
│   Teléfono del contacto                     │
│   Ejemplo: +52 999 123 4567                 │
│                                             │
│ 💳 Datos de Pago                            │
│   {{bank_name}}                             │
│   Nombre del banco                          │
│   Ejemplo: BBVA México                      │
│   📍 Origen: profiles.payment_info          │
│                                             │
│   {{bank_account}}                          │
│   Número de cuenta                          │
│   Ejemplo: 0123456789                       │
│   📍 Origen: profiles.payment_info          │
│                                             │
│   {{total_estimate}}                        │
│   Total de la cotización                    │
│   Ejemplo: $1,250.00                        │
│                                             │
│ 🔍 Variables Recolectadas                   │
│   (Del paso 2)                              │
│   {{cantidad}}                              │
│   Cantidad solicitada                       │
│                                             │
│   (Del paso 4)                              │
│   {{analisis_diseno}}                       │
│   Análisis de la imagen con IA              │
│                                             │
└─────────────────────────────────────────────┘
```

#### Funcionalidades:
- ✅ **Copia rápida:** Click en una variable para copiarla
- ✅ **Búsqueda:** Filtro para encontrar variables
- ✅ **Origen visible:** Muestra de dónde viene cada dato
- ✅ **Ejemplos:** Muestra cómo se verá el valor final
- ✅ **Dinámico:** Se actualiza según los pasos anteriores

#### Vista en el Editor:

```
┌────────────────────────────────────────────┐
│ Mensaje de Pago                            │
├────────────────────────────────────────────┤
│                                            │
│ 💰 Total: {{total_estimate}}              │
│                                            │
│ Para confirmar tu pedido:                  │
│ 🏦 Banco: {{bank_name}}                    │
│ 💳 Cuenta: {{bank_account}}                │
│ 👤 Titular: {{account_holder}}             │
│                                            │
│ [📋 Variables Disponibles]  [👁️ Preview]   │
└────────────────────────────────────────────┘
```

Al hacer click en "Preview", muestra:

```
┌────────────────────────────────────────────┐
│ Vista Previa del Mensaje                   │
├────────────────────────────────────────────┤
│                                            │
│ 💰 Total: $1,250.00                        │
│                                            │
│ Para confirmar tu pedido:                  │
│ 🏦 Banco: BBVA México                      │
│ 💳 Cuenta: 0123456789                      │
│ 👤 Titular: Ismael Nabte                   │
│                                            │
└────────────────────────────────────────────┘
```

### 3. **Toggle IA / Exacto por Mensaje**

#### ¿Qué es?

Cada paso que soporta contenido de texto tiene un **toggle** para decidir:

**📝 Modo Exacto (OFF):** El mensaje se envía TAL CUAL está escrito
**🤖 Modo IA (ON):** La IA usa el mensaje como "inspiración" y lo adapta al contexto

#### Ejemplo Visual:

```
┌─────────────────────────────────────────────┐
│ Paso 1: Mensaje de Bienvenida              │
├─────────────────────────────────────────────┤
│                                             │
│ Contenido:                                  │
│ ¡Hola! Bienvenido, veo que te interesan    │
│ los llaveros personalizados.                │
│                                             │
│ [🤖 Modo IA]  ◄──── Toggle Switch           │
│                                             │
│ ⓘ La IA usará este mensaje como            │
│   inspiración y lo adaptará al contexto     │
│   de la conversación                        │
└─────────────────────────────────────────────┘
```

#### Comparación:

**Texto Original:**
```
"¡Hola! Bienvenido, veo que te interesan los llaveros personalizados."
```

**Modo Exacto (📝):**
```
Cliente: "Quiero llaveros"
Bot: "¡Hola! Bienvenido, veo que te interesan los llaveros personalizados."

Cliente: "Necesito diseño para tarjetas"
Bot: "¡Hola! Bienvenido, veo que te interesan los llaveros personalizados."
(❌ Mismo mensaje, no hace sentido)
```

**Modo IA (🤖):**
```
Cliente: "Quiero llaveros"
Bot: "¡Hola! Perfecto, veo que te interesan los llaveros personalizados. ¿Cuántas piezas necesitas?"

Cliente: "Necesito diseño para tarjetas"
Bot: "¡Hola! Genial, te ayudaré con el diseño de tarjetas. Cuéntame más sobre tu proyecto."
(✅ Adaptado al contexto)
```

#### Cuándo Usar Cada Modo:

| Situación | Modo Recomendado | Razón |
|-----------|------------------|-------|
| Mensajes con datos sensibles (pago, confirmaciones) | 📝 Exacto | Seguridad y precisión |
| Preguntas específicas (¿cuántas piezas?) | 📝 Exacto | Claridad |
| Saludos y bienvenidas | 🤖 IA | Personalización |
| Explicaciones de servicios | 🤖 IA | Contexto dinámico |
| Mensajes con placeholders {{}} | 📝 Exacto | Los placeholders se reemplazan tal cual |

#### Implementación en el Editor:

```javascript
{
    id: 'welcome',
    type: 'message',
    content: '¡Hola! Bienvenido...',
    ai_mode: true  // ◄── Nuevo campo
}
```

#### Indicador Visual en la Tarjeta:

```
┌─────────────────────────────────┐
│ 1️⃣ Enviar Mensaje               │
│                                 │
│ 🤖 IA Adaptativo                │
│ "¡Hola! Bienvenido..."          │
│                                 │
│ [✏️ Editar]  [📋]  [🗑️]         │
└─────────────────────────────────┘

vs.

┌─────────────────────────────────┐
│ 4️⃣ Enviar Mensaje               │
│                                 │
│ 📝 Mensaje Exacto               │
│ "Total: {{total_estimate}}"     │
│                                 │
│ [✏️ Editar]  [📋]  [🗑️]         │
└─────────────────────────────────┘
```

### 4. **Simulador con IA Real**

#### Botón "🎬 Simular con IA"

En la vista previa, en lugar de mensajes estáticos, hay un botón que inicia una **simulación real**:

```
┌─────────────────────────────────────────────┐
│ Vista Previa                                │
├─────────────────────────────────────────────┤
│                                             │
│ [📱 Vista Simple] [🎬 Simular con IA] ◄──── │
│                                             │
│ Modo Simple:                                │
│ • Muestra pasos estáticos                   │
│ • Preview rápida                            │
│                                             │
│ Modo Simulador:                             │
│ • IA interpreta cada paso                   │
│ • Conversación realista                     │
│ • Prueba el flow completo                   │
└─────────────────────────────────────────────┘
```

#### ¿Cómo Funciona el Simulador?

1. **Click en "Simular con IA"**
2. Aparece un chat real simulado
3. La IA actúa como el bot (usando los pasos del flow)
4. Tú actúas como el cliente
5. La IA procesa cada paso según el modo (Exacto/IA)

#### Ejemplo de Simulación:

```
┌─────────────────────────────────────────────┐
│ Simulador IA - Flow: Llaveros 3D           │
├─────────────────────────────────────────────┤
│                                             │
│ 🤖 Bot (Paso 1 - IA):                       │
│ ¡Hola! Veo que te interesan los llaveros   │
│ personalizados. ¿En qué puedo ayudarte?     │
│                                             │
│ 👤 Tú:                                      │
│ [Quiero 50 llaveros con mi logo]            │
│                                             │
│ 🤖 Bot (Paso 2 - Exacto):                   │
│ Perfecto. ¿Cuántas piezas necesitas?        │
│                                             │
│ 👤 Tú:                                      │
│ [50]                                        │
│                                             │
│ 🤖 Bot (Validando...):                      │
│ ✓ Número válido: 50                         │
│                                             │
│ 🤖 Bot (Paso 3 - IA):                       │
│ Genial! Para crear tu diseño personalizado, │
│ envíame una imagen de tu logo               │
│                                             │
│ 👤 Tú:                                      │
│ [📷 Subir imagen]                           │
│                                             │
│ 🤖 Bot (Analizando imagen con Vision AI...):│
│ ⏳ Procesando...                            │
│                                             │
│ 🤖 Bot (Paso 4 - Read Image):               │
│ He analizado tu logo. Es un diseño          │
│ moderno con colores azul y blanco...        │
│                                             │
│ 🤖 Bot (Paso 5 - Create Quote):             │
│ 📋 Cotización:                              │
│ Producto: Llaveros 3D Personalizados        │
│ Cantidad: 50 piezas                         │
│ Precio unitario: $25.00                     │
│ Total: $1,250.00                            │
│                                             │
│ 🤖 Bot (Paso 6 - Exacto):                   │
│ 💰 Total: $1,250.00                         │
│                                             │
│ Para confirmar:                             │
│ 🏦 Banco: BBVA México                       │
│ 💳 Cuenta: 0123456789                       │
│ 👤 Titular: Ismael Nabte                    │
│                                             │
│ [Detener Simulación] [Reiniciar]            │
└─────────────────────────────────────────────┘
```

#### Ventajas del Simulador:

- ✅ **Test realista:** Prueba el flow antes de activar
- ✅ **Detecta errores:** Ve si algo no fluye bien
- ✅ **Valida lógica:** Prueba condiciones y validaciones
- ✅ **Ve la diferencia IA/Exacto:** Compara modos en tiempo real
- ✅ **Testing de variables:** Ve cómo se reemplazan los placeholders

### 5. **Indicadores Visuales Mejorados**

#### En las Tarjetas de Paso:

```
┌─────────────────────────────────────────────┐
│ 1️⃣ 💬 Enviar Mensaje                        │
│                                             │
│ 🤖 Modo IA                                  │ ◄── Badge
│ "¡Hola! Bienvenido..."                      │
│                                             │
│ Variables usadas:                           │
│ • {{contact_name}}                          │ ◄── Auto-detectadas
│ • {{cantidad}}                              │
│                                             │
│ [✏️ Editar]  [📋 Duplicar]  [🗑️ Eliminar]   │
└─────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────┐
│ 5️⃣ 📄 Crear Cotización                      │
│                                             │
│ 🛍️ Productos Recomendados:                  │
│ • Llaveros 3D ($25)                         │ ◄── Lista de productos
│ • Diseño Gráfico ($350)                     │
│                                             │
│ 🤖 IA decide según contexto                 │ ◄── Indicador de lógica
│                                             │
│ [✏️ Editar]  [📋 Duplicar]  [🗑️ Eliminar]   │
└─────────────────────────────────────────────┘
```

### 6. **Tooltips y Ayuda Contextual**

#### Hover en Toggle IA/Exacto:

```
[🤖 Modo IA]  ◄── Hover muestra:
     ↓
┌─────────────────────────────────────────┐
│ La IA usará este mensaje como          │
│ inspiración y lo adaptará al contexto.  │
│                                         │
│ Ejemplo:                                │
│ Original: "¡Hola! Bienvenido"           │
│ IA: "¡Hola Juan! Veo que te interesan  │
│      los llaveros personalizados"       │
└─────────────────────────────────────────┘
```

#### Hover en Productos Recomendados:

```
[🛍️ 3 productos]  ◄── Hover muestra:
     ↓
┌─────────────────────────────────────────┐
│ La IA analizará la conversación y      │
│ elegirá el producto más relevante:     │
│                                         │
│ • Llaveros 3D                           │
│ • Diseño Gráfico                        │
│ • Página Web                            │
│                                         │
│ Click para editar selección             │
└─────────────────────────────────────────┘
```

### 7. **Configuración en Supabase**

#### Estructura en `payment_info`:

Los placeholders de pago se obtienen de `profiles.payment_info`:

```sql
-- Ejemplo de payment_info configurado
{
  "bank_name": "BBVA México",
  "bank_account": "0123456789",
  "account_holder": "Ismael Nabte",
  "clabe": "012345678901234567",
  "paypal_email": "ismanabte@gmail.com",
  "qr_code_url": "https://tu-dominio.com/qr-pago.png",
  "business_name": "Nabte Development"
}
```

#### Botón de Configuración Rápida:

En el editor de `send_payment_info`, hay un botón:

```
[⚙️ Configurar Datos de Pago]
     ↓
Abre modal para editar `payment_info`
directamente desde el flow builder
```

---

## 📊 Comparación V2 vs V3

| Característica | V2 | V3 |
|----------------|----|----|
| Selector de Productos | Auto-detección simple | Productos recomendados + IA inteligente |
| Placeholders | No documentados | Modal de ayuda + tooltips + ejemplos |
| Comportamiento Mensajes | Siempre exactos | Toggle IA/Exacto por paso |
| Vista Previa | Estática | Simulador con IA real |
| Variables | Ocultas | Visibles con origen y ejemplos |
| Indicadores | Básicos | Completos con badges y tooltips |

---

## 🚀 Próximos Pasos

Para activar Flow Builder V3:

1. Actualizar `prompt-training.js` líneas 800 y 855:
   ```javascript
   import('./flow-builder-v3.js')  // Cambiar de v2 a v3
   ```

2. Configurar `payment_info` en Supabase para usuario nabte (ya está hecho)

3. Recargar dashboard

4. Probar templates con productos

---

## 🐛 Debug

Todos los logs del Flow Builder V3 tienen el prefijo:
```
[Flow Builder V3]
```

Busca en la consola para debugging.
