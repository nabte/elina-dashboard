# Control de IA para Grupos de WhatsApp

Esta guía explica cómo configurar el sistema para que la IA pueda decidir si responder o no a grupos de WhatsApp, similar al sistema de "ignorar" para contactos.

## Resumen

Se implementa un sistema que permite:
1. **Control por grupo**: Cada grupo puede tener IA habilitada o deshabilitada
2. **Toggle en UI**: Switch similar al de contactos para habilitar/deshabilitar IA
3. **Verificación en workflow**: El workflow de n8n verifica si la IA está habilitada antes de procesar

## Cambios en Base de Datos

### Migración SQL

Se agregó el campo `ai_enabled` a la tabla `whatsapp_groups`:

```sql
-- Archivo: supabase/schema/20251212_add_ai_enabled_to_groups.sql
alter table public.whatsapp_groups
add column if not exists ai_enabled boolean default true not null;
```

**Valores:**
- `true`: La IA responde a mensajes de este grupo (por defecto)
- `false`: La IA NO responde a mensajes de este grupo (similar a "ignorar" en contactos)

## Modificaciones en el Workflow de n8n

### Ubicación en el Flujo

El nodo de verificación debe ir **después de detectar si es grupo** y **antes de procesar con IA**.

**Flujo sugerido:**
```
Webhook → Detectar si es grupo (@g.us)
  ↓
  ├─ Si es contacto → Verificar "ignorar" (flujo actual)
  └─ Si es grupo → Verificar ai_enabled
      ├─ Si ai_enabled = false → Detener flujo (No Operation)
      └─ Si ai_enabled = true → Continuar con IA
```

### Nodo 1: Detectar si es Grupo

**Tipo:** `Code` o `IF`

**Código (si usas Code):**
```javascript
const remoteJid = $('Webhook1').item.json.body.data.key.remoteJid || '';
const isGroup = remoteJid.includes('@g.us');

return [{
  json: {
    ...$('Webhook1').item.json,
    is_group: isGroup,
    remote_jid: remoteJid
  }
}];
```

**O usando IF:**
- **Condition:** `String contains`
- **Value 1:** `={{ $('Webhook1').item.json.body.data.key.remoteJid }}`
- **Value 2:** `@g.us`

### Nodo 2: Obtener Grupo de Supabase (solo si es grupo)

**Tipo:** `Supabase`

**Configuración:**
- **Operation:** `Get`
- **Table:** `whatsapp_groups`
- **Filters:**
  - **Field:** `group_jid`
  - **Operator:** `Equal`
  - **Value:** `={{ $('Webhook1').item.json.body.data.key.remoteJid }}`

**Nombre:** `Get Group Info`

**Nota:** Este nodo solo debe ejecutarse si es grupo. Conecta desde la rama TRUE del nodo "Detectar si es Grupo".

### Nodo 3: Verificar ai_enabled

**Tipo:** `IF`

**Configuración:**
- **Condition:** `Boolean`
- **Value 1:** `={{ $('Get Group Info').item.json.ai_enabled }}`
- **Value 2:** `true`

**Conexiones:**
- **TRUE (ai_enabled = true):** → Continuar con el flujo normal de IA
- **FALSE (ai_enabled = false):** → Nodo "No Operation" (detener flujo)

**Nombre:** `IF: ¿IA Habilitada para Grupo?`

### Nodo 4: No Operation (si IA deshabilitada)

**Tipo:** `No Operation`

**Nombre:** `FIN - IA Deshabilitada para Grupo`

**Propósito:** Detener el flujo cuando la IA está deshabilitada para el grupo.

## Modificaciones en la UI (chats.js)

### Agregar Toggle en el Panel de Información del Grupo

Similar al toggle de "Ignorar IA" para contactos, agregar un toggle para grupos.

**En `chats.html` (si existe panel de info de grupo):**
```html
<!-- Agregar en el panel de información del grupo -->
<div class="p-4 border-b border-slate-200">
    <label class="flex items-center justify-between cursor-pointer">
        <span class="text-sm font-semibold text-slate-700">
            <i data-lucide="bot" class="w-4 h-4 inline mr-2"></i>
            IA Habilitada
        </span>
        <input 
            type="checkbox" 
            id="info-group-ai-toggle" 
            class="toggle-checkbox"
            checked
        >
    </label>
    <p class="text-xs text-slate-500 mt-1">
        Permite que la IA responda automáticamente a mensajes de este grupo
    </p>
</div>
```

**En `chats.js`:**

Agregar función para manejar el toggle:

