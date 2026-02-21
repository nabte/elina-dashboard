# ✨ Mejoras UX - Flow Builder V3

**Fecha**: 2026-02-14
**Versión**: 3.1

---

## 🎯 Problemas Resueltos

### 1. ❌ **Problema: Reordenar steps era difícil**

**Antes:**
- Solo drag & drop (no obvio para usuarios nuevos)
- No había forma visual de mover un step arriba/abajo
- Tenías que arrastrar con el mouse (incómodo)

**Ahora:**
- ✅ Botones visuales **↑ ↓** en cada step
- ✅ Hover sobre step → aparecen los controles
- ✅ Click ↑ = mueve arriba
- ✅ Click ↓ = mueve abajo
- ✅ Botones deshabilitados cuando no aplica (primer step no puede subir, último no puede bajar)

**Ubicación:**
Hover sobre cualquier step → Aparecen botones en la esquina superior derecha:
```
[↑↓] | [✏️ Editar] [📋 Duplicar] [🗑️ Eliminar]
```

---

### 2. ❌ **Problema: En modo get_all no era claro qué campos se recolectaban**

**Antes:**
- Solo veías los steps como lista
- No era obvio qué datos iba a extraer la IA
- No se explicaba bien cómo funciona get_all

**Ahora:**
- ✅ **Panel visual "¿Qué necesitas conseguir?"**
- ✅ Lista clara de todos los campos a recolectar
- ✅ Muestra variable, tipo y descripción
- ✅ Explicación de cómo funciona la IA

**Aspecto:**

```
┌─────────────────────────────────────────────────────┐
│ 🎯 ¿Qué necesitas conseguir?                    [4] │
├─────────────────────────────────────────────────────┤
│ Con modo Get All, la IA extraerá estos campos de   │
│ las respuestas del usuario:                         │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [1] {{nombre}}          [texto]                 │ │
│ │     ¿Cuál es tu nombre?                         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [2] {{edad}}            [número]                │ │
│ │     ¿Qué edad tienes?                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [3] {{ciudad}}          [texto]                 │ │
│ │     ¿De qué ciudad eres?                        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [4] {{hobby}}           [texto]                 │ │
│ │     ¿Qué te gusta hacer?                        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ✨ Magia IA: Si el usuario menciona varios de      │
│    estos datos en una sola respuesta, la IA los    │
│    extraerá automáticamente y solo preguntará por  │
│    lo que falte.                                    │
└─────────────────────────────────────────────────────┘
```

**Cuándo aparece:**
- Solo cuando el modo del flow es **"Get All (IA)"**
- Se actualiza automáticamente al agregar/eliminar steps
- Si no hay steps de tipo "pregunta", muestra un mensaje explicativo

---

## 💻 Código Implementado

### 1. Funciones de Reordenar

```javascript
// Mover step arriba
window.moveStepUpV3 = (index) => {
    if (index === 0) return;

    const temp = currentFlow.steps[index];
    currentFlow.steps[index] = currentFlow.steps[index - 1];
    currentFlow.steps[index - 1] = temp;

    refreshEditorV3();
    window.showToast?.('Paso movido arriba', 'success');
};

// Mover step abajo
window.moveStepDownV3 = (index) => {
    if (index === currentFlow.steps.length - 1) return;

    const temp = currentFlow.steps[index];
    currentFlow.steps[index] = currentFlow.steps[index + 1];
    currentFlow.steps[index + 1] = temp;

    refreshEditorV3();
    window.showToast?.('Paso movido abajo', 'success');
};
```

### 2. Panel de Campos Get All

```javascript
function renderGetAllFieldsPanel() {
    // Extraer campos de steps tipo question y collect_image
    const fieldsToCollect = currentFlow.steps
        .filter(s => s.type === 'question' || s.type === 'collect_image')
        .map(s => ({
            variable: s.variable || 'sin_variable',
            description: s.content || 'Sin descripción',
            type: s.type === 'collect_image' ? 'imagen' : (s.validation?.type || 'texto')
        }));

    // Renderiza panel visual con lista de campos
    // ... (ver código completo en flow-builder-v3.js)
}
```

---

## 🎨 Mejoras Visuales

### Botones de Reordenar

**Características:**
- 🎨 Iconos chevron-up/chevron-down (↑ ↓)
- 🎨 Separados con borde vertical
- 🎨 Hover azul para indicar interacción
- 🎨 Disabled cuando no aplica (opacity 30%)
- 🎨 Tooltips descriptivos
- 🎨 Solo visibles al hacer hover sobre el step

**Código HTML:**
```html
<div class="flex flex-col gap-0.5 mr-1 border-r border-slate-200 pr-2">
    <button onclick="window.moveStepUpV3(0)" title="Mover arriba ↑">
        <i data-lucide="chevron-up" class="w-4 h-4"></i>
    </button>
    <button onclick="window.moveStepDownV3(0)" title="Mover abajo ↓">
        <i data-lucide="chevron-down" class="w-4 h-4"></i>
    </button>
</div>
```

### Panel Get All

**Características:**
- 🎨 Gradiente morado/rosa para modo IA
- 🎨 Cards blancas con bordes morados
- 🎨 Números de paso en círculos
- 🎨 Badges para tipos de dato (texto, número, imagen)
- 🎨 Variables en código resaltado
- 🎨 Mensaje de "magia IA" en verde
- 🎨 Contador de campos arriba a la derecha

---

## 📊 Flujo de Usuario Mejorado

### Escenario: Crear Flow en Modo Get All

#### Paso 1: Crear Flow
```
Usuario: Click "Crear desde Cero"
```

