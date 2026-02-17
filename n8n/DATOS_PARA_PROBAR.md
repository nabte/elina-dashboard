# 🧪 Datos para Probar la Integración

## 📋 Información Necesaria

### 1. **Datos del Usuario (para obtener en Supabase)**

```sql
-- Obtener user_id y contact_phone
SELECT id, contact_phone, evolution_instance_name, evolution_api_key 
FROM profiles 
WHERE email = 'tu_email@ejemplo.com';
```

**Ejemplo de resultado:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "contact_phone": "+5219991234567",
  "evolution_instance_name": "ElinaIA",
  "evolution_api_key": "5FC7C882-E00B-46D8-91BD-AEB1DEBE7D86"
}
```

---

### 2. **Datos del Contacto (para pruebas)**

**Número de teléfono de prueba:** `+5219995169313` (o el que uses para probar)

**Para obtener el contact_id:**
```sql
SELECT id, phone_number, full_name 
FROM contacts 
WHERE user_id = 'TU_USER_ID' 
  AND phone_number = '+5219995169313';
```

---

### 3. **Crear Promoción de Prueba**

```sql
INSERT INTO smart_promotions (
  user_id,
  title,
  description,
  discount,
  is_active,
  no_schedule,
  start_at,
  end_at
) VALUES (
  'TU_USER_ID',
  'Oferta Especial de Prueba',
  'Descuento del 20% en todos los productos',
  '20% OFF',
  true,
  false,
  NOW() - INTERVAL '1 day',  -- Inició ayer
  NOW() + INTERVAL '7 days'   -- Termina en 7 días
) RETURNING *;
```

---

### 4. **Verificar Configuración de Detección Crítica**

```sql
-- Ver palabras clave personalizadas (opcional)
SELECT * FROM critical_keywords 
WHERE user_id = 'TU_USER_ID';

-- Ver detecciones registradas
SELECT * FROM critical_detections 
WHERE user_id = 'TU_USER_ID' 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver estados de conversación pausados
SELECT * FROM conversation_states 
WHERE is_paused = true 
  AND user_id = 'TU_USER_ID';
```

---

## 🧪 Escenarios de Prueba

### **Escenario 1: Detección Crítica - Solicitud de Humano**

**Mensaje a enviar por WhatsApp:**
```
Quiero hablar con un humano, por favor
```

**Resultado esperado:**
1. ✅ Se detecta como crítico (`is_critical: true`)
2. ✅ `detection_type: "human_request"`
3. ✅ Conversación pausada en `conversation_states`
4. ✅ Registro en `critical_detections`
5. ✅ Notificación enviada al número en `profiles.contact_phone`
6. ✅ **NO se genera respuesta de IA**

---

### **Escenario 2: Detección Crítica - Intención de Compra**

**Mensaje a enviar por WhatsApp:**
```
Necesito comprar algo urgente, ¿pueden ayudarme?
```

**Resultado esperado:**
1. ✅ Se detecta como crítico (`is_critical: true`)
2. ✅ `detection_type: "purchase_intent"`
3. ✅ Conversación pausada
4. ✅ Notificación enviada
5. ✅ **NO se genera respuesta de IA**

---

### **Escenario 3: Promoción Inteligente - Sin Solicitud Explícita**

**Mensaje a enviar por WhatsApp:**
```
Hola, ¿qué productos tienen disponibles?
```

**Resultado esperado:**
1. ✅ NO es crítico → Continúa el flujo
2. ✅ Se busca promoción activa
3. ✅ Se encuentra la promoción de prueba
4. ✅ Se agrega al contexto de la IA
5. ✅ La IA genera respuesta mencionando la promoción de forma natural (si es relevante)

---

### **Escenario 4: Promoción Inteligente - Solicitud Explícita**

**Mensaje a enviar por WhatsApp:**
```
¿Tienen alguna oferta o descuento disponible?
```

**Resultado esperado:**
1. ✅ NO es crítico → Continúa el flujo
2. ✅ Se busca promoción activa
3. ✅ Se encuentra la promoción
4. ✅ Se agrega al contexto con indicador de solicitud explícita
5. ✅ La IA menciona la promoción en su respuesta

---

### **Escenario 5: Mensaje Normal (Sin Crítico ni Promo)**

**Mensaje a enviar por WhatsApp:**
```
Hola, ¿cómo están?
```

**Resultado esperado:**
1. ✅ NO es crítico → Continúa el flujo
2. ✅ Se busca promoción activa
3. ✅ No hay promoción relevante o no se encuentra
4. ✅ La IA genera respuesta normal sin mencionar promociones

---

## 🔍 Cómo Verificar que Funciona

### **1. Verificar Detección Crítica en Supabase:**

```sql
-- Ver última detección
SELECT 
  cd.*,
  c.full_name,
  c.phone_number
