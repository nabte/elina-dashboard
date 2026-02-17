# Código Final: Agregar Promo al Contexto (CON IMÁGENES)

## Código para el nodo "agregar Promo al Contexto"

Copia y pega este código completo en el nodo Code de n8n:

```javascript
// Obtener la promo de forma segura
const promo = $('Filtrar Promoción Válida').item.json.promo;

// Obtener contexto RAG y texto
const ragContext = $('3. RAG - Formatear Contexto').item.json.rag_context || '';
const text = $('set text').item.json.text || '';

let promoContext = '';

// Solo agregar contexto si hay una promo válida
if (promo && promo.id) {
  // Formatear fechas de forma segura
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString('es-ES');
    } catch (e) {
      return null;
    }
  };
  
  const startDate = formatDate(promo.start_at);
  const endDate = formatDate(promo.end_at);
  
  // Construir el contexto de promoción
  promoContext = `\n\n[PROMOCIÓN ACTIVA DISPONIBLE]\n` +
    `Título: ${promo.title || 'Promoción especial'}\n` +
    `Descripción: ${promo.description || ''}\n`;
  
  // Agregar descuento u oferta si existe
  if (promo.discount) {
    promoContext += `Descuento: ${promo.discount}\n`;
  }
  if (promo.offer) {
    promoContext += `Oferta: ${promo.offer}\n`;
  }
  if (promo.benefits) {
    promoContext += `Beneficios: ${promo.benefits}\n`;
  }
  
  // Agregar vigencia
  if (promo.no_schedule) {
    promoContext += `Vigencia: Siempre activa\n`;
  } else {
    const vigencia = startDate && endDate 
      ? `${startDate} - ${endDate}`
      : startDate 
        ? `Desde ${startDate}`
        : endDate 
          ? `Hasta ${endDate}`
          : 'Activa';
    promoContext += `Vigencia: ${vigencia}\n`;
  }
  
  // Agregar call to action si existe
  if (promo.call_to_action) {
    promoContext += `Call to Action: ${promo.call_to_action}\n`;
  }
  
  // ✅ AGREGAR IMÁGENES DE LA PROMOCIÓN
  if (promo.image_urls) {
    let imageUrls = [];
    
    // Manejar si image_urls es un string JSON o un array
    if (typeof promo.image_urls === 'string') {
      try {
        imageUrls = JSON.parse(promo.image_urls);
      } catch (e) {
        // Si no es JSON válido, tratar como string simple
        imageUrls = [promo.image_urls];
      }
    } else if (Array.isArray(promo.image_urls)) {
      imageUrls = promo.image_urls;
    }
    
    // Agregar las URLs de imágenes al contexto
    if (imageUrls.length > 0) {
      promoContext += `\nImágenes de la promoción:\n`;
      imageUrls.forEach((url, index) => {
        if (url && url.trim()) {
          promoContext += `Imagen ${index + 1}: ${url.trim()}\n`;
        }
      });
      // Instrucción clara para el AI Agent
      promoContext += `\nIMPORTANTE: Cuando menciones esta promoción, SIEMPRE incluye la primera imagen usando el formato "Imagen: [URL]". Ejemplo: "Imagen: ${imageUrls[0].trim()}"\n`;
    }
  }
  
  promoContext += `\nSi el contexto de la conversación lo permite, menciona esta promoción de forma natural. No la fuerces si no es relevante.\n`;
}

// Obtener el contexto base
const baseContext = $('3. RAG - Formatear Contexto').item.json;

// Construir el resultado
return [{
  json: {
    ...baseContext,
    rag_context: (ragContext || '') + promoContext,
    promo_id: promo?.id || null,
    text: text
  }
}];
```

## Cambios principales

1. ✅ **Manejo de `image_urls`**: El código ahora detecta y procesa el campo `image_urls` de la promoción
2. ✅ **Soporte para JSON string**: Si `image_urls` viene como string JSON (como en tu caso: `'{"https://..."}'`), lo parsea correctamente
3. ✅ **Soporte para array**: Si ya viene como array, lo usa directamente
4. ✅ **Instrucción al AI Agent**: Agrega una instrucción clara para que el AI Agent incluya la imagen cuando mencione la promoción
5. ✅ **Formato correcto**: La imagen se incluye con el formato "Imagen: [URL]" que el nodo "Separar imagen o video del texto o audio" puede procesar

## Ejemplo de salida

Cuando haya una promoción con imagen, el contexto incluirá algo como:

```
[PROMOCIÓN ACTIVA DISPONIBLE]
Título: test
Descripción: no importa que compres siempre tenemos esta promo activa porque es un test
Beneficios: sera activo en probar elina por 7 dias gratis
Call to Action: Esto es una preuba de ELINA
Vigencia: Siempre activa

Imágenes de la promoción:
Imagen 1: https://creativersezone.b-cdn.net/5ef13a72-e674-491d-888d-721adf102539/smart-promotions/1764785135311-1764785135311.png

IMPORTANTE: Cuando menciones esta promoción, SIEMPRE incluye la primera imagen usando el formato "Imagen: [URL]". Ejemplo: "Imagen: https://creativersezone.b-cdn.net/5ef13a72-e674-491d-888d-721adf102539/smart-promotions/1764785135311-1764785135311.png"
```

## Prueba

1. Copia el código completo
2. Pégalo en el nodo "agregar Promo al Contexto"
3. Guarda el workflow
4. Ejecuta una prueba con un mensaje que debería activar la promoción
5. Verifica que el AI Agent incluya la imagen en su respuesta

