# 🎯 Solución: Eliminar Alucinaciones de la IA con Placeholders

## 📋 Problema

La IA está inventando:
- ❌ Precios incorrectos
- ❌ URLs de imágenes truncadas o incorrectas
- ❌ Datos de productos que no existen

## ✅ Solución: Sistema de Placeholders

La IA usará **placeholders** (referencias) en lugar de datos directos, y un nodo procesará la respuesta para reemplazarlos con datos reales de Supabase.

### Formato de Placeholders

```
[PRODUCT_ID:53]        → ID del producto
[PRODUCT_NAME:53]      → Nombre del producto
[PRODUCT_PRICE:53]     → Precio del producto
[PRODUCT_URL:53]       → URL de la imagen (media_url)
[PRODUCT_STOCK:53]     → Stock disponible
[PRODUCT_DESC:53]      → Descripción del producto
```

### Ejemplo de Uso

**Respuesta de la IA (con placeholders):**
```
🚀 Tenemos excelentes opciones para ti:

🛍️ **[PRODUCT_NAME:53]** — $[PRODUCT_PRICE:53]
🔹 [PRODUCT_DESC:53]

Imagen: [PRODUCT_URL:53]
```

**Después del procesamiento (datos reales):**
```
🚀 Tenemos excelentes opciones para ti:

🛍️ **Tinta HP 711** — $250.00
🔹 Tinta original HP para impresoras de inyección

Imagen: https://creativersezone.b-cdn.net/tinta-hp-711.png
```

---

## 🔄 Flujo Implementado

```
1. Usuario pregunta por un producto
   ↓
2. IA usa herramienta "ver productos"
   ↓
3. Herramienta retorna productos con IDs
   ↓
4. IA genera respuesta usando placeholders: [PRODUCT_NAME:53]
   ↓
5. Nodo "Reemplazar Placeholders" procesa la respuesta
   ↓
6. Consulta Supabase con los IDs encontrados
   ↓
7. Reemplaza placeholders con datos reales
   ↓
8. Respuesta final con datos exactos
```

---

## 🛠️ Implementación

### 1. Modificación del Prompt del AI Agent ✅

Se actualizó el `systemMessage` del nodo `AI Agent1` para instruir a la IA a usar placeholders:

```
**FORMATO DE DATOS DE PRODUCTOS (OBLIGATORIO):**

NUNCA escribas precios, URLs o nombres directamente. SIEMPRE usa placeholders con el ID del producto.

Formatos de placeholders:
- [PRODUCT_NAME:ID] - Nombre del producto
- [PRODUCT_PRICE:ID] - Precio del producto
- [PRODUCT_URL:ID] - URL de la imagen (media_url)
- [PRODUCT_STOCK:ID] - Stock disponible
- [PRODUCT_DESC:ID] - Descripción del producto

Ejemplo:
🛍️ **[PRODUCT_NAME:53]** — $[PRODUCT_PRICE:53]
🔹 [PRODUCT_DESC:53]
Imagen: [PRODUCT_URL:53]
```

### 2. Nuevos Nodos en el Workflow ✅

Se agregaron 4 nodos nuevos en el flujo:

#### **Nodo 1: "Extraer IDs de Placeholders"** (Code)
- Extrae todos los IDs únicos de los placeholders en la respuesta de la IA
- Retorna: `output` (texto original), `product_ids` (array de IDs), `has_placeholders` (boolean)

#### **Nodo 2: "Obtener Productos por IDs"** (Supabase)
- Consulta todos los productos del usuario
- Filtra por `user_id`
- Retorna: `id`, `product_name`, `price`, `media_url`, `stock`, `description`

#### **Nodo 3: "Filtrar Productos por IDs"** (Code)
- Filtra los productos obtenidos para solo incluir los que coinciden con los IDs de los placeholders
- Optimiza la consulta para no procesar productos innecesarios

#### **Nodo 4: "Reemplazar Placeholders"** (Code)
- Reemplaza cada placeholder con el dato real correspondiente
- Formatea precios como `$250.00`
- Maneja casos donde el producto no se encuentra

### 3. Flujo Completo

```
AI Agent1 (genera respuesta con placeholders)
    ↓
Extraer IDs de Placeholders
    ↓
Obtener Productos por IDs (Supabase)
    ↓
Filtrar Productos por IDs
    ↓
Reemplazar Placeholders (datos reales)
    ↓
Separar imagen o video del texto o audio
    ↓
(continúa flujo normal)
```

### 4. Manejo de Casos Especiales

- **Sin placeholders:** El flujo continúa normalmente, sin consultar productos
- **Producto no encontrado:** El placeholder se deja sin reemplazar (o se puede configurar un texto por defecto)
- **Múltiples productos:** Todos los placeholders se reemplazan correctamente

---

## 📝 Ejemplo de Código del Nodo

```javascript
// Extraer todos los placeholders de la respuesta
const texto = $input.first().json.output || '';
const placeholderRegex = /\[PRODUCT_(\w+):(\d+)\]/g;
const matches = [...texto.matchAll(placeholderRegex)];

// Obtener IDs únicos
const productIds = [...new Set(matches.map(m => m[2]))];

if (productIds.length === 0) {
  // No hay placeholders, retornar texto original
  return [{ json: { output: texto } }];
}

// Consultar productos en Supabase
const { data: products, error } = await $('Get a row').item.json.supabase
  .from('products')
  .select('id, product_name, price, media_url, stock, description')
  .in('id', productIds);

if (error || !products) {
  console.error('Error al obtener productos:', error);
  return [{ json: { output: texto } }];
}

// Crear mapa de productos por ID
const productMap = {};
products.forEach(p => {
  productMap[p.id] = {
    name: p.product_name || 'Producto',
    price: p.price ? `$${parseFloat(p.price).toFixed(2)}` : 'N/A',
    url: p.media_url || '',
    stock: p.stock !== null ? p.stock : 'N/A',
    desc: p.description || ''
  };
});

// Reemplazar placeholders
let textoFinal = texto;
matches.forEach(match => {
  const [fullMatch, field, id] = match;
  const product = productMap[id];
  
  if (!product) return; // Producto no encontrado
  
  let replacement = '';
  switch(field) {
    case 'NAME': replacement = product.name; break;
    case 'PRICE': replacement = product.price; break;
    case 'URL': replacement = product.url; break;
    case 'STOCK': replacement = product.stock; break;
    case 'DESC': replacement = product.desc; break;
    default: replacement = fullMatch;
  }
  
  textoFinal = textoFinal.replace(fullMatch, replacement);
});

return [{ json: { output: textoFinal } }];
```

---

## ✅ Ventajas de esta Solución

1. **Datos 100% exactos** - Vienen directamente de Supabase
2. **Sin alucinaciones** - La IA no puede inventar datos
3. **URLs completas** - Se obtienen exactamente como están en la BD
4. **Fácil de mantener** - Un solo lugar para modificar el formato
5. **Escalable** - Funciona con cualquier cantidad de productos

---

## 🧪 Prueba

1. Envía: "Quiero ver la tinta HP 711"
2. La IA debe usar: `[PRODUCT_NAME:53]` y `[PRODUCT_PRICE:53]`
3. El nodo reemplaza con datos reales
4. El mensaje final tiene precios y URLs exactos

