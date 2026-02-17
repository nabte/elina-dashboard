# Cómo Ver y Usar Grupos en Chats

## ✅ Problema Resuelto

He corregido los IDs del HTML para que coincidan con el JavaScript. Ahora los grupos deberían aparecer correctamente.

## 📋 Pasos para Ver los Grupos

### 1. Sincronizar Grupos Primero

Antes de ver los grupos, necesitas sincronizarlos desde Evolution API. Tienes **tres opciones**:

#### ✅ Opción A: Botón de Sincronización en la Interfaz (RECOMENDADO)

1. **Abre la página de Chats**
2. **Haz clic en el botón "Grupos"** (el toggle junto a "Contactos")
3. **Verás un botón verde "Sincronizar Grupos"** arriba del campo de búsqueda
4. **Haz clic en "Sincronizar Grupos"**
5. El botón mostrará "Sincronizando..." y un spinner
6. Cuando termine, verás un mensaje de éxito y la lista se actualizará automáticamente

¡Es así de fácil! 🎉

#### Opción B: Desde la Consola del Navegador (Alternativa)

Abre la consola del navegador (F12) y ejecuta:

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
  // Recargar la página para ver los grupos
  location.reload();
})
.catch(e => {
  console.error('❌ Error:', e);
  alert('Error: ' + e.message);
});
```

#### Opción C: Desde n8n (Para pruebas avanzadas)

1. Abre el workflow "Sincronización de Grupos" en n8n
2. Haz clic en "Execute Workflow"
3. Pega este JSON:
```json
{
  "body": {
    "user_id": "TU_USER_ID_AQUI"
  }
}
```

### 2. Ver los Grupos en la Interfaz

1. **Abre la página de Chats** en tu aplicación
2. **Haz clic en el botón "Grupos"** (el toggle que dice "Grupos" junto a "Contactos")
3. **Verás el botón verde "Sincronizar Grupos"** - úsalo si no has sincronizado antes
4. **Los grupos aparecerán** en la lista lateral después de sincronizar

**Nota:** Si ya sincronizaste antes, los grupos aparecerán automáticamente al cambiar a la vista de grupos.

Si no aparecen grupos:
- Haz clic en "Sincronizar Grupos" para actualizar la lista
- Verifica que la sincronización se completó correctamente (verás un mensaje de éxito)
- Revisa la consola del navegador por errores
- Verifica que tienes grupos en WhatsApp conectados a tu instancia de Evolution API

## 💬 Cómo Interactuar con los Grupos

### Ver Mensajes de un Grupo

1. Haz clic en cualquier grupo de la lista
2. Se abrirá el chat del grupo mostrando:
   - Nombre del grupo en el header
   - Número de participantes
   - Historial de mensajes (si hay)
   - Nombre del remitente en cada mensaje

### Enviar Mensaje a un Grupo

1. Selecciona un grupo de la lista
2. Escribe tu mensaje en el campo de texto
3. Opcionalmente, adjunta una imagen usando el botón de clip 📎
4. Presiona Enter o haz clic en el botón de enviar

### Buscar Grupos

1. Haz clic en el botón "Grupos" para cambiar a la vista de grupos
2. Usa el campo de búsqueda en la parte superior
3. Escribe el nombre del grupo que buscas

## 🔍 Verificar que los Grupos Están en la Base de Datos

Si quieres verificar que los grupos se guardaron correctamente, ejecuta esto en la consola:

```javascript
const userId = window.auth.getSession()?.user?.id;
const { data: groups } = await window.auth.sb
  .from('whatsapp_groups')
  .select('id, group_jid, group_name, participant_count')
  .eq('user_id', userId);
console.table(groups);
```

Esto mostrará una tabla con todos tus grupos.

## 🐛 Troubleshooting

### Los grupos no aparecen después de sincronizar

1. **Verifica que la sincronización fue exitosa:**
   - Revisa la respuesta del webhook en la consola
   - Debería mostrar un mensaje de éxito

2. **Verifica que hay grupos en la base de datos:**
   ```javascript
   const userId = window.auth.getSession()?.user?.id;
   const { data, error } = await window.auth.sb
     .from('whatsapp_groups')
     .select('*')
     .eq('user_id', userId);
   console.log('Grupos:', data);
   ```

3. **Verifica que la función RPC existe:**
   - Abre Supabase SQL Editor
   - Ejecuta: `SELECT * FROM get_recent_groups();`
   - Debería devolver tus grupos

4. **Recarga la página:**
   - A veces necesitas recargar la página después de sincronizar
   - Presiona F5 o Ctrl+R

### El botón "Grupos" no hace nada

1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que `chats.js` se está cargando correctamente

### Los mensajes no se envían

1. Verifica que el grupo está seleccionado (debería aparecer el nombre en el header)
2. Verifica que tienes conexión a Evolution API
3. Revisa la consola por errores

## 📝 Notas Importantes

- Los grupos se sincronizan desde Evolution API, no se crean manualmente
- Solo verás grupos donde eres miembro en WhatsApp
- Los mensajes enviados desde la app se guardan en `group_chat_history`
- Los mensajes recibidos se guardan automáticamente si hay webhooks configurados

## 🎯 Próximos Pasos

1. Sincroniza tus grupos usando uno de los métodos arriba
2. Recarga la página de chats
3. Haz clic en "Grupos" para ver la lista
4. Selecciona un grupo para empezar a chatear

---

**Última actualización:** Diciembre 2025

