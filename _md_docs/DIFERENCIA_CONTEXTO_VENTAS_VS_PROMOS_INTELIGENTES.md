# 📊 Diferencia entre Contexto de Ventas y Promociones Inteligentes

## 🎯 Resumen Ejecutivo

Ambas funcionalidades ayudan a mejorar las conversaciones de ventas, pero tienen propósitos y comportamientos diferentes:

- **Contexto de Ventas**: Contexto general que se aplica a TODAS las conversaciones
- **Promociones Inteligentes**: Promociones específicas que se insertan automáticamente cuando es relevante

---

## 📝 Contexto de Ventas (Sales Context)

### ¿Qué es?
Es un **prompt de contexto general** que se aplica a **todas las conversaciones** de WhatsApp. Funciona como un "manual de ventas" que la IA siempre tiene en cuenta.

### Características:
- ✅ **Aplicación global**: Se usa en todas las conversaciones
- ✅ **Contexto permanente**: Siempre está activo (si está marcado como activo)
- ✅ **Información general**: Incluye:
  - Promociones generales
  - Objeciones comunes y cómo manejarlas
  - Hooks de venta (ganchos para captar atención)
  - Fechas de expiración de ofertas generales
- ✅ **Un solo contexto activo**: Solo puede haber un contexto de ventas activo a la vez
- ✅ **Estructura JSON**: Se guarda como un objeto JSON con secciones específicas

### Ejemplo de uso:
```
Contexto de Ventas:
- Promoción: "Tenemos descuentos del 20% en todos los productos"
- Objeciones: "Si dicen que es caro, menciona que incluye garantía de 2 años"
- Hooks: "Menciona que somos la empresa #1 en el sector"
```

**Resultado**: La IA siempre tendrá esta información en mente en TODAS las conversaciones.

---

## 🎁 Promociones Inteligentes (Smart Promotions)

### ¿Qué es?
Son **promociones específicas** que se insertan automáticamente en conversaciones cuando la IA detecta que es el momento adecuado. Son más dinámicas y contextuales.

### Características:
- ✅ **Inserción automática**: La IA decide cuándo mencionarlas
- ✅ **Contextual**: Solo se insertan cuando es relevante para la conversación
- ✅ **Múltiples promociones**: Puedes tener varias promociones activas simultáneamente
- ✅ **Control de frecuencia**: Límite de menciones por día (ej: máximo 3 veces)
- ✅ **Calendario**: Puedes programar fechas de inicio y fin
- ✅ **Imágenes**: Puedes agregar imágenes a cada promoción
- ✅ **Tracking**: Se registra cuántas veces se ha mencionado cada promoción

### Ejemplo de uso:
```
Promoción 1: "2x1 en productos seleccionados"
- Activa del 1 al 15 de noviembre
- Máximo 3 menciones por día
- Se inserta cuando el cliente pregunta por precios

Promoción 2: "Envío gratis en compras mayores a $500"
- Sin horario definido (siempre activa)
- Máximo 5 menciones por día
- Se inserta cuando el cliente menciona envío
```

**Resultado**: La IA insertará estas promociones automáticamente cuando detecte que es el momento adecuado, sin que tengas que recordarle.

---

## 🔄 Comparación Directa

| Característica | Contexto de Ventas | Promociones Inteligentes |
|---------------|-------------------|-------------------------|
| **Aplicación** | Todas las conversaciones | Solo cuando es relevante |
| **Cantidad** | 1 activo a la vez | Múltiples simultáneas |
| **Inserción** | Siempre presente (contexto) | Automática y contextual |
| **Control de frecuencia** | No | Sí (máximo por día) |
| **Calendario** | Fecha de expiración general | Fechas de inicio y fin por promoción |
| **Imágenes** | No | Sí |
| **Tracking** | No | Sí (cuántas veces se mencionó) |
| **Estructura** | JSON con secciones | Campos individuales |
| **Uso principal** | Manual de ventas general | Ofertas específicas temporales |

---

## 💡 ¿Cuándo usar cada uno?

### Usa **Contexto de Ventas** cuando:
- ✅ Quieres establecer un "tono" o "estilo" general para todas las conversaciones
- ✅ Tienes información que debe estar siempre presente (ej: políticas de devolución)
- ✅ Quieres que la IA siempre tenga en cuenta ciertas objeciones comunes
- ✅ Tienes promociones generales que aplican siempre

### Usa **Promociones Inteligentes** cuando:
- ✅ Tienes ofertas temporales específicas (ej: "Black Friday", "Navidad")
- ✅ Quieres promociones que se mencionen solo cuando es relevante
- ✅ Necesitas controlar cuántas veces se menciona cada promoción
- ✅ Quieres promociones con imágenes
- ✅ Tienes múltiples promociones diferentes que quieres activar simultáneamente

---

## 🎯 Ejemplo Práctico Combinado

### Configuración:

**Contexto de Ventas:**
```
Promoción general: "Ofrecemos garantía de satisfacción del 100%"
Objeción: "Si dicen que es caro, menciona que el precio incluye soporte de por vida"
Hook: "Somos la empresa líder en el sector desde 2010"
```

**Promociones Inteligentes:**
1. "2x1 en productos seleccionados" (1-15 nov, máx 3/día)
2. "Envío gratis en compras >$500" (siempre activa, máx 5/día)
3. "Descuento del 30% en productos premium" (20-30 nov, máx 2/día)

### Resultado en una conversación:

**Cliente**: "Hola, me interesa su producto"

**IA** (usando Contexto de Ventas + Promoción Inteligente):
> "¡Hola! Me da mucho gusto que te interese. Somos la empresa líder en el sector desde 2010. 
> 
> Tenemos una promoción especial: **2x1 en productos seleccionados** válida hasta el 15 de noviembre. 
> Además, todos nuestros productos incluyen garantía de satisfacción del 100%.
> 
> ¿Te gustaría que te muestre las opciones disponibles?"

**Nota**: La IA combinó:
- El hook del Contexto de Ventas ("empresa líder desde 2010")
- La promoción inteligente relevante ("2x1")
- La garantía del Contexto de Ventas

---

## 🔧 Configuración Técnica

### Contexto de Ventas
- **Tabla**: `sales_prompts`
- **Edge Function**: `sales-context`
- **Panel**: "Contexto de Ventas" en el dashboard
- **Archivo JS**: `sales-context.js`

### Promociones Inteligentes
- **Tabla**: `smart_promotions`
- **Panel**: "Promociones Inteligentes" en el dashboard
- **Archivo JS**: `smart-promotions.js`
- **Subida de imágenes**: Usa `bunny-upload` edge function

---

## ✅ Resumen

- **Contexto de Ventas** = Manual de ventas general que siempre está presente
- **Promociones Inteligentes** = Ofertas específicas que se insertan automáticamente cuando es relevante

Ambos trabajan juntos para crear conversaciones más efectivas y personalizadas. 🚀

