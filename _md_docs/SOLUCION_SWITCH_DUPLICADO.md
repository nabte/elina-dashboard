# 🔧 Solución: Switch Envía Texto e Imagen Duplicados

## 🐛 Problema

El switch `Switch tipo de mensaje1` estaba enviando **dos mensajes** cuando había imagen con texto:
1. Primero enviaba el texto por separado
2. Luego enviaba la imagen con caption

**Causa:** La condición de "texto" se estaba cumpliendo incluso cuando había imagen, porque la verificación de `url_imagen` vacío no funcionaba correctamente.

---

## ✅ Solución Implementada

### 1. **Mejora de las Condiciones de Imagen y Video**

**Antes:**
```javascript
leftValue: "={{ $('Definir destinatario1').item.json.url_imagen }}"
operation: "notEmpty"
```

**Después:**
```javascript
leftValue: "={{ ($('Definir destinatario1').item.json.url_imagen || '').toString().trim() }}"
operation: "notEmpty"
```

**Por qué:** Normaliza el valor a string, maneja `null`/`undefined`, y elimina espacios en blanco.

### 2. **Condición de Texto Más Estricta**

**Antes:**
```javascript
// Solo verificaba que existiera mensaje texto
operation: "exists"
```

**Después:**
```javascript
// Verifica que:
// 1. Existe mensaje texto
// 2. url_imagen está vacío (normalizado)
// 3. urlVideo está vacío (normalizado)
conditions: [
  { mensaje texto exists },
  { url_imagen.trim() === "" },
  { urlVideo.trim() === "" }
]
combinator: "and"
```

### 3. **Configuración del Switch**

```json
{
  "allMatchingOutputs": false,  // Solo ejecuta la primera regla que coincide
  "fallbackOutput": "none"       // No ejecuta nada si no hay coincidencias
}
```

---

## 📋 Orden de Evaluación (Importante)

El switch evalúa las reglas **en orden** y se detiene en la **primera que coincide**:

1. ✅ **"audio por ia"** - Si `messageType === "audio"`
2. ✅ **"audio"** - Si `content_type === "audio"`
3. ✅ **"imagen"** - Si `url_imagen` no está vacío ← **SE EVALÚA PRIMERO**
4. ✅ **"video"** - Si `urlVideo` no está vacío
5. ✅ **"texto"** - Solo si existe texto Y NO hay imagen Y NO hay video

---

## 🎯 Comportamiento Esperado

| Escenario | Regla que se Activa | Resultado |
|-----------|---------------------|-----------|
| **Imagen + Texto** | "imagen" (regla 3) | ✅ Solo envía imagen con caption |
| **Solo Imagen** | "imagen" (regla 3) | ✅ Solo envía imagen |
| **Video + Texto** | "video" (regla 4) | ✅ Solo envía video con caption |
| **Solo Video** | "video" (regla 4) | ✅ Solo envía video |
| **Solo Texto** | "texto" (regla 5) | ✅ Solo envía texto |
| **Audio** | "audio" (regla 2) | ✅ Solo envía audio |

---

## 🔍 Debugging

Si aún se envía texto e imagen:

### 1. Verifica los valores en "Definir destinatario1"

Abre el nodo `Definir destinatario1` y verifica:
- `url_imagen`: ¿Tiene valor o está vacío?
- `mensaje texto `: ¿Tiene valor?
- `urlVideo`: ¿Tiene valor o está vacío?

### 2. Verifica el orden de las reglas

En el switch, el orden debe ser:
1. audio por ia
2. audio
3. **imagen** ← Debe estar ANTES de texto
4. video
5. texto

### 3. Revisa los logs del switch

En n8n, abre una ejecución y revisa:
- ¿Qué regla se activó primero?
- ¿Los valores de las condiciones son correctos?

---

## 🛠️ Si el Problema Persiste

### Opción 1: Agregar un nodo Code antes del Switch

Crea un nodo Code que normalice los valores:

```javascript
const data = $input.first().json;

return [{
  json: {
    ...data,
    url_imagen: (data.url_imagen || '').toString().trim(),
    urlVideo: (data.urlVideo || '').toString().trim(),
    mensaje_texto: (data['mensaje texto '] || '').toString().trim()
  }
}];
```

### Opción 2: Usar un IF en lugar de Switch

Si el switch sigue dando problemas, puedes usar un IF anidado:

```
IF: ¿Hay imagen?
  → SÍ: Enviar imagem
  → NO: IF: ¿Hay video?
         → SÍ: Enviar video
         → NO: IF: ¿Hay texto?
                → SÍ: Enviar texto
```

---

## ✅ Cambios Realizados

1. ✅ Normalización de `url_imagen` y `urlVideo` en todas las condiciones
2. ✅ Condición de texto más estricta (verifica que NO hay imagen NI video)
3. ✅ Configuración `allMatchingOutputs: false` para evitar múltiples salidas
4. ✅ Orden correcto de las reglas (imagen antes de texto)

---

## 📝 Notas Importantes

- El switch evalúa las reglas **de arriba hacia abajo**
- Se detiene en la **primera regla que coincide**
- Si `allMatchingOutputs: false`, solo ejecuta una salida
- Las condiciones deben ser **mutuamente excluyentes** para evitar conflictos

