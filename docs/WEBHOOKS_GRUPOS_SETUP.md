# Configuración de Webhooks para Mensajes de Grupos

Esta guía explica cómo configurar webhooks en Evolution API para recibir mensajes de grupos automáticamente.

## Resumen

Actualmente, el sistema tiene un webhook configurado para mensajes individuales (`/webhook/a/messages-upsert`), pero **no procesa mensajes de grupos automáticamente**. Este documento explica cómo agregar soporte para grupos.

## Opciones de Implementación

### Opción 1: Usar el Mismo Webhook (Recomendada)

**Ventaja:** No requiere cambios en Evolution API, solo modificar el workflow existente.

**Cómo funciona:**
1. El webhook actual (`/webhook/a/messages-upsert`) ya recibe TODOS los mensajes, incluyendo grupos
2. El workflow "Elina V4 (1).json" actualmente solo procesa mensajes de contactos (`@s.whatsapp.net`)
3. Podemos agregar lógica para detectar grupos (`@g.us`) y procesarlos

**Pasos:**
1. Modificar el workflow "Elina V4 (1).json" para detectar grupos
2. Agregar un nodo IF después del Webhook1 que verifique si `remoteJid.includes('@g.us')`
3. Si es grupo, redirigir a un subflujo que guarde en `group_chat_history`
4. Si es contacto, continuar con el flujo actual

### Opción 2: Webhook Separado para Grupos

**Ventaja:** Separación clara de responsabilidades, más fácil de mantener.

**Cómo funciona:**
1. Crear un nuevo webhook en n8n: `/webhook/group-messages`
2. Configurar Evolution API para enviar mensajes de grupos a este webhook
3. Usar el workflow "Recibir Mensajes de Grupos.json" creado

**Pasos:**
1. Importar el workflow "Recibir Mensajes de Grupos.json" en n8n
2. Activar el workflow
3. Configurar Evolution API para usar este webhook (ver sección de configuración)

## Configuración en Evolution API

### Para Opción 1 (Mismo Webhook)

No se requiere configuración adicional. El webhook ya está configurado y recibe todos los mensajes.

### Para Opción 2 (Webhook Separado)

Necesitas configurar Evolution API para enviar mensajes de grupos a un webhook específico.

**Endpoint de Evolution API:**
```
POST /webhook/set/{instance}
```

**Body:**
```json
{
  "url": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/group-messages",
  "webhook_by_events": true,
  "events": [
    "messages.upsert"
  ],
  "webhook_base64": false,
  "webhook_by_events_whitelist": ["@g.us"]
}
```

**Nota:** El parámetro `webhook_by_events_whitelist` con `["@g.us"]` filtra solo mensajes de grupos.

**Ejemplo con cURL:**
```bash
curl -X POST "https://evolutionapi-evolution-api.mcjhhb.easypanel.host/webhook/set/TU_INSTANCE" \
  -H "apikey: TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://n8n-n8n.mcjhhb.easypanel.host/webhook/group-messages",
    "webhook_by_events": true,
    "events": ["messages.upsert"],
    "webhook_base64": false,
    "webhook_by_events_whitelist": ["@g.us"]
  }'
```

## Estructura del Payload del Webhook

Evolution API envía mensajes con esta estructura:

```json
{
  "body": {
    "instance": "nombre-instancia",
    "apikey": "api-key",
    "data": {
      "key": {
        "remoteJid": "120363123456789012@g.us",
        "fromMe": false,
        "id": "message-id",
        "participant": "5211234567890@s.whatsapp.net"
      },
      "message": {
        "conversation": "Texto del mensaje",
        "extendedTextMessage": {
          "text": "Texto extendido"
        },
        "imageMessage": {
          "caption": "Texto de imagen",
          "url": "https://..."
        }
      },
      "pushName": "Nombre del Remitente",
      "messageType": "conversation",
      "messageTimestamp": 1234567890,
      "date_time": "2025-12-12T00:00:00.000Z"
    }
  }
}
```

**Identificación de Grupos:**
- Grupos: `remoteJid` termina en `@g.us` (ej: `120363123456789012@g.us`)
- Contactos: `remoteJid` termina en `@s.whatsapp.net` (ej: `5211234567890@s.whatsapp.net`)

## Workflow: Recibir Mensajes de Grupos

El workflow `Recibir Mensajes de Grupos.json` realiza las siguientes acciones:

