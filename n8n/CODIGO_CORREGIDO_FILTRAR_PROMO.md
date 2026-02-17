# Código Corregido para Filtrar Promoción Válida

## Problema
El código no maneja correctamente los valores booleanos que vienen de Supabase (pueden ser strings 'true'/'false' o booleanos reales).

## Solución: Normalizar Valores Booleanos

### Código Corregido:

```javascript
const promos = $input.item.json;

if (!Array.isArray(promos) || !promos.length) {
  return [{ json: { promo: null } }];
}

// Función helper para normalizar valores booleanos
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
};

const now = new Date();
const selected = promos.find(promo => {
  // Normalizar is_active
  const isActive = toBoolean(promo.is_active);
  if (!isActive) return false;
  
  // Normalizar no_schedule
  const noSchedule = toBoolean(promo.no_schedule);
  
  // Si tiene horario (no_schedule = false), verificar fechas
  if (!noSchedule) {
    if (promo.start_at && new Date(promo.start_at) > now) return false;
    if (promo.end_at && new Date(promo.end_at) < now) return false;
  }
  
  return true;
});

return [{ json: { promo: selected || null } }];
```

## Versión con Debug (para ver qué está pasando):

```javascript
const promos = $input.item.json;

console.log('Promos recibidas:', JSON.stringify(promos, null, 2));

if (!Array.isArray(promos) || !promos.length) {
  console.log('No hay promos o no es array');
  return [{ json: { promo: null } }];
}

// Función helper para normalizar valores booleanos
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (value === null || value === undefined) return false;
  return Boolean(value);
};

const now = new Date();
console.log('Fecha actual:', now.toISOString());

const selected = promos.find((promo, index) => {
  console.log(`\nEvaluando promo ${index}:`, {
    id: promo.id,
    is_active: promo.is_active,
    is_active_type: typeof promo.is_active,
    is_active_normalized: toBoolean(promo.is_active),
    no_schedule: promo.no_schedule,
    no_schedule_type: typeof promo.no_schedule,
    no_schedule_normalized: toBoolean(promo.no_schedule),
    start_at: promo.start_at,
    end_at: promo.end_at
  });
  
  const isActive = toBoolean(promo.is_active);
  if (!isActive) {
    console.log('  ❌ No está activa');
    return false;
  }
  
  const noSchedule = toBoolean(promo.no_schedule);
  
  if (!noSchedule) {
    if (promo.start_at && new Date(promo.start_at) > now) {
      console.log('  ❌ Aún no ha comenzado');
      return false;
    }
    if (promo.end_at && new Date(promo.end_at) < now) {
      console.log('  ❌ Ya expiró');
      return false;
    }
  }
  
  console.log('  ✅ Promo válida');
  return true;
});

console.log('\nPromo seleccionada:', selected ? selected.id : 'null');

return [{ json: { promo: selected || null } }];
```

## Nota sobre el nombre del nodo
El nombre del nodo tiene un backtick al final: `"Filtrar Promoción Válida`"` 
Debería ser: `"Filtrar Promoción Válida"` (sin el backtick)

