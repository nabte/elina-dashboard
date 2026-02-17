# Solución: Error de Sincronización de Grupos

## ✅ Problemas Resueltos

### 1. Error SQL: "column reference 'group_id' is ambiguous"

**Estado:** ✅ CORREGIDO

La función `get_recent_groups()` tenía una referencia ambigua a `group_id` en el JOIN lateral. Se corrigió calificando las columnas con el alias de la tabla.

**Migración aplicada:** `fix_get_recent_groups_ambiguous_column`

### 2. Webhook de n8n no recibe datos

**Estado:** 🔧 REQUIERE VERIFICACIÓN

El código JavaScript está enviando correctamente los datos, pero el workflow de n8n puede no estar recibiéndolos. Sigue estos pasos:

## 🔍 Pasos para Verificar y Corregir

### Paso 1: Verificar que el Workflow esté Activo

1. Abre n8n: `https://n8n-n8n.mcjhhb.easypanel.host`
2. Busca el workflow "Sincronización de Grupos"
3. **Asegúrate de que esté ACTIVO** (debe tener el toggle verde)
4. Si no está activo, actívalo

### Paso 2: Verificar la Configuración del Webhook

1. Abre el workflow "Sincronización de Grupos"
2. Haz clic en el nodo "Webhook"
3. Verifica que:
   - **Path:** `sync-groups`
   - **Method:** `POST`
   - **Production mode:** Activado (si está disponible)

### Paso 3: Verificar el Acceso al Body

El workflow actualmente espera: `$('Webhook').item.json.body.user_id`

Pero n8n puede recibir el body directamente. Hay dos opciones:

#### Opción A: Modificar el Workflow (RECOMENDADO)

Cambia todas las referencias de:
```
$('Webhook').item.json.body.user_id
```

A:
```
$('Webhook').item.json.user_id
```

O mejor aún, usa un nodo "Code" al inicio para normalizar:

```javascript
const body = $input.item.json.body || $input.item.json;
return [{
  json: {
    user_id: body.user_id || body.body?.user_id
  }
}];
```

#### Opción B: Modificar el Código JavaScript

Si prefieres no tocar el workflow, puedes modificar `chats.js` para enviar el body envuelto:

```javascript
body: JSON.stringify({ body: { user_id: userId } })
```

**NOTA:** La Opción A es mejor porque normaliza el acceso al body.

### Paso 4: Probar el Webhook Directamente

Abre la consola del navegador y ejecuta:

```javascript
const userId = window.auth.getSession()?.user?.id;
console.log('User ID:', userId);

fetch('https://n8n-n8n.mcjhhb.easypanel.host/webhook/sync-groups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: userId })
})
.then(r => {
  console.log('Status:', r.status);
  return r.text();
})
.then(text => {
  console.log('Response:', text);
})
.catch(e => console.error('Error:', e));
```

### Paso 5: Verificar los Logs de n8n

1. En n8n, ve a "Executions"
2. Busca la ejecución más reciente del workflow
3. Revisa qué datos recibió el nodo "Webhook"
4. Verifica si hay errores en los nodos siguientes

## 🛠️ Corrección Rápida (Temporal)

Si necesitas una solución rápida mientras corriges el workflow, puedes modificar temporalmente `chats.js`:

```javascript
// En la función syncGroups(), cambia esta línea:
body: JSON.stringify({ user_id: userId })

// Por esta:
body: JSON.stringify({ body: { user_id: userId } })
```

**⚠️ IMPORTANTE:** Esto es solo temporal. La mejor solución es corregir el workflow como se indica en la Opción A.

## 📝 Logging Agregado

He agregado logging detallado en `chats.js` para ayudar a debuggear:

- Log del user_id antes de enviar
- Log del request body
- Log de la respuesta (status, headers)
- Log del resultado
- Log de errores con stack trace

Revisa la consola del navegador para ver estos logs cuando hagas clic en "Sincronizar Grupos".

## ✅ Checklist de Verificación

- [ ] Workflow "Sincronización de Grupos" está ACTIVO en n8n
- [ ] El path del webhook es `sync-groups`
- [ ] El método es `POST`
- [ ] Se corrigió el acceso al body en el workflow (Opción A) o se modificó el código JS (Opción B)
- [ ] Se probó el webhook directamente desde la consola
- [ ] Se revisaron los logs de ejecución en n8n
- [ ] La función SQL `get_recent_groups()` está corregida (migración aplicada)

## 🐛 Si Aún No Funciona

1. **Verifica CORS:** Asegúrate de que n8n permita requests desde tu dominio
2. **Verifica la URL:** Confirma que la URL del webhook sea correcta
3. **Revisa la consola:** Los nuevos logs deberían mostrar exactamente qué se está enviando
4. **Revisa n8n:** Los logs de ejecución mostrarán qué recibió el webhook

---

**Última actualización:** Diciembre 2025

