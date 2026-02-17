# Guía Completa: Grupos de WhatsApp con Evolution API

## 📋 Tabla de Contenidos

1. [Resumen de Implementación](#resumen-de-implementación)
2. [Estructura de Base de Datos](#estructura-de-base-de-datos)
3. [Funciones RPC](#funciones-rpc)
4. [Edge Functions](#edge-functions)
5. [Modificaciones en Frontend](#modificaciones-en-frontend)
6. [Workflows de n8n](#workflows-de-n8n)
7. [Cómo Probar](#cómo-probar)
8. [Configuración de Evolution API](#configuración-de-evolution-api)
9. [Troubleshooting](#troubleshooting)
10. [Próximos Pasos](#próximos-pasos)

---

## Resumen de Implementación

Se implementó un sistema completo para gestionar grupos de WhatsApp usando Evolution API, incluyendo:

- ✅ Tablas de base de datos para grupos y mensajes de grupos
- ✅ Funciones RPC para consultar grupos
- ✅ Edge function para sincronizar grupos desde Evolution API
- ✅ Interfaz de usuario con toggle Contactos/Grupos
- ✅ Funcionalidad para enviar mensajes a grupos
- ✅ Workflows de n8n para sincronización y envío de mensajes
- ✅ Documentación completa

---

## Estructura de Base de Datos

### Tabla: `whatsapp_groups`

Almacena información de los grupos de WhatsApp.

**Archivo SQL:** `supabase/schema/20251204_add_whatsapp_groups.sql`

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_jid TEXT NOT NULL, -- ID del grupo (ej: 120363123456789012@g.us)
    group_name TEXT NOT NULL,
    group_description TEXT,
    group_participants JSONB DEFAULT '[]'::jsonb, -- Array de participantes
    group_admins JSONB DEFAULT '[]'::jsonb, -- Array de JIDs de administradores
    participant_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    last_message_at TIMESTAMPTZ,
    UNIQUE(user_id, group_jid)
);

-- Índices
CREATE INDEX IF NOT EXISTS whatsapp_groups_user_idx 
    ON public.whatsapp_groups (user_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS whatsapp_groups_jid_idx 
    ON public.whatsapp_groups (group_jid);
CREATE INDEX IF NOT EXISTS whatsapp_groups_archived_idx 
    ON public.whatsapp_groups (user_id, is_archived) WHERE is_archived = false;
```

**Estructura de `group_participants` (JSONB):**
```json
[
  {
    "jid": "5211234567890@s.whatsapp.net",
    "name": "Nombre del Participante",
    "is_admin": false
  }
]
```

**Estructura de `group_admins` (JSONB):**
```json
["5211234567890@s.whatsapp.net", "5219876543210@s.whatsapp.net"]
```

### Tabla: `group_chat_history`

Almacena el historial de mensajes de grupos.

```sql
CREATE TABLE IF NOT EXISTS public.group_chat_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES public.whatsapp_groups(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL DEFAULT 'human', -- 'human' o 'ai'
    content TEXT NOT NULL,
    sender_jid TEXT, -- JID del remitente
    sender_name TEXT, -- Nombre del remitente
    is_from_me BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS group_chat_history_group_idx 
    ON public.group_chat_history (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS group_chat_history_user_idx 
    ON public.group_chat_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS group_chat_history_sender_idx 
    ON public.group_chat_history (sender_jid);
```

**Trigger automático:**
- Actualiza `last_message_at` en `whatsapp_groups` cuando se inserta un mensaje

**RLS Policies:**
- Usuarios solo pueden ver/editar sus propios grupos y mensajes

---

## Funciones RPC

### Archivo: `supabase/schema/20251204_add_groups_functions.sql`

#### 1. `get_recent_groups()`

Obtiene grupos recientes ordenados por último mensaje.

```sql
SELECT * FROM get_recent_groups();
```

**Retorna:**
- `group_id` (bigint)
- `group_jid` (text)
- `group_name` (text)
- `group_description` (text)
- `participant_count` (integer)
- `last_message_at` (timestamptz)
- `last_message_content` (text)
- `last_message_sender` (text)
- `created_at` (timestamptz)

#### 2. `get_group_details(p_group_id bigint)`

Obtiene información detallada de un grupo.

```sql
SELECT get_group_details(1);
```

**Retorna:** JSONB con toda la información del grupo

#### 3. `is_group_admin(p_group_id bigint)`

Verifica si el usuario actual es administrador del grupo.

```sql
SELECT is_group_admin(1);
```

**Retorna:** `true` o `false`

---

## Edge Functions

### Archivo: `supabase/functions/sync-groups/index.ts`

**Endpoint:** `POST /functions/v1/sync-groups`

**Body:**
```json
{
  "user_id": "uuid-del-usuario"
}
```

**Funcionalidad:**
1. Obtiene perfil del usuario
2. Consulta grupos desde Evolution API: `GET /group/fetchAllGroups/{instance}`
3. Normaliza participantes y administradores
4. Hace upsert en lotes de 100 a Supabase
5. Actualiza estado de sincronización en `profiles.sync_status`

**Uso:**
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

---

## Modificaciones en Frontend

### Archivos Modificados

1. **`chats.html`** - Agregado toggle Contactos/Grupos
2. **`chats.js`** - Agregadas funciones para grupos

### Nuevas Funciones en `chats.js`

#### Variables Globales Agregadas
```javascript
let allRecentGroups = []; // Caché de grupos recientes
let currentViewMode = 'contacts'; // 'contacts' o 'groups'
let currentGroupId = null;
let currentGroup = null;
```

#### Funciones Principales

**`switchToContactsView()`**
- Cambia a vista de contactos
- Actualiza UI del toggle
- Carga lista de contactos

**`switchToGroupsView()`**
- Cambia a vista de grupos
- Actualiza UI del toggle
- Carga lista de grupos

**`loadGroupsList()`**
- Llama a `get_recent_groups()` RPC
- Renderiza grupos con icono distintivo
- Muestra nombre, participantes y último mensaje

**`loadChatForGroup(groupId)`**
- Carga historial del grupo desde `group_chat_history`
- Muestra nombre del remitente en cada mensaje
- Suscribe a cambios en tiempo real

**`appendGroupMessageToChat(msg, isInitialLoad)`**
- Renderiza mensajes de grupos
- Muestra nombre del remitente
- Maneja imágenes y texto

**`subscribeToGroupChatChanges()`**
- Suscribe a cambios en tiempo real del grupo
- Escucha nuevos mensajes en `group_chat_history`

**`handleSendGroupMessage(e, message, attachedFile)`**
- Envía mensaje al grupo vía Evolution API
- Guarda mensaje en `group_chat_history`
- Maneja imágenes y texto

**`handleSearch(e)`** (modificada)
- Ahora funciona para contactos y grupos
- Filtra según `currentViewMode`

### Cambios en HTML

**Toggle agregado en `chats.html`:**
```html
<div class="flex gap-2 mb-3 bg-slate-100 p-1 rounded-lg">
    <button id="toggle-contacts-btn" class="...">
        <i data-lucide="user"></i> Contactos
    </button>
    <button id="toggle-groups-btn" class="...">
        <i data-lucide="users"></i> Grupos
    </button>
</div>
```

**Información de grupo en header:**
```html
<p id="chat-group-info" class="text-xs text-slate-500 hidden"></p>
```

---

## Workflows de n8n

### 1. Sincronización de Grupos

**Archivo:** `n8n/Sincronización de Grupos.json`

**Webhook:** `POST /webhook/sync-groups`

**Body esperado:**
```json
{
  "user_id": "uuid-del-usuario"
}
```

**Flujo:**
1. Webhook recibe `user_id`
2. Obtiene perfil del usuario desde Supabase
3. Actualiza estado a "Sincronizando grupos..."
4. Intenta GET `/group/fetchAllGroups/{instance}`, si falla usa POST
5. Procesa y normaliza grupos (participantes, admins)
6. Hace upsert en lotes de 100 a Supabase
7. Actualiza estado a "Completado" con contador

**Nodos principales:**
- Webhook
- 1. Get User Profile
- Update Status: Iniciando
- 2. Get Groups (GET) / 2. Get Groups (POST)
- If GET Success
- 3. Procesar Grupos (Code)
- 4. Loop Over Groups
- 5. Upsert Groups to Supabase
- 6. Aggregate Groups
- 7. Set Fields
- 8. Update Status: Completado

### 2. Recibir Mensajes de Grupos (NUEVO)

**Archivo:** `n8n/Recibir Mensajes de Grupos.json`

**Webhook:** `POST /webhook/group-messages`

**Descripción:** Recibe mensajes entrantes de grupos automáticamente desde Evolution API y los guarda en `group_chat_history`.

**Flujo:**
1. Webhook recibe mensaje de Evolution API
2. Detecta si es un grupo (JID termina en `@g.us`)
3. Extrae información del mensaje (texto, imagen, audio, etc.)
4. Busca el grupo en Supabase
5. Si el grupo existe, guarda el mensaje en `group_chat_history`
6. Actualiza `last_message_at` del grupo
7. Responde con éxito

**Nodos principales:**
- Webhook: Mensajes de Grupos
- 1. Detectar y Extraer Mensaje de Grupo
- 2. IF: ¿Es Grupo?
- 3. Obtener Grupo de Supabase
- 4. IF: ¿Grupo Existe?
- 5. Preparar Mensaje para Guardar
- 6. Guardar Mensaje en Supabase
- 7. Actualizar last_message_at
- 8. Preparar Respuesta
- 9. Responder

**Configuración:**
- Ver `docs/WEBHOOKS_GRUPOS_SETUP.md` para instrucciones detalladas
- El webhook puede usar el mismo endpoint que mensajes individuales o uno separado
- Evolution API debe estar configurado para enviar mensajes de grupos a este webhook

**Nota:** Este workflow complementa la sincronización manual, permitiendo recibir mensajes en tiempo real sin necesidad de sincronizar manualmente.

### 3. Enviar Mensaje a Grupo

**Archivo:** `n8n/Enviar Mensaje a Grupo.json`

**Webhook:** `POST /webhook/manual-send-group`

**Body esperado:**
```json
{
  "user_id": "uuid-del-usuario",
  "group_id": 123,
  "group_jid": "120363123456789012@g.us",
  "message": "Texto del mensaje",
  "media_url": "https://..." // opcional
}
```

**Flujo:**
1. Webhook recibe datos del mensaje
2. Obtiene perfil del usuario
3. Obtiene información del grupo
4. Si hay `media_url`, envía imagen; si no, envía texto
5. Guarda mensaje en `group_chat_history`
6. Responde con éxito

**Nodos principales:**
- Webhook
- 1. Get User Profile
- 2. Get Group
- 3. IF: ¿Tiene Media?
- 4. Enviar Texto / 4. Enviar Imagen (Evolution API)
- 5. Preparar para Guardar (Code)
- 6. Guardar Mensaje
- 7. Responder

---

## Cómo Probar

### Opción 1: Desde la Consola del Navegador

**Sincronizar Grupos:**
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
  alert('Error: ' + e.message);
});
```

**Obtener Grupos para Probar:**
```javascript
const userId = window.auth.getSession()?.user?.id;
const { data: groups } = await window.auth.sb
  .from('whatsapp_groups')
  .select('id, group_jid, group_name, participant_count')
  .eq('user_id', userId);
console.table(groups);
```

**Enviar Mensaje a Grupo:**
```javascript
const userId = window.auth.getSession()?.user?.id;
const { data: groups } = await window.auth.sb
  .from('whatsapp_groups')
  .select('id, group_jid, group_name')
  .eq('user_id', userId)
  .limit(1)
  .single();

if (groups) {
  fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      group_id: groups.id,
      group_jid: groups.group_jid,
      message: 'Mensaje de prueba 🚀',
      media_url: ''
    })
  })
  .then(r => r.json())
  .then(d => {
    console.log('✅ Mensaje enviado:', d);
    alert('Mensaje enviado al grupo: ' + groups.group_name);
  })
  .catch(e => {
    console.error('❌ Error:', e);
    alert('Error: ' + e.message);
  });
}
```

### Opción 2: Desde n8n

**Para Sincronización de Grupos:**
1. Abre el workflow en n8n
2. Haz clic en el nodo "Webhook"
3. Haz clic en "Execute Workflow" o "Test workflow"
4. Pega este JSON:
```json
{
  "body": {
    "user_id": "TU_USER_ID_AQUI"
  }
}
```

**Para Enviar Mensaje:**
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

### Opción 3: Desde Postman/cURL

**Sincronizar Grupos:**
```bash
curl -X POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups \
  -H "Content-Type: application/json" \
  -d '{"user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f"}'
```

**Enviar Mensaje:**
```bash
curl -X POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send-group \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "f2ef49c6-4646-42f8-8130-aa5cd0d3c84f",
    "group_id": 1,
    "group_jid": "120363123456789012@g.us",
    "message": "Mensaje de prueba",
    "media_url": ""
  }'
```

### Obtener Datos Reales para Pruebas

**Obtener user_id:**
```javascript
// En consola del navegador
window.auth.getSession()?.user?.id
```

**Obtener grupos:**
```sql
-- En Supabase SQL Editor
SELECT id, group_jid, group_name, participant_count
FROM whatsapp_groups
WHERE user_id = 'TU_USER_ID_AQUI'
ORDER BY last_message_at DESC NULLS LAST
LIMIT 5;
```

---

## Configuración de Evolution API

### Endpoints Utilizados

1. **Obtener Grupos:**
   ```
   GET /group/fetchAllGroups/{instance}
   POST /group/fetchAllGroups/{instance}
   ```
   Headers: `apikey: tu-api-key`

2. **Enviar Mensaje a Grupo:**
   ```
   POST /messages-api/sendText/{instance}
   ```
   Body:
   ```json
   {
     "remoteJid": "120363123456789012@g.us",
     "messageText": "Mensaje a enviar"
   }
   ```

3. **Enviar Imagen a Grupo:**
   ```
   POST /messages-api/sendImage/{instance}
   ```
   Body:
   ```json
   {
     "remoteJid": "120363123456789012@g.us",
     "media": "https://url-de-imagen.jpg",
     "caption": "Texto opcional"
   }
   ```

### Identificación de Grupos

- **Grupos:** JID termina en `@g.us` (ej: `120363123456789012@g.us`)
- **Contactos:** JID termina en `@s.whatsapp.net` (ej: `5211234567890@s.whatsapp.net`)

### Verificar Configuración

**En Supabase:**
```sql
SELECT 
  id, 
  full_name,
  evolution_instance_name,
  evolution_api_key IS NOT NULL as has_api_key
FROM profiles
WHERE evolution_instance_name IS NOT NULL
LIMIT 5;
```

**Probar Endpoint Directamente:**
```bash
curl -X GET "https://evolutionapi-evolution-api.mcjhhb.easypanel.host/group/fetchAllGroups/TU_INSTANCE_NAME" \
  -H "apikey: TU_API_KEY"
```

---

## Troubleshooting

### Los grupos no aparecen después de sincronizar

**Verificar:**
1. ¿El endpoint de Evolution API devuelve grupos?
   ```bash
   curl -X GET "https://evolutionapi-evolution-api.mcjhhb.easypanel.host/group/fetchAllGroups/TU_INSTANCE" \
     -H "apikey: TU_API_KEY"
   ```

2. ¿Los grupos tienen JID válido (termina en `@g.us`)?
   ```sql
   SELECT group_jid, group_name 
   FROM whatsapp_groups 
   WHERE user_id = 'TU_USER_ID'
   LIMIT 5;
   ```

3. ¿Hay errores en los logs de n8n?
   - Revisa la ejecución del workflow en n8n
   - Verifica el nodo "3. Procesar Grupos" para ver qué datos recibe

### El mensaje no se envía al grupo

**Verificar:**
1. ¿El `group_jid` es correcto?
   - Debe terminar en `@g.us`
   - Debe ser el JID real del grupo

2. ¿El usuario es miembro del grupo?
   - Solo puedes enviar mensajes a grupos donde eres miembro

3. ¿La instancia de Evolution está conectada?
   ```sql
   SELECT evolution_instance_name, whatsapp_connected
   FROM profiles
   WHERE id = 'TU_USER_ID';
   ```

4. ¿Hay errores en el workflow de n8n?
   - Revisa el nodo "4. Enviar Texto" o "4. Enviar Imagen"
   - Verifica las credenciales de Evolution API

### Error: "user_id es requerido"

- Asegúrate de incluir `user_id` en el body del request
- Verifica que el JSON esté bien formateado
- Usa `Content-Type: application/json` en headers

### Error: "No se pudo obtener el perfil del usuario"

- Verifica que el `user_id` existe en la tabla `profiles`
- Verifica que el usuario tenga `evolution_instance_name` y `evolution_api_key` configurados

### Los grupos no se actualizan automáticamente

**Solución:**
- Los grupos se actualizan cuando:
  1. Se ejecuta la sincronización manual
  2. Se recibe un mensaje nuevo (si hay webhook configurado)
  3. Se ejecuta un workflow programado de n8n

**Para sincronización automática:**
- Crea un workflow programado en n8n que ejecute `sync-groups` periódicamente
- O configura webhooks en Evolution API para recibir actualizaciones

---

## Control de IA para Grupos

### Sistema de Control

Cada grupo puede tener la IA habilitada o deshabilitada, similar al sistema de "ignorar" para contactos.

**Campo en base de datos:**
- `whatsapp_groups.ai_enabled` (boolean, default: `true`)
  - `true`: La IA responde automáticamente a mensajes del grupo
  - `false`: La IA NO responde (similar a label "ignorar" en contactos)

**Toggle en UI:**
- Disponible en el panel de información del grupo (botón "Ver detalles")
- Similar al toggle "Ignorar con IA" para contactos
- Cambios se guardan automáticamente en la base de datos

**Verificación en workflow:**
- El workflow de n8n verifica `ai_enabled` antes de procesar con IA
- Si `ai_enabled = false`, el flujo se detiene y no se genera respuesta

**Documentación completa:** Ver `docs/CONTROL_IA_GRUPOS.md`

## Recepción Automática de Mensajes

### Estado Actual

✅ **Implementado:** Workflow para recibir mensajes de grupos automáticamente (`Recibir Mensajes de Grupos.json`)

⚠️ **Pendiente:** Configurar Evolution API para enviar mensajes de grupos al webhook

### Configuración

Hay dos opciones para recibir mensajes de grupos automáticamente:

**Opción 1: Usar el mismo webhook (Recomendada)**
- Modificar el workflow "Elina V4 (1).json" para detectar grupos
- No requiere cambios en Evolution API
- Ver `docs/WEBHOOKS_GRUPOS_SETUP.md` para detalles

**Opción 2: Webhook separado**
- Usar el workflow "Recibir Mensajes de Grupos.json"
- Configurar Evolution API para enviar grupos a `/webhook/group-messages`
- Ver `docs/WEBHOOKS_GRUPOS_SETUP.md` para instrucciones

### Ventajas de la Recepción Automática

- ✅ Los mensajes se guardan automáticamente sin intervención manual
- ✅ Los mensajes aparecen en tiempo real en la UI (gracias a Supabase Realtime)
- ✅ No es necesario sincronizar manualmente para ver mensajes nuevos
- ✅ Mejor experiencia de usuario

## Próximos Pasos

### Pendientes de Implementar

1. **Configurar Webhook de Grupos** ✅ (Workflow creado, falta configurar Evolution API)
   - Configurar Evolution API para enviar mensajes de grupos al webhook
   - Probar recepción automática de mensajes
   - Verificar que los mensajes aparecen en la UI

2. **Sincronización Automática Periódica**
   - Crear workflow programado en n8n para sincronizar grupos cada X horas
   - Esto actualiza información de grupos (participantes, nombre, etc.)

3. **Gestión de Participantes**
   - Agregar/remover participantes del grupo
   - Ver lista completa de participantes con información

3. **Panel de Información del Grupo**
   - Mostrar participantes del grupo
   - Listar administradores
   - Opciones de gestión (si es admin)

4. **Botón de Sincronización en UI**
   - Agregar botón en la interfaz para sincronizar grupos manualmente
   - Mostrar estado de sincronización

5. **Filtros y Búsqueda Avanzada**
   - Filtrar grupos por nombre
   - Filtrar por cantidad de participantes
   - Buscar grupos archivados

6. **Estadísticas de Grupos**
   - Mensajes por grupo
   - Participantes activos
   - Última actividad

### Mejoras Sugeridas

1. **Notificaciones**
   - Notificar cuando hay nuevos mensajes en grupos
   - Notificar cuando se agregan/remueven participantes

2. **Integración con IA**
   - Permitir que la IA responda en grupos
   - Configurar qué grupos pueden usar IA

3. **Mensajes Masivos a Grupos**
   - Extender funcionalidad de mensajes masivos para incluir grupos
   - Seleccionar múltiples grupos para enviar

4. **Exportar Datos**
   - Exportar historial de grupos
   - Exportar lista de participantes

---

## Archivos Creados/Modificados

### Nuevos Archivos

1. `supabase/schema/20251204_add_whatsapp_groups.sql` - Estructura de tablas
2. `supabase/schema/20251204_add_groups_functions.sql` - Funciones RPC
3. `supabase/functions/sync-groups/index.ts` - Edge function de sincronización
4. `n8n/Sincronización de Grupos.json` - Workflow de sincronización
5. `n8n/Enviar Mensaje a Grupo.json` - Workflow para enviar mensajes
6. `n8n/Recibir Mensajes de Grupos.json` - Workflow para recibir mensajes automáticamente (NUEVO)
7. `docs/EVOLUTION_GROUPS_SETUP.md` - Documentación de configuración
8. `docs/WEBHOOKS_GRUPOS_SETUP.md` - Guía de configuración de webhooks para grupos (NUEVO)
9. `n8n/TEST_GRUPOS.md` - Guía de pruebas
10. `GRUPOSCHATS.md` - Este documento

### Archivos Modificados

1. `chats.html` - Agregado toggle Contactos/Grupos
2. `chats.js` - Agregadas funciones para grupos

---

## Comandos SQL Útiles

### Verificar Estructura de Tablas

```sql
-- Ver estructura de whatsapp_groups
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'whatsapp_groups'
ORDER BY ordinal_position;

-- Ver estructura de group_chat_history
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_chat_history'
ORDER BY ordinal_position;
```

### Consultas Útiles

**Ver grupos de un usuario:**
```sql
SELECT 
  id,
  group_name,
  group_jid,
  participant_count,
  last_message_at,
  created_at
FROM whatsapp_groups
WHERE user_id = 'TU_USER_ID'
ORDER BY last_message_at DESC NULLS LAST;
```

**Ver mensajes de un grupo:**
```sql
SELECT 
  id,
  content,
  sender_name,
  is_from_me,
  created_at
FROM group_chat_history
WHERE group_id = 1
ORDER BY created_at DESC
LIMIT 20;
```

**Contar grupos por usuario:**
```sql
SELECT 
  user_id,
  COUNT(*) as total_grupos,
  SUM(participant_count) as total_participantes
FROM whatsapp_groups
GROUP BY user_id;
```

**Ver grupos sin mensajes:**
```sql
SELECT 
  g.id,
  g.group_name,
  g.created_at
FROM whatsapp_groups g
LEFT JOIN group_chat_history m ON g.id = m.group_id
WHERE m.id IS NULL
ORDER BY g.created_at DESC;
```

---

## Referencias Rápidas

### URLs Importantes

- **n8n Webhooks:**
  - Sincronizar grupos: `https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups`
  - Enviar mensaje: `https://n8n-n8n.mcjhhb.easypanel.host/webhook/manual-send-group`
  - Recibir mensajes de grupos: `https://n8n-n8n.mcjhhb.easypanel.host/webhook/group-messages` (NUEVO)

- **Evolution API:**
  - Base URL: `https://evolutionapi-evolution-api.mcjhhb.easypanel.host`
  - Obtener grupos: `/group/fetchAllGroups/{instance}`
  - Enviar texto: `/messages-api/sendText/{instance}`

- **Supabase:**
  - Edge Function: `https://tu-proyecto.supabase.co/functions/v1/sync-groups`

### IDs de Credenciales en n8n

- **Supabase account:** `mhKY7YSuY0L0jM2B`
- **Evolution account 3:** `1NdmmRm4cT4v7Ciq`

### Estructura de JID

- **Grupo:** `120363123456789012@g.us`
- **Contacto:** `5211234567890@s.whatsapp.net`

---

## Notas Importantes

1. **JID de Grupos:** Los grupos tienen JID que termina en `@g.us` (vs `@s.whatsapp.net` para contactos)
2. **Permisos:** Solo puedes gestionar grupos donde eres miembro
3. **Sincronización:** Los grupos pueden cambiar frecuentemente (participantes, nombre), se recomienda sincronizar periódicamente
4. **RLS:** Los grupos están protegidos por Row Level Security, cada usuario solo ve sus propios grupos
5. **Webhooks:** Los workflows de n8n deben estar activos para que funcionen los webhooks

---

## Contacto y Soporte

Para problemas o preguntas:
1. Revisa los logs de n8n en la ejecución del workflow
2. Revisa los logs de Supabase Edge Functions
3. Verifica la configuración de Evolution API
4. Consulta la documentación en `docs/EVOLUTION_GROUPS_SETUP.md`

---

**Última actualización:** 12 de Diciembre, 2025
**Versión:** 1.1

### Cambios en v1.1

- ✅ Agregado workflow para recibir mensajes de grupos automáticamente
- ✅ Documentación de configuración de webhooks (`docs/WEBHOOKS_GRUPOS_SETUP.md`)
- ✅ Evaluación de `findChats` vs `fetchAllGroups` (se mantiene `fetchAllGroups`)
- ✅ Mejoras en la documentación sobre recepción automática de mensajes

