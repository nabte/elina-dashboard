# Guía de Pruebas - Workflows de Grupos

## 1. Sincronización de Grupos

### URL del Webhook
```
POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups
```

### Input de Prueba (JSON)

```json
{
  "user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f"
}
```

**Nota:** Reemplaza `user_id` con un UUID real de un usuario en tu base de datos.

### Cómo Obtener un user_id Real

**Opción 1: Desde Supabase Dashboard**
1. Ve a Supabase Dashboard → Table Editor → `profiles`
2. Copia el `id` de cualquier usuario que tenga `evolution_instance_name` y `evolution_api_key` configurados

**Opción 2: Desde la Consola del Navegador**
```javascript
// En la consola del navegador (F12) en tu app
const userId = window.auth.getSession()?.user?.id;
console.log('Tu user_id:', userId);
```

**Opción 3: Desde SQL en Supabase**
```sql
SELECT id, full_name, evolution_instance_name 
FROM profiles 
WHERE evolution_instance_name IS NOT NULL 
LIMIT 1;
```

### Probar desde n8n

1. Abre el workflow "Sincronización de Grupos" en n8n
2. Haz clic en el nodo "Webhook"
3. Haz clic en "Listen for Test Event" o "Execute Node"
4. En la pestaña "Test Workflow", pega este JSON:
```json
{
  "body": {
    "user_id": "TU_USER_ID_AQUI"
  }
}
```
5. Haz clic en "Execute Node"

### Probar desde la Consola del Navegador

```javascript
// Obtener tu user_id
const userId = window.auth.getSession()?.user?.id;

// Llamar al webhook
fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: userId
  })
})
.then(res => res.json())
.then(data => {
  console.log('Resultado:', data);
  alert('Grupos sincronizados! Revisa la consola para detalles.');
})
.catch(err => {
  console.error('Error:', err);
  alert('Error al sincronizar grupos. Revisa la consola.');
});
```

### Probar desde Postman/cURL

**Postman:**
- Method: `POST`
- URL: `https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f"
}
```

**cURL:**
```bash
curl -X POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups \
  -H "Content-Type: application/json" \
  -d '{"user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f"}'
```

---

## 2. Enviar Mensaje a Grupo

### URL del Webhook
```
POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send-group
```

### Input de Prueba (JSON) - Solo Texto

```json
{
  "user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f",
  "group_id": 1,
  "group_jid": "120363123456789012@g.us",
  "message": "Hola grupo! Este es un mensaje de prueba desde n8n.",
  "media_url": ""
}
```

### Input de Prueba (JSON) - Con Imagen

```json
{
  "user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f",
  "group_id": 1,
  "group_jid": "120363123456789012@g.us",
  "message": "Mira esta imagen!",
  "media_url": "https://creativersezone.b-cdn.net/imagen-ejemplo.jpg"
}
```

### Cómo Obtener group_id y group_jid Reales

**Opción 1: Desde Supabase Dashboard**
1. Ve a Supabase Dashboard → Table Editor → `whatsapp_groups`
2. Copia el `id` (group_id) y `group_jid` de un grupo

**Opción 2: Desde SQL en Supabase**
```sql
SELECT id, group_jid, group_name, participant_count
FROM whatsapp_groups
WHERE user_id = 'TU_USER_ID_AQUI'
LIMIT 5;
```

**Opción 3: Desde la Consola del Navegador (después de sincronizar)**
```javascript
// Obtener grupos del usuario actual
const userId = window.auth.getSession()?.user?.id;
const { data: groups } = await window.auth.sb
  .from('whatsapp_groups')
  .select('id, group_jid, group_name')
  .eq('user_id', userId)
  .limit(5);

console.log('Tus grupos:', groups);
// Usa groups[0].id como group_id y groups[0].group_jid
```

### Probar desde n8n

1. Abre el workflow "Enviar Mensaje a Grupo" en n8n
2. Haz clic en el nodo "Webhook"
3. Haz clic en "Listen for Test Event" o "Execute Node"
4. En la pestaña "Test Workflow", pega este JSON:
```json
{
  "body": {
    "user_id": "TU_USER_ID_AQUI",
    "group_id": 1,
    "group_jid": "120363123456789012@g.us",
    "message": "Mensaje de prueba",
    "media_url": ""
  }
}
```
5. Haz clic en "Execute Node"

### Probar desde la Consola del Navegador

