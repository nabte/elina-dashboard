# Corrección del Workflow de Sincronización de Grupos en n8n

## ✅ Problemas Corregidos

### 1. Error: "The getParticipants needs to be informed in the query"

**Problema:** Evolution API requiere el parámetro `getParticipants` para obtener la información de participantes de los grupos.

**Solución aplicada:**
- **GET Request:** Agregado `?getParticipants=true` a la URL
- **POST Request:** Agregado `{"getParticipants": true}` al body JSON

### 2. Error: "Wrong type: 'AxiosError' is an object but was expecting a string"

**Problema:** El nodo IF estaba intentando comparar un objeto de error (AxiosError) como string, causando un error de tipo.

**Solución aplicada:**
- Cambiado `typeValidation` de `"strict"` a `"loose"`
- Modificada la condición para verificar si la respuesta es exitosa de manera más robusta:
  - Verifica si `$json` es un array (respuesta exitosa)
  - Verifica que no existan campos de error (`error`, `errorMessage`, `statusCode`)
  - Si es exitoso, devuelve `'success'`, de lo contrario `'error'`

## 📋 Cambios Realizados en el Workflow

### Nodo: "2. Get Groups (GET)"
```json
"url": "=https://evolutionapi-evolution-api.mcjhhb.easypanel.host/group/fetchAllGroups/{{ $('1. Get User Profile').item.json.evolution_instance_name }}?getParticipants=true"
```

### Nodo: "2. Get Groups (POST)"
```json
"jsonBody": "={\n  \"getParticipants\": true\n}"
```

### Nodo: "If GET Success"
```json
"leftValue": "={{ Array.isArray($json) || ($json && !$json.error && !$json.errorMessage && !$json.statusCode) ? 'success' : 'error' }}",
"rightValue": "success",
"typeValidation": "loose"
```

## 🔄 Cómo Aplicar los Cambios en n8n

### Opción 1: Importar el Workflow Corregido (RECOMENDADO)

1. Abre n8n
2. Ve a "Workflows"
3. Busca "Sincronización de Grupos"
4. Haz clic en los tres puntos (⋯) → "Import from File"
5. Selecciona el archivo `n8n/Sincronización de Grupos.json` actualizado
6. Confirma la importación

### Opción 2: Editar Manualmente

1. Abre el workflow "Sincronización de Grupos" en n8n
2. Para cada nodo, aplica los cambios:

#### Nodo "2. Get Groups (GET)":
- Haz clic en el nodo
- En "URL", agrega `?getParticipants=true` al final
- Guarda

#### Nodo "2. Get Groups (POST)":
- Haz clic en el nodo
- En "Body", cambia `{}` por:
```json
{
  "getParticipants": true
}
```
- Guarda

#### Nodo "If GET Success":
- Haz clic en el nodo
- En "Conditions", cambia:
  - **Type Validation:** De "Strict" a "Loose"
  - **Left Value:** Cambia a:
```
={{ Array.isArray($json) || ($json && !$json.error && !$json.errorMessage && !$json.statusCode) ? 'success' : 'error' }}
```
  - **Operation:** "equals"
  - **Right Value:** `success`
- Guarda

3. Activa el workflow si no está activo

## ✅ Verificación

Después de aplicar los cambios:

1. **Prueba el workflow:**
   - Haz clic en "Execute Workflow"
   - Usa este body de prueba:
   ```json
   {
     "body": {
       "user_id": "TU_USER_ID_AQUI"
     }
   }
   ```

2. **Verifica que:**
   - El nodo "2. Get Groups (GET)" o "2. Get Groups (POST)" se ejecute sin error 400
   - El nodo "If GET Success" evalúe correctamente
   - Los grupos se procesen correctamente

3. **Revisa los logs:**
   - Ve a "Executions"
   - Revisa la ejecución más reciente
   - Verifica que no haya errores en los nodos

## 🐛 Si Aún Hay Problemas

### Error 400: "getParticipants needs to be informed"
- Verifica que la URL del GET tenga `?getParticipants=true`
- Verifica que el body del POST tenga `{"getParticipants": true}`

### Error en el nodo IF
- Verifica que `typeValidation` esté en "loose"
- Verifica que la condición use la expresión correcta
- Prueba ejecutar el workflow paso a paso para ver qué datos recibe el nodo IF

### No se obtienen grupos
- Verifica que la instancia de Evolution API esté conectada
- Verifica que el `evolution_instance_name` y `evolution_api_key` estén correctos en el perfil del usuario
- Revisa los logs de Evolution API

---

**Última actualización:** Diciembre 2025

