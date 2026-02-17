# 🧪 Tests para Promociones y Crítico

## 📋 Información del Usuario

**UUID:** `808d2e8e-dc76-4244-9584-3e7d4dea0246`  
**Email:** `hola@elinaia.com.mx`  
**Instancia:** `ElinaIA`  
**Teléfono Notificaciones:** `5219995169313`

## 📁 Archivos de Test

### **Tests de Detección Crítica:**

1. **`test_critical_001_human_request.json`**
   - Mensaje: "Quiero hablar con un humano, por favor. Necesito ayuda urgente."
   - Contacto: Jccs (+5215527520500)
   - Esperado: Detección crítica, conversación pausada, notificación enviada

2. **`test_critical_002_purchase_intent.json`**
   - Mensaje: "Necesito comprar algo urgente, ¿pueden ayudarme ahora mismo?"
   - Contacto: Kl (+5219993528227)
   - Esperado: Detección crítica, conversación pausada, notificación enviada

### **Tests de Promociones:**

3. **`test_promo_001_explicit_request.json`**
   - Mensaje: "¿Tienen alguna oferta o promoción disponible? Me interesa probar el servicio."
   - Contacto: Daniel Peniche (+5219999550292)
   - Esperado: Promoción encontrada, agregada al contexto, IA menciona la promoción

4. **`test_promo_002_implicit.json`**
   - Mensaje: "Hola, ¿qué servicios ofrecen? Me gustaría conocer más sobre lo que hacen."
   - Contacto: ing danielgamboa Kelen (+5219991507419)
   - Esperado: Promoción encontrada, agregada al contexto, IA puede mencionarla naturalmente

### **Test Normal:**

5. **`test_normal_001.json`**
   - Mensaje: "Hola, ¿cómo están? Solo quería saludar."
   - Contacto: Angel Ramirez Inquilino (+5219993933047)
   - Esperado: Respuesta normal sin mencionar promociones

## 🚀 Cómo Ejecutar los Tests

### **Opción 1: Usando cURL**

```bash
# Test Crítico 1
curl -X POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert \
  -H "Content-Type: application/json" \
  -d @test_critical_001_human_request.json

# Test Promoción 1
curl -X POST https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert \
  -H "Content-Type: application/json" \
  -d @test_promo_001_explicit_request.json
```

### **Opción 2: Usando Postman**

1. Importa los archivos JSON
2. Configura la URL: `https://n8n-n8n.mcjhhb.easypanel.host/webhook/a/messages-upsert`
3. Método: `POST`
4. Headers: `Content-Type: application/json`
5. Body: Selecciona el archivo JSON del test

### **Opción 3: Desde n8n (Manual)**

1. Ve al workflow de `messages-upsert`
2. Haz clic en "Test workflow"
3. Pega el contenido del JSON del test
4. Ejecuta el workflow

## ⚠️ Nota Importante

Los archivos JSON usan `Date.now()` y `new Date().toISOString()` que son funciones de JavaScript. Si los usas directamente, necesitarás reemplazarlos con valores reales:

```json
// Reemplazar esto:
"id": "TEST_CRITICAL_001_" + Date.now()

// Por esto:
"id": "TEST_CRITICAL_001_1733068800"
```

O usar un script para generar los valores:

```javascript
const test = require('./test_critical_001_human_request.json');
test[0].body.data.key.id = `TEST_CRITICAL_001_${Date.now()}`;
test[0].body.data.messageTimestamp = Math.floor(Date.now() / 1000);
test[0].body.date_time = new Date().toISOString();
```

## ✅ Verificar Resultados

Ver el documento principal: `TESTS_PROMOCIONES_Y_CRITICO_UUID_808d2e8e.md`