```javascript
// Primero, obtener un grupo
const userId = window.auth.getSession()?.user?.id;
const { data: groups } = await window.auth.sb
  .from('whatsapp_groups')
  .select('id, group_jid, group_name')
  .eq('user_id', userId)
  .limit(1)
  .single();

if (!groups) {
  alert('No tienes grupos. Primero sincroniza grupos.');
  return;
}

// Enviar mensaje al primer grupo
fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send-group', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: userId,
    group_id: groups.id,
    group_jid: groups.group_jid,
    message: 'Hola grupo! Mensaje de prueba desde la consola.',
    media_url: ''
  })
})
.then(res => res.json())
.then(data => {
  console.log('Mensaje enviado:', data);
  alert('Mensaje enviado al grupo: ' + groups.group_name);
})
.catch(err => {
  console.error('Error:', err);
  alert('Error al enviar mensaje. Revisa la consola.');
});
```

### Probar desde Postman/cURL

**Postman:**
- Method: `POST`
- URL: `https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send-group`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f",
  "group_id": 1,
  "group_jid": "120363123456789012@g.us",
  "message": "Mensaje de prueba desde Postman",
  "media_url": ""
}
```

**cURL:**
```bash
curl -X POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send-group \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f",
    "group_id": 1,
    "group_jid": "120363123456789012@g.us",
    "message": "Mensaje de prueba desde cURL",
    "media_url": ""
  }'
```

---

## 3. Probar desde la Interfaz de la App

### Sincronizar Grupos

1. Abre la consola del navegador (F12)
2. Ejecuta este código:
```javascript
const userId = window.auth.getSession()?.user?.id;
fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: userId })
})
.then(r => r.json())
.then(d => {
  console.log('✅ Grupos sincronizados:', d);
  alert('Grupos sincronizados! Recarga la página de chats.');
})
.catch(e => {
  console.error('❌ Error:', e);
  alert('Error al sincronizar grupos');
});
```

3. Ve a la sección de Chats y haz clic en "Grupos"
4. Deberías ver tus grupos de WhatsApp

### Enviar Mensaje a Grupo

1. Ve a Chats → Grupos
2. Selecciona un grupo
3. Escribe un mensaje y envía
4. El mensaje se enviará automáticamente usando el webhook `manual-send-group`

---

## 4. Verificar Resultados

### Verificar Grupos Sincronizados

**Desde Supabase:**
```sql
SELECT 
  id,
  group_name,
  group_jid,
  participant_count,
  last_message_at,
  created_at
FROM whatsapp_groups
WHERE user_id = 'TU_USER_ID_AQUI'
ORDER BY last_message_at DESC NULLS LAST;
```

**Desde la Consola:**
```javascript
const userId = window.auth.getSession()?.user?.id;
const { data: groups } = await window.auth.sb
  .from('whatsapp_groups')
  .select('*')
  .eq('user_id', userId)
  .order('last_message_at', { ascending: false });

console.table(groups);
```

### Verificar Mensajes Enviados

**Desde Supabase:**
```sql
SELECT 
  id,
  group_id,
  content,
  sender_name,
  is_from_me,
  created_at
FROM group_chat_history
WHERE user_id = 'TU_USER_ID_AQUI'
ORDER BY created_at DESC
LIMIT 10;
```

**Desde la Consola:**
```javascript
const userId = window.auth.getSession()?.user?.id;
const { data: messages } = await window.auth.sb
  .from('group_chat_history')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);

console.table(messages);
```

---

## 5. Troubleshooting

### Error: "user_id es requerido"
- Asegúrate de incluir `user_id` en el body del request
- Verifica que el JSON esté bien formateado

### Error: "No se pudo obtener el perfil del usuario"
- Verifica que el `user_id` existe en la tabla `profiles`
- Verifica que el usuario tenga `evolution_instance_name` y `evolution_api_key` configurados

### Error: "Error al obtener grupos"
- Verifica que la instancia de Evolution API esté funcionando
- Verifica que el `evolution_instance_name` sea correcto
- Verifica que el `evolution_api_key` sea válido
- Prueba el endpoint directamente:
  ```bash
  curl -X GET "https://evolutionapi-evolution-api.mcjhhb.easypanel.host/group/fetchAllGroups/TU_INSTANCE_NAME" \
    -H "apikey: TU_API_KEY"
  ```

### No aparecen grupos después de sincronizar
- Verifica que el endpoint de Evolution API devuelva grupos
- Revisa los logs de n8n para ver errores
- Verifica que los grupos tengan JID que termine en `@g.us`

### El mensaje no se envía al grupo
- Verifica que el `group_jid` sea correcto (debe terminar en `@g.us`)
- Verifica que el usuario sea miembro del grupo
- Verifica que la instancia de Evolution API esté conectada
- Revisa los logs de n8n para ver errores específicos

