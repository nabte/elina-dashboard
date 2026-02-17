# 🎯 Cómo Funcionan las Objeciones en el Contexto de Ventas

## 📋 ¿Qué son las Objeciones?

Las objeciones son **respuestas comunes de los clientes** que pueden impedir una venta, como:
- "Es muy caro"
- "Déjame pensarlo"
- "Lo consultaré con mi socio/esposa"
- "No estoy seguro"
- "Ya tengo otro proveedor"

## 🤖 ¿Cómo Funciona la Detección Automática?

### 1. La IA Detecta Automáticamente

Cuando un cliente escribe un mensaje, la IA analiza el texto y detecta si contiene una objeción.

**Ejemplo:**
```
Cliente: "Hmm, me parece un poco caro"
IA detecta: "Es muy caro" ✅
```

### 2. La IA Usa la Respuesta Configurada

Una vez detectada la objeción, la IA busca en el **Contexto de Ventas** cómo debe responder a esa objeción específica.

**Ejemplo de configuración:**
```
Objeción: "Es muy caro"
Respuesta: "Preguntar si el precio es el único problema o si hay dudas técnicas. Si dicen que sí, ofrecer facilidades de pago."
```

**Resultado en la conversación:**
```
Cliente: "Hmm, me parece un poco caro"

IA (usando el contexto): "Entiendo tu preocupación. ¿El precio es el único problema 
o hay alguna duda técnica sobre el producto? Si quitamos el precio de la ecuación, 
¿este producto solucionaría tu problema? Si el precio es lo único, podemos ofrecerte 
facilidades de pago para que sea más accesible."
```

## ✏️ Cómo Personalizar las Objeciones

### Opción 1: Generar Respuesta Automáticamente (Recomendado)

1. Ve a **"Contexto de Ventas"**
2. En la sección **"Objeciones detectadas automáticamente"**
3. Haz clic en el botón **🤖 (Generar respuesta para mi empresa)** en cualquier objeción
4. La IA usará:
   - Tu **prompt general** (configurado en el Dashboard)
   - La **información de tu empresa** (descripción, sitio web, redes sociales)
   - Para generar una respuesta personalizada
5. Revisa y edita la respuesta si lo deseas
6. Guarda el contexto

**💡 Consejo:** Activa el toggle "Generar respuestas automáticamente" para que el botón use siempre los datos más recientes de tu empresa.

### Opción 2: Editar Objeciones Existentes

1. Haz clic en el ícono de **lápiz ✏️** en la objeción
2. Edita el texto de la objeción o la respuesta
3. Haz clic en el **check ✓** para guardar

### Opción 3: Agregar Objeciones Personalizadas

1. Haz clic en **"Agregar objeción personalizada"**
2. Escribe la objeción exacta (ej: "Ya tengo otro proveedor")
3. Escribe cómo debe responder la IA (o usa el botón 🤖 para generarla)
4. La objeción se agregará como una tarjeta editable

### Opción 4: Eliminar Objeciones

1. Haz clic en la **X** para eliminar una objeción
2. Confirma la eliminación

## 🔄 Flujo Completo

```
1. Cliente escribe: "Me parece caro"
   ↓
2. IA detecta objeción: "Es muy caro" ✅
   ↓
3. IA busca en Contexto de Ventas cómo responder
   ↓
4. IA encuentra: "Preguntar si el precio es el único problema..."
   ↓
5. IA genera respuesta usando:
   - El contexto de ventas (objeciones configuradas)
   - El prompt general (configurado en Dashboard)
   - Los productos disponibles
   - Las promociones inteligentes (si es relevante)
   ↓
6. Cliente recibe respuesta personalizada
```

## 💡 Mejores Prácticas

### ✅ Hacer:
- **Usa el botón 🤖** para generar respuestas automáticas basadas en tu empresa
- **Sé específico** en las respuestas: "Preguntar X, luego ofrecer Y"
- **Actualiza regularmente** según las objeciones reales que recibes
- **Mantén activo** el toggle "Generar respuestas automáticamente" para usar siempre los datos más recientes

### ❌ Evitar:
- Respuestas muy genéricas: "Ser amable"
- Respuestas contradictorias con promociones inteligentes
- Demasiadas objeciones (máximo 5-7)

## 🎯 Ejemplo Completo de Configuración

### Contexto de Ventas Configurado:

**Objeciones:**
1. **"Es muy caro"** → "Preguntar si el precio es el único problema o si hay dudas técnicas. Si dicen que sí, ofrecer facilidades de pago."
2. **"Déjame pensarlo"** → "Preguntar qué duda específica tienen (técnica o presupuesto) para poder ayudarlos ahora mismo."
3. **"Lo consultaré con mi socio"** → "Ofrecer un resumen corto de 3 puntos para que se lo enseñen."

### Resultado en Conversación:

**Cliente:** "Hmm, me parece un poco caro"

**IA (usando el contexto):**
> "Entiendo tu preocupación. ¿El precio es el único problema o hay alguna duda técnica sobre el producto? 
> 
> Si quitamos el precio de la ecuación, ¿este producto solucionaría tu problema? 
> 
> Si el precio es lo único, podemos ofrecerte facilidades de pago para que sea más accesible."

## 🔗 Integración con Otros Componentes

### Prompt General
- El prompt general (configurado en Dashboard) se usa automáticamente
- No necesitas duplicarlo en el contexto de ventas
- El botón 🤖 lo usa para generar respuestas personalizadas

### Productos
- La IA ya tiene acceso a todos tus productos
- Los menciona automáticamente cuando es relevante
- No necesitas agregarlos al contexto

### Promociones Inteligentes
- Se insertan automáticamente cuando es relevante
- No necesitas mencionarlas en el contexto
- Tienen su propia configuración de vigencia y límites

### Información de la Empresa
- La descripción de tu empresa (en Configuración) se usa automáticamente
- El botón 🤖 la incluye al generar respuestas
- Sitio web y redes sociales también se consideran

---

## ❓ Preguntas Frecuentes

**P: ¿La IA detecta objeciones que no están en la lista?**
R: Sí, la IA puede detectar objeciones similares, pero responderá mejor si están en tu lista con respuestas específicas.

**P: ¿Puedo tener más de 10 objeciones?**
R: Técnicamente sí, pero es mejor tener 5-7 objeciones bien configuradas que muchas genéricas.

**P: ¿Las objeciones se aplican a todas las conversaciones?**
R: Sí, el contexto de ventas se aplica a todas las conversaciones cuando está activo.

**P: ¿Puedo desactivar el contexto temporalmente?**
R: Sí, desmarca "Marcar como activo" y la IA no usará este contexto.

**P: ¿Qué pasa si no tengo prompt general configurado?**
R: El botón 🤖 usará solo la información de tu empresa (descripción, sitio web, redes sociales). Es recomendable configurar el prompt general para mejores resultados.

**P: ¿Puedo editar una respuesta generada automáticamente?**
R: Sí, después de generar la respuesta con el botón 🤖, puedes editarla haciendo clic en el ícono de lápiz ✏️.
