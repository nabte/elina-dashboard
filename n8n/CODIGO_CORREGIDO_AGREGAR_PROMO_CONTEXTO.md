# Código Corregido para Agregar Promo al Contexto

## Problemas Potenciales Identificados

1. Si `promo` es `null`, el código puede fallar al acceder a propiedades
2. Las fechas pueden ser `null` y causar errores en `toLocaleDateString()`
3. La concatenación de strings puede fallar si `ragContext` es `null` o `undefined`

## Código Corregido:

```javascript
// Obtener la promo (puede ser null)
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
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
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
  
  // Agregar imágenes si existen
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

## Versión Simplificada (sin formateo de fechas complejo):

```javascript
// Obtener la promo
const promo = $('Filtrar Promoción Válida').item.json.promo;

// Obtener contexto RAG y texto
const ragContext = $('3. RAG - Formatear Contexto').item.json.rag_context || '';
const text = $('set text').item.json.text || '';

let promoContext = '';

// Solo agregar si hay promo válida
if (promo && promo.id) {
  promoContext = `\n\n[PROMOCIÓN ACTIVA DISPONIBLE]\n` +
    `Título: ${promo.title || 'Promoción especial'}\n` +
    `Descripción: ${promo.description || ''}\n`;
  
  if (promo.discount) promoContext += `Descuento: ${promo.discount}\n`;
  if (promo.offer) promoContext += `Oferta: ${promo.offer}\n`;
  if (promo.benefits) promoContext += `Beneficios: ${promo.benefits}\n`;
  
  if (promo.no_schedule) {
    promoContext += `Vigencia: Siempre activa\n`;
  } else {
    const startStr = promo.start_at ? new Date(promo.start_at).toLocaleDateString() : 'Activa';
    const endStr = promo.end_at ? new Date(promo.end_at).toLocaleDateString() : 'Sin límite';
    promoContext += `Vigencia: ${startStr} - ${endStr}\n`;
  }
  
  if (promo.call_to_action) {
    promoContext += `Call to Action: ${promo.call_to_action}\n`;
  }
  
  // Agregar imágenes si existen
  if (promo.image_urls) {
    let imageUrls = [];
    if (typeof promo.image_urls === 'string') {
      try {
        imageUrls = JSON.parse(promo.image_urls);
      } catch (e) {
        imageUrls = [promo.image_urls];
      }
    } else if (Array.isArray(promo.image_urls)) {
      imageUrls = promo.image_urls;
    }
    
    if (imageUrls.length > 0) {
      promoContext += `\nImágenes de la promoción:\n`;
      imageUrls.forEach((url, index) => {
        if (url && url.trim()) {
          promoContext += `Imagen ${index + 1}: ${url.trim()}\n`;
        }
      });
      promoContext += `\nIMPORTANTE: Cuando menciones esta promoción, SIEMPRE incluye la primera imagen usando el formato "Imagen: [URL]". Ejemplo: "Imagen: ${imageUrls[0].trim()}"\n`;
    }
  }
  
  promoContext += `\nSi el contexto de la conversación lo permite, menciona esta promoción de forma natural. No la fuerces si no es relevante.\n`;
}

// Obtener contexto base
const baseContext = $('3. RAG - Formatear Contexto').item.json;

return [{
  json: {
    ...baseContext,
    rag_context: ragContext + promoContext,
    promo_id: promo?.id || null,
    text: text
  }
}];
```

## Versión con Manejo de Errores Completo:

```javascript
try {
  // Obtener la promo de forma segura
  const promoNode = $('Filtrar Promoción Válida');
  const promo = promoNode?.item?.json?.promo || null;
  
  // Obtener contexto RAG
  const ragNode = $('3. RAG - Formatear Contexto');
  const ragContext = ragNode?.item?.json?.rag_context || '';
  
  // Obtener texto
  const textNode = $('set text');
  const text = textNode?.item?.json?.text || '';
  
  let promoContext = '';
  
  // Solo agregar si hay promo válida
  if (promo && promo.id) {
    promoContext = `\n\n[PROMOCIÓN ACTIVA DISPONIBLE]\n` +
      `Título: ${promo.title || 'Promoción especial'}\n` +
      `Descripción: ${promo.description || ''}\n`;
    
    if (promo.discount) promoContext += `Descuento: ${promo.discount}\n`;
    if (promo.offer) promoContext += `Oferta: ${promo.offer}\n`;
    if (promo.benefits) promoContext += `Beneficios: ${promo.benefits}\n`;
    
    if (promo.no_schedule) {
      promoContext += `Vigencia: Siempre activa\n`;
    } else {
      try {
        const startStr = promo.start_at ? new Date(promo.start_at).toLocaleDateString() : 'Activa';
        const endStr = promo.end_at ? new Date(promo.end_at).toLocaleDateString() : 'Sin límite';
        promoContext += `Vigencia: ${startStr} - ${endStr}\n`;
      } catch (e) {
        promoContext += `Vigencia: Activa\n`;
      }
    }
    
    if (promo.call_to_action) {
      promoContext += `Call to Action: ${promo.call_to_action}\n`;
    }
    
    // Agregar imágenes si existen
    if (promo.image_urls) {
      try {
        let imageUrls = [];
        if (typeof promo.image_urls === 'string') {
          try {
            imageUrls = JSON.parse(promo.image_urls);
          } catch (e) {
            imageUrls = [promo.image_urls];
          }
        } else if (Array.isArray(promo.image_urls)) {
          imageUrls = promo.image_urls;
        }
        
        if (imageUrls.length > 0) {
          promoContext += `\nImágenes de la promoción:\n`;
          imageUrls.forEach((url, index) => {
            if (url && url.trim()) {
              promoContext += `Imagen ${index + 1}: ${url.trim()}\n`;
            }
          });
          promoContext += `\nIMPORTANTE: Cuando menciones esta promoción, SIEMPRE incluye la primera imagen usando el formato "Imagen: [URL]". Ejemplo: "Imagen: ${imageUrls[0].trim()}"\n`;
        }
      } catch (e) {
        console.error('Error al procesar image_urls:', e);
      }
    }
    
    promoContext += `\nSi el contexto de la conversación lo permite, menciona esta promoción de forma natural. No la fuerces si no es relevante.\n`;
  }
  
  // Obtener contexto base de forma segura
  const baseContext = ragNode?.item?.json || {};
  
  return [{
    json: {
      ...baseContext,
      rag_context: (ragContext || '') + promoContext,
      promo_id: promo?.id || null,
      text: text
    }
  }];
  
} catch (error) {
  console.error('Error al agregar contexto de promoción:', error);
  // Devolver el contexto original sin promoción
  const ragNode = $('3. RAG - Formatear Contexto');
  return [{
    json: {
      ...(ragNode?.item?.json || {}),
      rag_context: ragNode?.item?.json?.rag_context || '',
      promo_id: null
    }
  }];
}
```

