# Configuración de Grupos de WhatsApp con Evolution API

Esta guía explica cómo configurar y usar la funcionalidad de grupos de WhatsApp en el sistema usando Evolution API.

## Requisitos Previos

1. **Evolution API configurada**: Tu instancia de Evolution API debe estar funcionando y configurada en tu perfil de usuario.
2. **Permisos de grupos**: La instancia de WhatsApp debe tener permisos para acceder a grupos (esto es automático si el número está conectado correctamente).

## Endpoints de Evolution API para Grupos

Los siguientes endpoints se utilizan para gestionar grupos:

### 1. Obtener Todos los Grupos
```
GET /group/fetchAllGroups/{instance}
```
o
```
POST /group/fetchAllGroups/{instance}
```

**Headers:**
- `apikey`: Tu API key de Evolution

**Respuesta:**
```json
[
  {
    "id": "120363123456789012@g.us",
    "jid": "120363123456789012@g.us",
    "subject": "Nombre del Grupo",
    "description": "Descripción del grupo",
    "participants": [
      {
        "jid": "5211234567890@s.whatsapp.net",
        "name": "Nombre del Participante",
        "isAdmin": false,
        "isSuperAdmin": false
      }
    ],
    "admins": ["5211234567890@s.whatsapp.net"],
    "creation": 1234567890
  }
]
```

### 2. Obtener Participantes de un Grupo
```
GET /group/participants/{instance}
```

**Body:**
```json
{
  "groupJid": "120363123456789012@g.us"
}
```

### 3. Enviar Mensaje a un Grupo
```
POST /messages-api/sendText/{instance}
```

**Body:**
```json
{
  "remoteJid": "120363123456789012@g.us",
  "messageText": "Mensaje a enviar"
}
```

## Configuración en el Sistema

### 1. Sincronizar Grupos

Para sincronizar grupos desde Evolution API a la base de datos:

