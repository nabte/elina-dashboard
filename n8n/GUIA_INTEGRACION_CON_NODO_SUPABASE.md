# 📋 Guía de Integración: Usando el Nodo Oficial de Supabase

Esta guía explica cómo integrar **Detección Crítica** y **Promociones Inteligentes** usando el **nodo oficial de Supabase** (sin variables de entorno).

---

## 🎯 Ventajas del Nodo de Supabase

- ✅ **No necesitas variables de entorno**
- ✅ **Credenciales configuradas una sola vez**
- ✅ **Operaciones más simples** (Get, Insert, Update, Delete)
- ✅ **Manejo automático de autenticación**

---

## 📍 Puntos de Integración

### **Flujo con Integraciones:**

```
Webhook → Verificar Suscripción → Buscar/Crear Contacto
  ↓
Procesar Mensaje (texto/audio/imagen)
  ↓
Obtener Contexto RAG
  ↓
[DETECCIÓN CRÍTICA] ← NUEVO
  ├─ Si es crítico → Pausar conversación → Enviar notificación → FIN
  └─ Si no es crítico → Continuar
  ↓
[PROMOCIONES INTELIGENTES] ← NUEVO
  └─ Buscar promos activas → Agregar al contexto si hay
  ↓
Generar Respuesta con IA Agent (con contexto RAG + promos)
  ↓
Enviar Respuesta → Guardar en chat_history
```

---

## 🔧 Paso 1: Agregar Nodo de Detección Crítica

### **Ubicación:** 
Después del nodo **"3. RAG - Formatear Contexto"**, antes de **"AI Agent1"**

---

### **Nodo 1: HTTP Request - Detectar Intención Crítica**

**Tipo:** `HTTP Request`

**Configuración:**
- **Method:** `POST`
- **URL:** `https://mytvwfbijlgbihlegmfg.supabase.co/functions/v1/detect-critical-intent`
  - ⚠️ **Reemplaza** `mytvwfbijlgbihlegmfg` con tu project ID de Supabase
- **Authentication:** `None` (o usa credenciales HTTP Header si las tienes)
- **Headers:**
  - `apikey`: `[Tu Service Role Key]` (pégala directamente aquí)
  - `Authorization`: `Bearer [Tu Service Role Key]`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "contact_id": "{{ $('Get Contact ID').item.json.id }}",
  "user_id": "{{ $('Get a row').item.json.id }}",
  "message_content": "{{ $('set text').item.json.text }}",
  "message_id": {{ $('human').item.json.id || null }}
}
```

**Nombre del nodo:** `Detectar Intención Crítica`

**Nota:** Para Edge Functions necesitas HTTP Request porque el nodo de Supabase no las soporta directamente.

---

### **Nodo 2: IF - ¿Es Crítico?**

**Tipo:** `IF`

**Configuración:**
- **Condition:** `Boolean`
- **Value 1:** `={{ $json.is_critical }}`
- **Value 2:** `true`

**Nombre del nodo:** `IF: ¿Es Crítico?`

**Conexiones:**
- **TRUE (es crítico):** → Nodo "Obtener Número Notificación"
- **FALSE (no es crítico):** → Nodo "Buscar Promociones Activas"

---

### **Nodo 3: Supabase - Obtener Número Notificación**

**Tipo:** `Supabase`

**Configuración:**
- **Operation:** `Get`
- **Table:** `profiles`
- **Filters:**
  - **Field:** `id`
  - **Operator:** `Equal`
  - **Value:** `={{ $('Get a row').item.json.id }}`
- **Select:** `contact_phone`
- **Credentials:** Selecciona tu credencial de Supabase configurada

**Nombre del nodo:** `Obtener Número Notificación`

**Nota:** Este nodo obtiene el número guardado en `profiles.contact_phone` (el que configuraste en Settings).

---

### **Nodo 4: Evolution API - Enviar Notificación WhatsApp**

**Tipo:** `Evolution API` (o `HTTP Request`)

**Configuración:**
- **Resource:** `messages-api`
- **Operation:** `send-text` (o `send-message`)
- **Instance Name:** `={{ $('Set Fields').item.json.instance.name }}`
- **Remote Jid:** `={{ $('Obtener Número Notificación').item.json.contact_phone.replace('+', '').replace('@s.whatsapp.net', '') }}`
- **Message Text:**
```
🚨 *ATENCIÓN REQUERIDA*

Se detectó una intención crítica en una conversación:

*Contacto:* {{ $('Get Contact ID').item.json.full_name || $('Webhook').item.json.body.data.pushName }}
*Número:* {{ $('Webhook').item.json.body.data.key.remoteJid.replace('@s.whatsapp.net', '') }}