#### Paso 2: Activar Get All
```
Usuario: En "Configuración Básica" → Click "Get All (IA)"
```

#### Paso 3: Agregar Steps
```
Usuario: Agrega step "Hacer una Pregunta"
  - Pregunta: "¿Cuál es tu nombre?"
  - Variable: "nombre"

✨ El panel "¿Qué necesitas conseguir?" aparece automáticamente
   y muestra: [1] {{nombre}} [texto]
```

#### Paso 4: Agregar Más Campos
```
Usuario: Agrega otro step "Hacer una Pregunta"
  - Pregunta: "¿Qué edad tienes?"
  - Variable: "edad"
  - Validación: Solo números

✨ El panel se actualiza automáticamente:
   [1] {{nombre}} [texto]
   [2] {{edad}} [número]  ← NUEVO
```

#### Paso 5: Reordenar (si es necesario)
```
Usuario: Hover sobre step de edad → Click ↑

✨ El step de edad sube a primera posición
   El panel se actualiza:
   [1] {{edad}} [número]   ← Ahora primero
   [2] {{nombre}} [texto]
```

#### Paso 6: Ver Resumen
```
✨ Panel final muestra todos los campos que la IA extraerá:

   🎯 ¿Qué necesitas conseguir? [4]

   [1] {{edad}}     [número]  - ¿Qué edad tienes?
   [2] {{nombre}}   [texto]   - ¿Cuál es tu nombre?
   [3] {{ciudad}}   [texto]   - ¿De qué ciudad eres?
   [4] {{hobby}}    [texto]   - ¿Qué te gusta hacer?

   ✨ Magia IA: Si el usuario menciona varios de estos
      datos en una sola respuesta, la IA los extraerá
      automáticamente.
```

---

## 🧪 Casos de Uso

### Caso 1: Flow Simple (3 campos)

**Configuración:**
```
Modo: Get All
Campos:
  1. nombre (texto)
  2. email (email)
  3. telefono (teléfono)
```

**Conversación:**
```
Bot: ¿Cuál es tu nombre?

Usuario: Soy Juan Pérez, mi email es juan@gmail.com y mi teléfono es 999-123-4567

IA Extrae:
✓ nombre: "Juan Pérez"
✓ email: "juan@gmail.com"
✓ telefono: "999-123-4567"

Bot: ¡Perfecto Juan! Ya tengo todos tus datos.
```

**Sin Get All (modo step_by_step):**
```
Bot: ¿Cuál es tu nombre?
Usuario: Soy Juan Pérez, mi email es juan@gmail.com...

Bot: ¿Cuál es tu email?  ← Repite pregunta
Usuario: juan@gmail.com

Bot: ¿Cuál es tu teléfono?  ← Repite pregunta
Usuario: 999-123-4567

Total: 6 mensajes (3 bot + 3 usuario)
```

**Con Get All:**
```
Total: 2 mensajes (1 bot + 1 usuario)
```

**Ahorro:** 67% menos mensajes

---

## 📁 Archivos Modificados

### flow-builder-v3.js

**Líneas modificadas:**
- **1078-1100**: Agregados botones ↑ ↓ para reordenar
- **1401-1430**: Funciones moveStepUpV3 y moveStepDownV3
- **944**: Llamada a renderGetAllFieldsPanel() en modo get_all
- **1001-1067**: Nueva función renderGetAllFieldsPanel()

**Total:** +150 líneas de código

---

## ✅ Checklist de Features

### Reordenar Steps
- [x] Botones ↑ ↓ en cada step
- [x] Solo visibles al hacer hover
- [x] Disabled cuando no aplica
- [x] Función moveStepUpV3
- [x] Función moveStepDownV3
- [x] Toast de confirmación
- [x] Refresh automático del editor

### Panel Get All
- [x] Detección de modo get_all
- [x] Extracción de campos desde steps
- [x] Lista visual de campos
- [x] Variables mostradas como código
- [x] Badges de tipo de dato
- [x] Números de paso
- [x] Mensaje explicativo de IA
- [x] Contador de campos
- [x] Actualización automática al agregar/eliminar steps

---

## 🎓 Próximas Mejoras Sugeridas

### 1. Drag & Drop Mejorado
- [ ] Indicador visual mientras se arrastra
- [ ] Línea horizontal mostrando dónde se soltará
- [ ] Animación suave al soltar

### 2. Panel Get All Avanzado
- [ ] Click en campo → scroll al step correspondiente
- [ ] Checkbox para marcar/desmarcar campos opcionales
- [ ] Indicador de campos críticos vs opcionales
- [ ] Ejemplo de respuesta que extraería todos los campos

### 3. Preview Interactivo
- [ ] Botón "Simular Get All" en el panel
- [ ] Input de prueba
- [ ] Mostrar qué campos extraería la IA de ese input
- [ ] Porcentaje de completitud en tiempo real

---

## 📊 Impacto en UX

### Antes (V3.0)
- ⚠️ Reordenar steps: solo drag & drop
- ⚠️ Modo get_all: no claro qué se recolecta
- ⚠️ Usuarios confundidos sobre cómo funciona IA

### Después (V3.1)
- ✅ Reordenar: botones ↑ ↓ + drag & drop
- ✅ Panel visual "¿Qué necesitas conseguir?"
- ✅ Lista clara de campos con tipos
- ✅ Explicación de magia IA
- ✅ Actualización automática

**Resultado:** UX más clara, intuitiva y profesional

---

**Versión:** 3.1
**Estado:** ✅ Implementado y funcional
**Próximo paso:** Testing con usuarios reales
