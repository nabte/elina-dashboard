# Código Completo con Debug para Filtrar Promoción

## Versión con Debug Completo

Este código te mostrará exactamente qué está recibiendo y por qué no encuentra la promo:

```javascript
// Obtener los datos de entrada
const inputData = $input.all();
console.log('=== DEBUG COMPLETO ===');
console.log('Total items recibidos:', inputData.length);
console.log('Primer item completo:', JSON.stringify(inputData[0]?.json, null, 2));

// Intentar obtener promos de diferentes formas
let promos = null;

// Opción 1: Si viene directamente como array
if (Array.isArray(inputData[0]?.json)) {
  promos = inputData[0].json;
  console.log('✅ Promos encontradas como array directo');
}
// Opción 2: Si viene en una propiedad
else if (Array.isArray(inputData[0]?.json?.data)) {
  promos = inputData[0].json.data;
  console.log('✅ Promos encontradas en .data');
}
// Opción 3: Si viene en una propiedad específica
else if (Array.isArray(inputData[0]?.json?.promos)) {
  promos = inputData[0].json.promos;
  console.log('✅ Promos encontradas en .promos');
}
// Opción 4: Si el item.json es el array
else if (inputData[0]?.json && typeof inputData[0].json === 'object') {
  // Intentar encontrar cualquier propiedad que sea array
  const keys = Object.keys(inputData[0].json);
  console.log('Claves disponibles:', keys);
  for (const key of keys) {
    if (Array.isArray(inputData[0].json[key])) {
      promos = inputData[0].json[key];
      console.log(`✅ Promos encontradas en .${key}`);
      break;
    }
  }
}

if (!promos || !Array.isArray(promos) || !promos.length) {
  console.log('❌ No se encontraron promos válidas');
  console.log('Tipo de datos recibidos:', typeof inputData[0]?.json);
  console.log('Estructura completa:', JSON.stringify(inputData[0]?.json, null, 2));
  return [{ json: { promo: null, debug: 'No se encontraron promos en el formato esperado' } }];
}

console.log(`\n📦 Total de promos encontradas: ${promos.length}`);

// Función helper para normalizar valores booleanos
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (value === null || value === undefined) return false;
  return Boolean(value);
};

const now = new Date();
console.log('\n⏰ Fecha actual:', now.toISOString());

// Evaluar cada promo
const validPromos = promos.map((promo, index) => {
  console.log(`\n--- Promo ${index + 1}: ${promo.title || promo.id || 'Sin título'} ---`);
  
  const isActive = toBoolean(promo.is_active);
  const noSchedule = toBoolean(promo.no_schedule);
  
  console.log('  is_active:', promo.is_active, `(${typeof promo.is_active}) →`, isActive);
  console.log('  no_schedule:', promo.no_schedule, `(${typeof promo.no_schedule}) →`, noSchedule);
  console.log('  start_at:', promo.start_at);
  console.log('  end_at:', promo.end_at);
  
  if (!isActive) {
    console.log('  ❌ No está activa');
    return null;
  }
  
  if (!noSchedule) {
    if (promo.start_at) {
      const startDate = new Date(promo.start_at);
      console.log('  Fecha inicio:', startDate.toISOString());
      if (startDate > now) {
        console.log('  ❌ Aún no ha comenzado');
        return null;
      }
    }
    if (promo.end_at) {
      const endDate = new Date(promo.end_at);
      console.log('  Fecha fin:', endDate.toISOString());
      if (endDate < now) {
        console.log('  ❌ Ya expiró');
        return null;
      }
    }
  } else {
    console.log('  ✅ Sin horario (siempre activa)');
  }
  
  console.log('  ✅ PROMO VÁLIDA');
  return promo;
}).filter(p => p !== null);

console.log(`\n✅ Promos válidas encontradas: ${validPromos.length}`);

const selected = validPromos.length > 0 ? validPromos[0] : null;

console.log('\n=== RESULTADO FINAL ===');
if (selected) {
  console.log('✅ Promo seleccionada:', selected.title || selected.id);
} else {
  console.log('❌ No se seleccionó ninguna promo');
}

return [{ 
  json: { 
    promo: selected,
    debug_info: {
      total_promos: promos.length,
      valid_promos: validPromos.length,
      selected_id: selected?.id || null
    }
  } 
}];
```

## Versión Simplificada (sin debug)

Si ya sabes el formato, usa esta versión más simple:

```javascript
// Obtener promos - ajusta según cómo lleguen los datos
let promos = $input.item.json;

// Si viene en .data
if (!Array.isArray(promos) && Array.isArray(promos?.data)) {
  promos = promos.data;
}

if (!Array.isArray(promos) || !promos.length) {
  return [{ json: { promo: null } }];
}

// Normalizar booleanos
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return Boolean(value);
};

const now = new Date();
const selected = promos.find(promo => {
  const isActive = toBoolean(promo.is_active);
  if (!isActive) return false;
  
  const noSchedule = toBoolean(promo.no_schedule);
  
  if (!noSchedule) {
    if (promo.start_at && new Date(promo.start_at) > now) return false;
    if (promo.end_at && new Date(promo.end_at) < now) return false;
  }
  
  return true;
});

return [{ json: { promo: selected || null } }];
```

