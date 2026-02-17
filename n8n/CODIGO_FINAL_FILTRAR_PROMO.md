# Código Final Corregido para Filtrar Promoción

## Problema Identificado
El nodo Supabase con operación "get" devuelve un array directamente, pero el código estaba buscando en lugares incorrectos.

## Solución: Manejar el formato correcto de n8n

Cuando un nodo Supabase devuelve múltiples items, n8n los convierte en items separados. Cada item tiene la promo completa en `json`.

### Código Corregido:

```javascript
// Obtener todos los items (cada promo es un item separado en n8n)
const allItems = $input.all();

console.log('=== DEBUG ===');
console.log('Total items recibidos:', allItems.length);

if (!allItems || allItems.length === 0) {
  console.log('❌ No hay items');
  return [{ json: { promo: null } }];
}

// Convertir items a array de promos
const promos = allItems.map(item => item.json);

console.log('Total promos:', promos.length);
console.log('Primera promo:', JSON.stringify(promos[0], null, 2));

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
console.log('Fecha actual:', now.toISOString());

// Evaluar cada promo
const selected = promos.find((promo, index) => {
  console.log(`\n--- Promo ${index + 1}: ${promo.title || promo.id} ---`);
  
  const isActive = toBoolean(promo.is_active);
  const noSchedule = toBoolean(promo.no_schedule);
  
  console.log('  is_active:', promo.is_active, `(${typeof promo.is_active}) →`, isActive);
  console.log('  no_schedule:', promo.no_schedule, `(${typeof promo.no_schedule}) →`, noSchedule);
  
  if (!isActive) {
    console.log('  ❌ No está activa');
    return false;
  }
  
  if (!noSchedule) {
    if (promo.start_at && new Date(promo.start_at) > now) {
      console.log('  ❌ Aún no ha comenzado');
      return false;
    }
    if (promo.end_at && new Date(promo.end_at) < now) {
      console.log('  ❌ Ya expiró');
      return false;
    }
  } else {
    console.log('  ✅ Sin horario (siempre activa)');
  }
  
  console.log('  ✅ PROMO VÁLIDA');
  return true;
});

console.log('\n=== RESULTADO ===');
console.log('Promo seleccionada:', selected ? (selected.title || selected.id) : 'null');

return [{ json: { promo: selected || null } }];
```

## Versión Simplificada (sin debug):

```javascript
// Obtener todos los items (cada promo es un item separado)
const allItems = $input.all();

if (!allItems || allItems.length === 0) {
  return [{ json: { promo: null } }];
}

// Convertir items a array de promos
const promos = allItems.map(item => item.json);

// Normalizar booleanos
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase().trim() === 'true' || value === '1';
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

## Nota sobre el nodo Supabase

Si el nodo Supabase está usando operación "get" (que devuelve un solo item), deberías cambiarlo a "getAll" o verificar que esté configurado para devolver múltiples items.

Si quieres que devuelva todas las promociones activas, el nodo debería tener:
- **Operation:** `getAll` o `get` con `returnAll: true`
- **Filters:** `user_id = {{ $('Get Subscription').item.json.user_id }}`

