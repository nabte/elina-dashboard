# 📖 Cómo Funcionan las Auto-Respuestas

## 🎯 Tipos de Coincidencia

Las auto-respuestas tienen dos modos de coincidencia que determinan cómo se detecta el texto en los mensajes entrantes:

---

### 1️⃣ **Coincidencia Exacta** (`exact`)

**Cómo funciona:**
- El mensaje del usuario debe ser **exactamente igual** al texto configurado en "Espero este texto"
- Se compara sin importar mayúsculas/minúsculas
- No importa si hay espacios extra al inicio o final

**Ejemplos:**

| Texto configurado | Mensaje del usuario | ¿Coincide? | Razón |
|-------------------|---------------------|------------|-------|
| `Hola` | `Hola` | ✅ **SÍ** | Exactamente igual |
| `hola` | `HOLA` | ✅ **SÍ** | Ignora mayúsculas |
| `Hola` | `Hola ` | ✅ **SÍ** | Ignora espacios al final |
| `Hola` | `Hola, cómo estás?` | ❌ **NO** | Tiene texto adicional |
| `Hola` | `Hola!` | ❌ **NO** | Tiene caracteres adicionales |

**Cuándo usar:**
- Cuando quieres que responda solo a un mensaje específico
- Ejemplo: "Hola", "Sí", "No", "Gracias"

---

### 2️⃣ **Contiene el texto** (`contains`) ⭐ **Recomendado**

**Cómo funciona:**
- El mensaje del usuario debe **contener** el texto configurado en cualquier parte
- Se busca dentro del mensaje completo
- También ignora mayúsculas/minúsculas

**Ejemplos:**

| Texto configurado | Mensaje del usuario | ¿Coincide? | Razón |
|-------------------|---------------------|------------|-------|
| `vi tu anuncio` | `Hola, vi tu anuncio en Facebook` | ✅ **SÍ** | Contiene el texto |
| `vi tu anuncio` | `Vi tu anuncio` | ✅ **SÍ** | Contiene el texto |
| `vi tu anuncio` | `Hola vi tu anuncio` | ✅ **SÍ** | Contiene el texto |
| `vi tu anuncio` | `Vi tu anuncio en Facebook` | ✅ **SÍ** | Contiene el texto |
| `vi tu anuncio` | `Hola, cómo estás?` | ❌ **NO** | No contiene el texto |
| `vi tu anuncio` | `Vi anuncios` | ❌ **NO** | No contiene la frase completa |

**Cuándo usar:**
- Cuando quieres que responda a variaciones del mensaje
- Ejemplo: "vi tu anuncio", "quiero información", "precio"

---

## 🧪 Cómo Hacer Pruebas

### **Prueba 1: Coincidencia Exacta**

1. **Crear auto-respuesta:**
   - Espero este texto: `Hola`
   - Envío este texto: `¡Hola! ¿En qué puedo ayudarte?`
   - Tipo: `Coincidencia exacta`
   - Activar: ✅

2. **Probar mensajes:**
   - ✅ `Hola` → Debe activar la auto-respuesta
   - ✅ `hola` → Debe activar la auto-respuesta (ignora mayúsculas)
   - ❌ `Hola, cómo estás?` → NO debe activar (tiene texto adicional)
   - ❌ `Hola!` → NO debe activar (tiene caracteres adicionales)

---

### **Prueba 2: Contiene el texto**

1. **Crear auto-respuesta:**
   - Espero este texto: `vi tu anuncio`
   - Envío este texto: `¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?`
   - Tipo: `Contiene el texto`
   - Activar: ✅

2. **Probar mensajes:**
   - ✅ `Hola, vi tu anuncio en Facebook` → Debe activar
   - ✅ `Vi tu anuncio` → Debe activar
   - ✅ `Hola vi tu anuncio` → Debe activar
   - ✅ `Vi tu anuncio en Facebook` → Debe activar
   - ❌ `Hola, cómo estás?` → NO debe activar
   - ❌ `Vi anuncios` → NO debe activar (no contiene la frase completa)

---

## 💡 Consejos

1. **Usa "Contiene el texto" para la mayoría de casos:**
   - Es más flexible y captura variaciones naturales del mensaje

2. **Usa "Coincidencia exacta" solo cuando necesites precisión:**
   - Para comandos específicos como "Sí", "No", "Cancelar"

3. **Prueba siempre después de crear:**
   - Envía mensajes de prueba desde WhatsApp para verificar que funciona

4. **Orden de prioridad:**
   - Si tienes múltiples auto-respuestas que podrían coincidir, el sistema usa la primera que encuentre

---

## 🔍 Ejemplo Real

**Escenario:** Responder automáticamente a personas que vieron tu anuncio en Facebook

**Configuración:**
- Espero este texto: `vi tu anuncio`
- Envío este texto: `¡Hola! Gracias por contactarnos. Estamos aquí para ayudarte. ¿En qué podemos asistirte hoy?`
- Tipo: `Contiene el texto` ✅
- Activar: ✅

**Mensajes que activarán:**
- "Hola, vi tu anuncio en Facebook"
- "Vi tu anuncio"
- "Hola vi tu anuncio"
- "Vi tu anuncio y me interesa"

**Mensajes que NO activarán:**
- "Hola"
- "Quiero información"
- "Precio"