*Tipo de detección:* {{ $('Detectar Intención Crítica').item.json.detection_type }}
*Confianza:* {{ Math.round($('Detectar Intención Crítica').item.json.confidence * 100) }}%

*Mensaje detectado:*
"{{ $('Detectar Intención Crítica').item.json.detected_content }}"

La conversación ha sido pausada automáticamente. Revisa el chat en la aplicación.
```

**Nombre del nodo:** `Enviar Notificación WhatsApp`

---

### **Nodo 5: No Operation (Fin si es crítico)**

**Tipo:** `No Operation`

**Nombre del nodo:** `FIN - Conversación Pausada`

**Propósito:** Detener el flujo cuando es crítico (no generar respuesta de IA).

---

## 🔧 Paso 2: Agregar Nodo de Promociones Inteligentes

### **Ubicación:**
Después del nodo **"IF: ¿Es Crítico?"** (rama FALSE), antes de **"AI Agent1"**

---

### **Nodo 6: Supabase - Buscar Promociones Activas**

**Tipo:** `Supabase`

**Configuración:**
- **Operation:** `Get Many`
- **Table:** `smart_promotions`
- **Filters:**
  - **Filter 1:**
    - **Field:** `user_id`
    - **Operator:** `Equal`
    - **Value:** `={{ $('Get a row').item.json.id }}`
  - **Filter 2:**
    - **Field:** `is_active`
    - **Operator:** `Equal`
    - **Value:** `true`
- **Select:** `*` (o selecciona los campos que necesites)
- **Sort:** `created_at` → `DESC`
- **Credentials:** Selecciona tu credencial de Supabase configurada

**Nombre del nodo:** `Buscar Promociones Activas`

---

### **Nodo 7: Code - Filtrar y Seleccionar Promoción**

**Tipo:** `Code`

**Código:**
```javascript
const promos = $input.all().map(item => item.json);
if (!promos || !promos.length) {
  return [{ json: { promo: null } }];
}

const now = new Date();
const selected = promos.find(promo => {
  if (!promo.is_active) return false;
  if (!promo.no_schedule) {
    if (promo.start_at && new Date(promo.start_at) > now) return false;
    if (promo.end_at && new Date(promo.end_at) < now) return false;
  }
  return true;
});

return [{ json: { promo: selected || null } }];
```

**Nombre del nodo:** `Filtrar Promoción Válida`

---

### **Nodo 8: IF - ¿Hay Promoción?**

**Tipo:** `IF`

**Configuración:**
- **Condition:** `Collection`
- **Field:** `={{ $json.promo }}`
- **Operation:** `isNotEmpty`

**Nombre del nodo:** `IF: ¿Hay Promoción?`

**Conexiones:**
- **TRUE (hay promo):** → Nodo "Agregar Promo al Contexto"
- **FALSE (no hay promo):** → Continuar a "AI Agent1"

---

### **Nodo 9: Code - Agregar Promo al Contexto**

**Tipo:** `Code`

**Código:**
```javascript
const promo = $('Filtrar Promoción Válida').item.json.promo;
const ragContext = $('3. RAG - Formatear Contexto').item.json.rag_context || '';
const text = $('set text').item.json.text || '';
const imageDesc = $('3. RAG - Formatear Contexto').item.json['descripcion de la imagen'] || '';

let promoContext = '';
if (promo) {
  promoContext = `\n\n[PROMOCIÓN ACTIVA DISPONIBLE]\n` +
    `Título: ${promo.title || 'Promoción especial'}\n` +
    `Descripción: ${promo.description || ''}\n` +
    (promo.discount ? `Descuento: ${promo.discount}\n` : '') +
    (promo.offer ? `Oferta: ${promo.offer}\n` : '') +
    `Vigencia: ${promo.start_at ? new Date(promo.start_at).toLocaleDateString('es-MX') : 'Activa'} - ${promo.end_at ? new Date(promo.end_at).toLocaleDateString('es-MX') : 'Sin límite'}\n` +
    `\nSi el contexto de la conversación lo permite, menciona esta promoción de forma natural. No la fuerces si no es relevante.\n`;
}

