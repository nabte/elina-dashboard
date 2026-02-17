# Solución: Error "input values have 3 keys" en Simple Memory

## Problema
El nodo Memory Buffer Window está recibiendo un objeto con 3 claves (`input`, `system_message`, y probablemente otra) del AI Agent, y no sabe cuál usar.

## Solución 1: Configurar Input Key en el Memory (RECOMENDADO)

En el nodo **"Simple Memory"**, agrega la configuración de `inputKey` en las opciones avanzadas:

### Configuración completa del nodo "Simple Memory":

```json
{
  "parameters": {
    "sessionIdType": "customKey",
    "sessionKey": "={{ $json.phone }}",
    "contextWindowLength": 30,
    "options": {
      "inputKey": "input"
    }
  },
  "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
  "typeVersion": 1.3
}
```

**Pasos:**
1. Abre el nodo "Simple Memory"
2. Haz clic en "Options" o "Opciones avanzadas"
3. Busca el campo "Input Key" o "Input Data Key"
4. Escribe: `input`
5. Guarda

## Solución 2: Modificar el AI Agent para pasar solo una clave

Si la Solución 1 no funciona, modifica el nodo **"AI Agent1"** para que pase los datos en el formato correcto.

### En el campo "Options" del AI Agent, agrega:

```json
{
  "options": {
    "memoryInputKey": "input"
  }
}
```

## Solución 3: Usar un nodo Code antes del Memory (WORKAROUND)

Si las soluciones anteriores no funcionan, agrega un nodo Code entre el AI Agent y el Memory que unifique los datos:

**Nodo: "Normalizar para Memory"**
- Tipo: `Code`
- Código:

```javascript
// El Memory recibe datos del AI Agent con múltiples claves
// Necesitamos unificar en una sola clave 'input'

const inputData = $input.item.json;

// Si viene con 'values', extraer 'input' de ahí
let textInput = '';
if (inputData.values && inputData.values.input !== undefined) {
  textInput = inputData.values.input || '';
} else if (inputData.input !== undefined) {
  textInput = inputData.input || '';
} else if (inputData.text !== undefined) {
  textInput = inputData.text || '';
} else {
  // Tomar la primera clave que no sea 'action' o 'system_message'
  const keys = Object.keys(inputData).filter(k => 
    k !== 'action' && k !== 'system_message' && k !== 'values'
  );
  if (keys.length > 0) {
    textInput = inputData[keys[0]] || '';
  }
}

// Retornar solo con la clave 'input'
return [{
  json: {
    input: textInput
  }
}];
```

**Nota:** Esta solución es un workaround y puede no funcionar correctamente porque el Memory es un sub-nodo del AI Agent y no se puede interponer código entre ellos.

## Solución 4: Cambiar el tipo de Memory (ÚLTIMA OPCIÓN)

Si nada funciona, considera usar un Memory diferente:

### Opción A: Memory Summary
```json
{
  "parameters": {
    "sessionIdType": "customKey",
    "sessionKey": "={{ $json.phone }}"
  },
  "type": "@n8n/n8n-nodes-langchain.memorySummary",
  "typeVersion": 1
}
```

### Opción B: Desactivar Memory temporalmente
Elimina la conexión del Memory al AI Agent temporalmente para verificar si el problema es específico del Memory Buffer Window.

## Verificación

Después de aplicar la Solución 1:
1. El Memory debería usar `input` como la clave principal
2. El error "input values have 3 keys" debería desaparecer
3. El Memory debería funcionar correctamente

## Debug

Si el error persiste, verifica qué claves está recibiendo el Memory:
1. Abre el nodo "Simple Memory"
2. Ve a "Output Logs"
3. Revisa el "Input" para ver todas las claves que recibe
4. Usa esa información para configurar el `inputKey` correctamente