1. **Webhook: Mensajes de Grupos** - Recibe el mensaje de Evolution API
2. **1. Detectar y Extraer Mensaje de Grupo** - Verifica si es grupo y extrae datos
3. **2. IF: ¿Es Grupo?** - Filtra solo grupos
4. **3. Obtener Grupo de Supabase** - Busca el grupo en la base de datos
5. **4. IF: ¿Grupo Existe?** - Verifica que el grupo esté sincronizado
6. **5. Preparar Mensaje para Guardar** - Formatea los datos del mensaje
7. **6. Guardar Mensaje en Supabase** - Inserta en `group_chat_history`
8. **7. Actualizar last_message_at** - Actualiza el timestamp del grupo
9. **8. Preparar Respuesta** - Prepara respuesta de éxito
10. **9. Responder** - Responde al webhook

## Pruebas

### Probar el Webhook

**Opción 1: Desde n8n**
1. Abre el workflow "Recibir Mensajes de Grupos"
2. Haz clic en el nodo "Webhook: Mensajes de Grupos"
3. Copia la URL del webhook
4. Usa "Execute Workflow" para probar con datos de ejemplo

**Opción 2: Desde Postman/cURL**
```bash
curl -X POST "https://n8n-n8n.mcjhhb.easypanel.host/webhook/group-messages" \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "instance": "tu-instancia",
      "apikey": "tu-api-key",
      "data": {
        "key": {
          "remoteJid": "120363123456789012@g.us",
          "fromMe": false,
          "id": "test-message-id"
        },
        "message": {
          "conversation": "Mensaje de prueba desde grupo"
        },
        "pushName": "Usuario de Prueba",
        "messageType": "conversation",
        "date_time": "2025-12-12T00:00:00.000Z"
      }
    }
  }'
```

### Verificar que el Mensaje se Guardó

```sql
-- En Supabase SQL Editor
SELECT 
  gch.*,
  wg.group_name
FROM group_chat_history gch
JOIN whatsapp_groups wg ON gch.group_id = wg.id
WHERE wg.group_jid = '120363123456789012@g.us'
ORDER BY gch.created_at DESC
LIMIT 10;
```

## Troubleshooting

### El mensaje no se guarda

1. **Verifica que el grupo existe en Supabase:**
   ```sql
   SELECT * FROM whatsapp_groups 
   WHERE group_jid = 'TU_GROUP_JID';
   ```

2. **Verifica que el webhook está activo:**
   - En n8n, verifica que el workflow está activado
   - Verifica que el webhook tiene la URL correcta

3. **Revisa los logs de n8n:**
   - Ve a "Executions" en n8n
   - Busca ejecuciones fallidas del workflow
   - Revisa los errores en cada nodo

### El webhook no recibe mensajes

1. **Verifica la configuración en Evolution API:**
   ```bash
   curl -X GET "https://evolutionapi-evolution-api.mcjhhb.easypanel.host/webhook/find/TU_INSTANCE" \
     -H "apikey: TU_API_KEY"
   ```

2. **Verifica que el webhook está configurado correctamente:**
   - La URL debe ser accesible públicamente
   - Debe usar HTTPS (no HTTP)
   - No debe tener errores de SSL

### Los mensajes se guardan pero no aparecen en la UI

1. **Verifica Supabase Realtime:**
   - Asegúrate de que Realtime está habilitado en Supabase
   - Verifica que `chats.js` tiene la suscripción activa

2. **Verifica que el grupo está sincronizado:**
   - Ejecuta la sincronización de grupos manualmente
   - Verifica que el `group_id` en `group_chat_history` corresponde al grupo correcto

## Recomendaciones

1. **Usar Opción 1 (Mismo Webhook):** Es más simple y no requiere cambios en Evolution API
2. **Mantener sincronización manual:** Los grupos pueden cambiar (participantes, nombre), sincroniza periódicamente
3. **Monitorear logs:** Revisa regularmente los logs de n8n para detectar errores
4. **Probar en desarrollo:** Prueba primero con un grupo de prueba antes de activar en producción

## Próximos Pasos

1. Implementar detección de grupos en el workflow principal (Opción 1)
2. Configurar webhook en Evolution API (si usas Opción 2)
3. Probar recepción de mensajes
4. Verificar que los mensajes aparecen en la UI
5. Configurar sincronización automática periódica (opcional)

---

**Última actualización:** 12 de Diciembre, 2025
**Versión:** 1.0