**Opción A: Usando Edge Function**
```javascript
const response = await fetch('https://tu-proyecto.supabase.co/functions/v1/sync-groups', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`
  },
  body: JSON.stringify({ user_id: userId })
});
```

**Opción B: Usando n8n**
Crea un workflow en n8n que:
1. Obtenga el perfil del usuario
2. Llame al endpoint `/group/fetchAllGroups/{instance}` de Evolution API
3. Procese y almacene los grupos en Supabase

### 2. Verificar Configuración

Asegúrate de que tu perfil tenga:
- `evolution_instance_name`: Nombre de tu instancia de Evolution
- `evolution_api_key`: Tu API key de Evolution

Puedes verificar esto en la tabla `profiles`:
```sql
SELECT id, evolution_instance_name, evolution_api_key 
FROM profiles 
WHERE id = 'tu-user-id';
```

## Uso en la Interfaz

### Ver Grupos en el Chat

1. Abre el panel de Chats
2. Haz clic en el botón "Grupos" en el toggle superior
3. Verás la lista de todos tus grupos de WhatsApp
4. Haz clic en un grupo para abrir la conversación

### Enviar Mensajes a Grupos

1. Selecciona un grupo de la lista
2. Escribe tu mensaje en el campo de texto
3. Presiona Enter o haz clic en el botón de enviar
4. El mensaje se enviará al grupo y se guardará en el historial

### Sincronización Automática

Los grupos se pueden sincronizar:
- Manualmente desde la interfaz (si se implementa un botón)
- Automáticamente mediante un workflow de n8n programado
- Cuando se recibe un mensaje de un grupo nuevo

## Estructura de Datos

### Tabla `whatsapp_groups`
Almacena información de los grupos:
- `group_jid`: ID único del grupo (termina en `@g.us`)
- `group_name`: Nombre del grupo
- `group_participants`: JSON con lista de participantes
- `group_admins`: JSON con lista de administradores
- `participant_count`: Número de participantes

### Tabla `group_chat_history`
Almacena el historial de mensajes de grupos:
- `group_id`: Referencia al grupo
- `content`: Contenido del mensaje
- `sender_jid`: JID del remitente
- `sender_name`: Nombre del remitente
- `message_type`: 'human' o 'ai'

## Troubleshooting

### Los grupos no aparecen

1. **Verifica la sincronización**: Asegúrate de haber ejecutado la sincronización de grupos
2. **Verifica permisos**: El número de WhatsApp debe estar conectado y tener acceso a los grupos
3. **Verifica la API**: Prueba el endpoint de Evolution API directamente:
   ```bash
   curl -X GET "https://tu-evolution-api.com/group/fetchAllGroups/tu-instance" \
     -H "apikey: tu-api-key"
   ```

### Los mensajes no se envían

1. **Verifica el webhook**: El webhook `manual-send-group` debe estar configurado en n8n
2. **Verifica permisos**: Debes ser miembro del grupo para enviar mensajes
3. **Verifica la configuración**: Asegúrate de que `evolution_instance_name` y `evolution_api_key` estén correctos

### Los grupos no se actualizan

1. **Sincroniza manualmente**: Ejecuta la función `sync-groups` nuevamente
2. **Verifica webhooks**: Los webhooks de Evolution API deben estar configurados para recibir actualizaciones de grupos
3. **Verifica la frecuencia**: Los grupos se actualizan cuando:
   - Se recibe un mensaje nuevo (si está configurado el webhook)
   - Se ejecuta la sincronización manual
   - Se ejecuta el workflow programado de n8n

### Los mensajes de grupos no se reciben automáticamente

1. **Verifica el workflow**: El workflow "Recibir Mensajes de Grupos" debe estar activo en n8n
2. **Verifica la configuración del webhook**: Evolution API debe estar configurado para enviar mensajes de grupos
3. **Verifica que el grupo existe**: El grupo debe estar sincronizado en Supabase antes de recibir mensajes
4. **Revisa los logs**: Consulta los logs de n8n para ver si hay errores en el procesamiento

**Solución:** Ver `docs/WEBHOOKS_GRUPOS_SETUP.md` para instrucciones detalladas de configuración.

## Notas Importantes

1. **JID de Grupos**: Los grupos tienen JID que termina en `@g.us` (vs `@s.whatsapp.net` para contactos individuales)
2. **Permisos**: Solo puedes gestionar grupos donde eres administrador
3. **Sincronización**: Los grupos pueden cambiar frecuentemente (participantes, nombre), por lo que se recomienda sincronizar periódicamente
4. **RLS**: Los grupos están protegidos por Row Level Security, cada usuario solo ve sus propios grupos

## Control de IA para Grupos

### Habilitar/Deshabilitar IA

Cada grupo puede tener la IA habilitada o deshabilitada individualmente.

**En la UI:**
1. Abre un grupo en el panel de Chats
2. Haz clic en "Ver detalles"
3. Activa/desactiva el toggle "IA Habilitada"

**En la base de datos:**
```sql
-- Deshabilitar IA para un grupo
UPDATE whatsapp_groups
SET ai_enabled = false
WHERE id = 1; -- ID del grupo

-- Habilitar IA para un grupo
UPDATE whatsapp_groups
SET ai_enabled = true
WHERE id = 1;
```

**En el workflow de n8n:**
El workflow debe verificar `ai_enabled` antes de procesar con IA. Ver `docs/CONTROL_IA_GRUPOS.md` para instrucciones detalladas.

## Recepción Automática de Mensajes

### Estado Actual

✅ **Workflow disponible:** `n8n/Recibir Mensajes de Grupos.json`
⚠️ **Pendiente:** Configurar Evolution API para enviar mensajes de grupos al webhook

### Configuración

Para recibir mensajes de grupos automáticamente:

1. **Importa el workflow** `Recibir Mensajes de Grupos.json` en n8n
2. **Activa el workflow** para que el webhook esté disponible
3. **Configura Evolution API** para enviar mensajes de grupos al webhook
4. **Verifica** que los mensajes se guardan correctamente

**Documentación completa:** Ver `docs/WEBHOOKS_GRUPOS_SETUP.md`

### Ventajas

- Los mensajes se guardan automáticamente sin intervención manual
- Los mensajes aparecen en tiempo real en la UI
- No es necesario sincronizar manualmente para ver mensajes nuevos

## Próximos Pasos

- ✅ Implementar workflow para recibir mensajes automáticamente (completado)
- ⚠️ Configurar Evolution API para webhooks de grupos (pendiente)
- Implementar sincronización automática periódica
- Agregar gestión de participantes (agregar/remover)
- Agregar opciones de administración de grupos
- Implementar notificaciones de nuevos mensajes en grupos

