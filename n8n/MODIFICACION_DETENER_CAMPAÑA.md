# Modificación del Workflow para Detener Campaña

## Objetivo
Agregar una verificación en el loop del workflow que detenga el procesamiento si `active_campaign_id` es null.

## Pasos para Modificar el Workflow

### 1. Agregar Nodo de Verificación

Entre el nodo **"Loop Over Items"** y **"Juntar Contacto y Mensaje"**, agregar un nuevo nodo:

**Tipo:** `Code` (n8n-nodes-base.code)
**Nombre:** `Verificar Campaña Activa`
**Posición:** Entre Loop Over Items y Juntar Contacto y Mensaje

**Código JavaScript:**
```javascript
// Verificar si la campaña sigue activa
const userId = $('Webhook').item.json.body.userId;

// Obtener el perfil del usuario para verificar active_campaign_id
const { data: profile, error } = await $http.get({
  url: 'https://mytvwfbijlgbihlegmfg.supabase.co/rest/v1/profiles',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQxODk5MCwiZXhwIjoyMDY5OTk0OTkwfQ.07-JQs9AXJlqKYMDxk4tOL_6zOEGQTddaKlQmKQe14U',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHZ3ZmJpamxnYmlobGVnbWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQxODk5MCwiZXhwIjoyMDY5OTk0OTkwfQ.07-JQs9AXJlqKYMDxk4tOL_6zOEGQTddaKlQmKQe14U'
  },
  qs: {
    id: `eq.${userId}`,
    select: 'active_campaign_id'
  }
});

if (error) {
  // Si hay error al verificar, continuar (no detener por error de conexión)
  return $input.all();
}

// Si active_campaign_id es null, la campaña fue detenida
if (!profile || !profile[0] || !profile[0].active_campaign_id) {
  // Detener el loop devolviendo un array vacío
  // Esto hará que el loop termine
  return [];
}

// Si la campaña sigue activa, continuar con el procesamiento
return $input.all();
```

**NOTA:** El código anterior usa `$http` que puede no estar disponible. Mejor usar el nodo Supabase directamente.

### 2. Solución Alternativa (Recomendada)

En lugar de usar código, usar un nodo **Supabase** seguido de un nodo **IF**:

#### Nodo 1: "Verificar Estado de Campaña"
- **Tipo:** `Supabase` (n8n-nodes-base.supabase)
- **Operación:** `get`
- **Tabla:** `profiles`
- **Filtros:**
  - `id` = `={{ $('Webhook').item.json.body.userId }}`
- **Campos a seleccionar:** `active_campaign_id`

#### Nodo 2: "¿Campaña Detenida?"
- **Tipo:** `IF` (n8n-nodes-base.if)
- **Condición:**
  - `active_campaign_id` es `empty` (vacío/null)
- **Si es TRUE (campaña detenida):** Conectar a un nodo que detenga el flujo
- **Si es FALSE (campaña activa):** Conectar a "Juntar Contacto y Mensaje"

#### Nodo 3: "Detener Loop"
- **Tipo:** `Stop and Error` (n8n-nodes-base.stopAndError)
- **Mensaje:** "Campaña detenida por el usuario"
- **Opcional:** En lugar de error, usar un nodo que simplemente no devuelva items

### 3. Conexiones

```
Loop Over Items
    ↓
Verificar Estado de Campaña (Supabase)
    ↓
¿Campaña Detenida? (IF)
    ├─ TRUE → Detener Loop (Stop and Error)
    └─ FALSE → Juntar Contacto y Mensaje (continuar)
```

## Implementación Simplificada

La forma más simple es agregar la verificación directamente en el nodo "Juntar Contacto y Mensaje" usando un nodo IF antes:

1. **Agregar nodo Supabase** que obtenga el perfil
2. **Agregar nodo IF** que verifique si `active_campaign_id` es null
3. Si es null, conectar a un nodo que detenga el loop (o simplemente no devolver items)

## Nota Importante

El workflow ya tiene lógica para limpiar `active_campaign_id` cuando termina o hay error. Esta modificación agrega la capacidad de detener el loop **durante** la ejecución cuando el usuario presiona el botón de detener.