return [{
  json: {
    ...$('3. RAG - Formatear Contexto').item.json,
    rag_context: ragContext + promoContext,
    promo_id: promo?.id || null
  }
}];
```

**Nombre del nodo:** `Agregar Promo al Contexto`

---

## 🔗 Conexiones Finales

### **Conexiones desde "3. RAG - Formatear Contexto":**
- Conectar a → **"Detectar Intención Crítica"**

### **Conexiones desde "Detectar Intención Crítica":**
- Conectar a → **"IF: ¿Es Crítico?"**

### **Conexiones desde "IF: ¿Es Crítico?" (TRUE):**
- Conectar a → **"Obtener Número Notificación"**
- Desde "Obtener Número Notificación" → **"Enviar Notificación WhatsApp"**
- Desde "Enviar Notificación WhatsApp" → **"FIN - Conversación Pausada"**

### **Conexiones desde "IF: ¿Es Crítico?" (FALSE):**
- Conectar a → **"Buscar Promociones Activas"**
- Desde "Buscar Promociones Activas" → **"Filtrar Promoción Válida"**
- Desde "Filtrar Promoción Válida" → **"IF: ¿Hay Promoción?"**
- Desde "IF: ¿Hay Promoción?" (TRUE) → **"Agregar Promo al Contexto"**
- Desde "IF: ¿Hay Promoción?" (FALSE) → **"AI Agent1"**
- Desde "Agregar Promo al Contexto" → **"AI Agent1"**

---

## 🔑 Configurar Credenciales de Supabase en n8n

### **Paso 1: Obtener tus Keys de Supabase**

1. Ve a **Supabase Dashboard**
2. **Settings** → **API**
3. Copia:
   - **Project URL:** `https://mytvwfbijlgbihlegmfg.supabase.co`
   - **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (secret)

---

### **Paso 2: Crear Credencial en n8n**

1. En n8n, ve a **Credentials** → **New**
2. Busca y selecciona **Supabase**
3. Configura:
   - **Name:** `Mi Supabase`
   - **Host:** `mytvwfbijlgbihlegmfg.supabase.co` (solo el dominio, sin https://)
   - **Service Role Secret:** `[Pega tu Service Role Key aquí]`
4. **Save**

---

### **Paso 3: Usar la Credencial en los Nodos**

En cada nodo de Supabase:
1. Selecciona **Credentials**
2. Elige **"Mi Supabase"** (o el nombre que le pusiste)
3. ¡Listo! El nodo ya tiene acceso configurado

---

## 📝 Modificar el Prompt del AI Agent

En el nodo **"AI Agent1"**, el contexto de promociones ya está incluido en `rag_context` desde el nodo "Agregar Promo al Contexto", así que no necesitas modificar nada si ya usas `rag_context` en tu prompt.

Si no lo usas, agrega:
```
{{ $json.rag_context || '' }}
```

---

## 🧪 Datos para Probar

Ver el archivo `DATOS_PARA_PROBAR.md` para escenarios de prueba completos.

---

## ⚠️ Notas Importantes

1. **Edge Functions:** Necesitas usar **HTTP Request** (no el nodo de Supabase) porque el nodo oficial no soporta Edge Functions directamente.

2. **Service Role Key:** Para Edge Functions, necesitas la **Service Role Key** (no la anon key) porque necesitas bypass RLS.

3. **RLS (Row Level Security):** El nodo de Supabase respeta RLS. Si tienes problemas, verifica las políticas en Supabase.

4. **Manejo de Errores:**
   - Si falla la detección crítica, continuar normalmente (no bloquear)
   - Si falla la búsqueda de promociones, continuar sin promociones
   - Si falla la notificación, registrar error pero no bloquear el flujo

---

## ✅ Checklist de Implementación

- [ ] Configuré credencial de Supabase en n8n
- [ ] Agregué nodo "Detectar Intención Crítica" (HTTP Request)
- [ ] Agregué nodo "IF: ¿Es Crítico?"
- [ ] Agregué nodo "Obtener Número Notificación" (Supabase)
- [ ] Agregué nodo "Enviar Notificación WhatsApp"
- [ ] Agregué nodo "FIN - Conversación Pausada"
- [ ] Agregué nodo "Buscar Promociones Activas" (Supabase)
- [ ] Agregué nodo "Filtrar Promoción Válida"
- [ ] Agregué nodo "IF: ¿Hay Promoción?"
- [ ] Agregué nodo "Agregar Promo al Contexto"
- [ ] Conecté todos los nodos según el diagrama
- [ ] Probé con mensaje crítico
- [ ] Probé con promoción activa
- [ ] Verifiqué que las notificaciones lleguen correctamente

---

## 🆘 Troubleshooting

### **Error: "Invalid credentials"**
- Verifica que la Service Role Key esté correcta
- Verifica que el Host sea solo el dominio (sin https://)

### **Error: "Permission denied"**
- Verifica las políticas RLS en Supabase
- Asegúrate de usar Service Role Key para operaciones administrativas

### **Error: "Table not found"**
- Verifica que la tabla `smart_promotions` exista
- Ejecuta el SQL: `supabase/schema/20251202_verify_smart_promotions.sql`

---

¿Necesitas ayuda con algún nodo específico? 🚀