FROM critical_detections cd
JOIN contacts c ON c.id = cd.contact_id
WHERE cd.user_id = 'TU_USER_ID'
ORDER BY cd.created_at DESC
LIMIT 1;

-- Ver conversaciones pausadas
SELECT 
  cs.*,
  c.full_name,
  c.phone_number
FROM conversation_states cs
JOIN contacts c ON c.id = cs.contact_id
WHERE cs.is_paused = true
  AND cs.user_id = 'TU_USER_ID';
```

### **2. Verificar Notificación:**

- Revisa el WhatsApp del número configurado en `profiles.contact_phone`
- Debe llegar un mensaje con:
  - 🚨 Emoji de alerta
  - Nombre del contacto
  - Tipo de detección
  - Mensaje detectado

### **3. Verificar Promociones en el Contexto:**

- Revisa los logs del nodo "Agregar Promo al Contexto" en n8n
- El `rag_context` debe incluir la sección `[PROMOCIÓN ACTIVA DISPONIBLE]`
- La respuesta de la IA debe mencionar la promoción si es relevante

---

## 🐛 Troubleshooting

### **Problema: No se detecta como crítico**

**Solución:**
1. Verifica que el mensaje contenga palabras clave:
   - "humano", "persona", "agente", "asesor"
   - "comprar", "adquirir", "urgente"
   - "molesto", "problema", "queja"

2. Verifica que la Edge Function esté desplegada:
   ```bash
   supabase functions list
   ```

3. Revisa los logs de la Edge Function:
   ```bash
   supabase functions logs detect-critical-intent
   ```

---

### **Problema: No se encuentran promociones**

**Solución:**
1. Verifica que la promoción esté activa:
   ```sql
   SELECT * FROM smart_promotions 
   WHERE user_id = 'TU_USER_ID' 
     AND is_active = true;
   ```

2. Verifica las fechas:
   ```sql
   SELECT 
     title,
     is_active,
     no_schedule,
     start_at,
     end_at,
     CASE 
       WHEN no_schedule THEN 'Sin horario'
       WHEN start_at > NOW() THEN 'Aún no inicia'
       WHEN end_at < NOW() THEN 'Ya expiró'
       ELSE 'Activa'
     END as estado
   FROM smart_promotions 
   WHERE user_id = 'TU_USER_ID';
   ```

---

### **Problema: No llega la notificación**

**Solución:**
1. Verifica que `contact_phone` esté configurado:
   ```sql
   SELECT id, contact_phone 
   FROM profiles 
   WHERE id = 'TU_USER_ID';
   ```

2. Verifica el formato del número:
   - Debe ser E.164: `+521234567890`
   - Sin espacios ni guiones

3. Verifica que la instancia de Evolution API esté conectada:
   - Revisa el estado en la aplicación
   - Verifica que `whatsapp_connected = true` en `profiles`

4. Revisa los logs del nodo "Enviar Notificación WhatsApp" en n8n

---

## 📝 Variables de Entorno Necesarias en n8n

Asegúrate de tener estas variables configuradas:

- `SUPABASE_URL`: `https://mytvwfbijlgbihlegmfg.supabase.co`
- `SUPABASE_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key)
- `SUPABASE_SERVICE_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service_role key)

---

## ✅ Checklist de Verificación

Antes de probar, verifica:

- [ ] Tienes un `user_id` válido
- [ ] Tienes `contact_phone` configurado en `profiles`
- [ ] Tienes al menos una promoción activa en `smart_promotions`
- [ ] La Edge Function `detect-critical-intent` está desplegada
- [ ] Las variables de entorno están configuradas en n8n
- [ ] La instancia de Evolution API está conectada
- [ ] Tienes un número de WhatsApp para recibir notificaciones

---

¿Listo para probar? 🚀