```javascript
// Agregar listener para el toggle de IA de grupos
document.getElementById('info-group-ai-toggle')?.addEventListener('change', handleGroupAiToggle);

async function handleGroupAiToggle(e) {
    const toggle = e.target;
    if (!currentGroupId || !currentGroup) return;
    
    const aiEnabled = toggle.checked;
    
    try {
        const { error } = await window.auth.sb
            .from('whatsapp_groups')
            .update({ ai_enabled: aiEnabled })
            .eq('id', currentGroupId);
        
        if (error) throw error;
        
        // Actualizar caché local
        currentGroup.ai_enabled = aiEnabled;
        
        // Mostrar mensaje de confirmación
        window.showToast?.(
            aiEnabled 
                ? 'IA habilitada para este grupo' 
                : 'IA deshabilitada para este grupo',
            'success'
        );
    } catch (error) {
        console.error('Error al actualizar ai_enabled:', error);
        toggle.checked = !aiEnabled; // Revertir cambio
        window.showToast?.('Error al actualizar configuración', 'error');
    }
}
```

**Actualizar función `loadChatForGroup` para cargar el estado:**

```javascript
async function loadChatForGroup(groupId) {
    // ... código existente ...
    
    // Actualizar toggle de IA si existe
    const aiToggle = document.getElementById('info-group-ai-toggle');
    if (aiToggle) {
        aiToggle.checked = currentGroup.ai_enabled !== false; // default true
    }
    
    // ... resto del código ...
}
```

## Verificación en el Workflow Principal

### Opción 1: Modificar "Elina V4 (1).json"

Agregar lógica después del nodo "Webhook1" para:
1. Detectar si es grupo
2. Si es grupo, obtener información del grupo
3. Verificar `ai_enabled`
4. Si es `false`, detener el flujo

### Opción 2: Modificar "Recibir Mensajes de Grupos.json"

Si usas el workflow separado para grupos, agregar la verificación antes de guardar el mensaje:

```javascript
// En el nodo "1. Detectar y Extraer Mensaje de Grupo"
// Después de obtener el grupo, verificar ai_enabled

const groupData = $('3. Obtener Grupo de Supabase').item.json;

if (!groupData.ai_enabled) {
  // No procesar con IA, solo guardar el mensaje
  return [{
    json: {
      ...messageData,
      skip_ai: true,
      ai_enabled: false
    }
  }];
}
```

## Pruebas

### Verificar en Base de Datos

```sql
-- Ver grupos con IA deshabilitada
SELECT 
  id,
  group_name,
  group_jid,
  ai_enabled,
  last_message_at
FROM whatsapp_groups
WHERE user_id = 'tu-user-id'
  AND ai_enabled = false;

-- Habilitar/deshabilitar IA para un grupo
UPDATE whatsapp_groups
SET ai_enabled = false
WHERE id = 1; -- ID del grupo
```

### Probar en n8n

1. Enviar un mensaje a un grupo con `ai_enabled = false`
2. Verificar que el workflow se detiene antes de procesar con IA
3. Verificar que el mensaje se guarda pero no se genera respuesta

### Probar en la UI

1. Abrir un grupo en la interfaz
2. Cambiar el toggle de "IA Habilitada"
3. Verificar que se actualiza en la base de datos
4. Enviar un mensaje de prueba y verificar que la IA responde o no según el toggle

## Comparación con Sistema de Contactos

| Aspecto | Contactos | Grupos |
|---------|-----------|--------|
| **Campo** | `contacts.labels` (array) | `whatsapp_groups.ai_enabled` (boolean) |
| **Valor para ignorar** | `["ignorar"]` en labels | `ai_enabled = false` |
| **Valor por defecto** | Sin label "ignorar" | `ai_enabled = true` |
| **Verificación** | Buscar "ignorar" en array | Verificar boolean directamente |
| **UI** | Toggle "Ignorar IA" | Toggle "IA Habilitada" |

## Troubleshooting

### La IA sigue respondiendo aunque ai_enabled = false

1. **Verifica que el nodo de verificación esté conectado correctamente**
2. **Verifica que el nodo se ejecute antes del "AI Agent"**
3. **Revisa los logs de n8n para ver si el nodo se ejecuta**

### El toggle no se actualiza

1. **Verifica permisos RLS en `whatsapp_groups`**
2. **Verifica que el campo `ai_enabled` existe en la tabla**
3. **Revisa la consola del navegador para errores**

### Los grupos nuevos no tienen el campo

1. **Ejecuta la migración SQL:**
   ```sql
   -- Ver archivo: supabase/schema/20251212_add_ai_enabled_to_groups.sql
   ```

2. **Verifica que el campo tenga default:**
   ```sql
   SELECT column_default 
   FROM information_schema.columns 
   WHERE table_name = 'whatsapp_groups' 
     AND column_name = 'ai_enabled';
   ```

## Próximos Pasos

1. ✅ Agregar campo `ai_enabled` a la tabla (completado)
2. ⚠️ Modificar workflow de n8n para verificar `ai_enabled` (pendiente)
3. ⚠️ Agregar toggle en la UI (pendiente)
4. ⚠️ Probar funcionalidad completa (pendiente)

---

**Última actualización:** 12 de Diciembre, 2025
**Versión:** 1.0

