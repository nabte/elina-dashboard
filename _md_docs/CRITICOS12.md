# 🚨 Sistema de Críticos Personalizados y Prevención de Alucinaciones

## 📋 Resumen del Proyecto

Se implementó un sistema completo para:
1. **Personalizar mensajes críticos** desde el panel de Contexto de Ventas
2. **Precargar críticos existentes** (human_request, purchase_intent, urgent_attention)
3. **Prevenir alucinaciones** de la IA (no inventar direcciones, teléfonos, información de envíos)
4. **Sistema de switches** para activar/desactivar cada tipo de crítico

**Fecha de implementación:** 11 de diciembre de 2025

---

## ✅ Estado de Implementación

### COMPLETADO ✅

- [x] Base de datos: Tabla `critical_rules` y extensión de `profiles`
- [x] Función SQL: `detect_critical_intent()` actualizada
- [x] Frontend Settings: Campos de datos del negocio
- [x] Frontend Sales Context: UI para críticos personalizados
- [x] Prompt AI Agent: Prevención de alucinaciones
- [x] Workflow n8n: Actualizado para usar nuevos campos

---

## 📁 Archivos Modificados/Creados

### 1. Base de Datos

**Archivo:** `supabase/schema/20251211_critical_customization.sql` ⭐ **NUEVO**

**Qué hace:**
- Crea tabla `critical_rules` para reglas personalizadas
- Extiende tabla `profiles` con campos: `business_address`, `business_phone`, `pickup_location`, `shipping_info`, `has_shipping_system`
- Crea función `initialize_default_critical_rules()` para precargar reglas
- Modifica función `detect_critical_intent()` para usar reglas personalizadas

**⚠️ ACCIÓN REQUERIDA:** Ejecutar esta migración SQL en Supabase

```sql
-- Ejecutar en Supabase SQL Editor:
-- Copiar y ejecutar todo el contenido de supabase/schema/20251211_critical_customization.sql
```

### 2. Frontend - Settings

**Archivo:** `settings.html` ✅ MODIFICADO

**Cambios:**
- Agregada sección "Datos del Negocio" después de "Contacto y Redes Sociales"
- Campos agregados:
  - `business-address` (Dirección del Negocio)
  - `business-phone` (Teléfono de Contacto del Negocio)
  - `pickup-location` (Ubicación de Recogida)
  - `has-shipping-system` (Checkbox: ¿Tienes sistema de tracking de envíos?)

**Archivo:** `settings.js` ✅ MODIFICADO

**Cambios:**
- `fetchCompanySettings()`: Agregado para cargar nuevos campos
- `performSettingsSave()`: Agregado para guardar nuevos campos
- Campos guardados: `business_address`, `business_phone`, `pickup_location`, `has_shipping_system`

### 3. Frontend - Contexto de Ventas

**Archivo:** `dashboard.html` ✅ MODIFICADO

**Cambios:**
- Agregada sección "🚨 Mensajes Críticos" después de "Objeciones detectadas automáticamente"
- Incluye:
  - Contenedor para críticos predefinidos: `#predefined-critical-rules`
  - Contenedor para críticos personalizados: `#custom-critical-rules`
  - Botón para agregar crítico: `#add-critical-rule-btn`

**Archivo:** `sales-context.js` ✅ MODIFICADO

**Cambios:**
- `initSalesContextPanel()`: Agregados event listeners para críticos
- `loadSalesContext()`: Agregada llamada a `loadCriticalRules()`
- **Nuevas funciones agregadas:**
  - `loadCriticalRules(userId)` - Carga críticos desde BD
  - `renderPredefinedCriticalRules(rules)` - Renderiza switches de críticos predefinidos
  - `renderCustomCriticalRules(rules)` - Renderiza lista de críticos personalizados
  - `createCriticalRuleCard(rule)` - Crea tarjeta HTML para crítico
  - `handleToggleCriticalRule(checkbox)` - Activa/desactiva crítico
  - `handleDeleteCriticalRule(button)` - Elimina crítico personalizado
  - `addCustomCriticalRule()` - Agrega nuevo crítico personalizado

### 4. Workflow n8n

**Archivo:** `n8n/Elina V4 (1).json` ✅ MODIFICADO

**Cambios en nodo "AI Agent" (línea 307):**

**Antes:**
```
**INFORMACIÓN DE LA EMPRESA:**
- Sitio Web: {{ ... || 'No proporcionado' }}
- Instagram: {{ ... || 'No proporcionado' }}
...
```

**Después:**
```
**INFORMACIÓN DE LA EMPRESA (SOLO DATOS DISPONIBLES):**
{{ $('Obtener Perfil de Usuario1').item.json.website ? '- Sitio Web: ' + ... + '\n' : '' }}
{{ $('Obtener Perfil de Usuario1').item.json.business_address ? '- Dirección: ' + ... + '\n' : '' }}
{{ $('Obtener Perfil de Usuario1').item.json.business_phone ? '- Teléfono: ' + ... + '\n' : '' }}
{{ $('Obtener Perfil de Usuario1').item.json.pickup_location ? '- Ubicación de recogida: ' + ... + '\n' : '' }}

### 🚨 REGLA CRÍTICA: NO INVENTAR DATOS 🚨
**NUNCA inventes direcciones, teléfonos, ubicaciones, información de envíos o tracking.**
- Si NO tienes un dato disponible arriba, NO lo menciones ni lo inventes.
- Si te preguntan por algo que no está en la lista de arriba, di honestamente: "No tengo esa información disponible. Un humano te puede ayudar mejor con eso."
- **INFORMACIÓN DE ENVÍOS:** {{ has_shipping_system === false ? 'El negocio NO tiene sistema de tracking...' : 'El negocio tiene sistema de tracking...' }}
```

**Nodo "Obtener Perfil de Usuario1":**
- ✅ NO requiere cambios (obtiene todos los campos automáticamente)

**Nodo "Detectar Intención Crítica1":**
- ✅ NO requiere cambios (usa Edge Function que llama a SQL actualizada)

---

## 🗄️ Estructura de Base de Datos

### Tabla `critical_rules` (NUEVA)

```sql
CREATE TABLE public.critical_rules (
    id bigint PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    rule_name text NOT NULL,
    rule_type text NOT NULL CHECK (rule_type IN ('keyword', 'pattern')),
    pattern_or_keyword text NOT NULL,
    detection_type text NOT NULL,
    is_active boolean DEFAULT true,
    is_predefined boolean DEFAULT false,
    priority integer DEFAULT 100,
    case_sensitive boolean DEFAULT false,
    created_at timestamptz,
    updated_at timestamptz,
    UNIQUE(user_id, rule_name)
);
```

**Reglas predefinidas que se crean automáticamente:**
1. **Solicitud de Humano** (`human_request`) - Prioridad 10
2. **Intención de Compra** (`purchase_intent`) - Prioridad 20
3. **Atención Urgente** (`urgent_attention`) - Prioridad 30

### Tabla `profiles` (EXTENDIDA)

**Nuevos campos agregados:**
- `business_address` (text) - Dirección del negocio
- `business_phone` (text) - Teléfono de contacto del negocio
- `pickup_location` (text) - Ubicación de recogida
- `shipping_info` (jsonb) - Información de envíos
- `has_shipping_system` (boolean) - Si tienen sistema de tracking

### Función SQL `detect_critical_intent()` (MODIFICADA)

**Cambios principales:**
1. Consulta `critical_rules` del usuario (prioridad más alta)
2. Verifica `has_shipping_system` del perfil
3. Si `has_shipping_system = false`, detecta consultas de envíos como críticas
4. Mantiene compatibilidad con `critical_keywords` (sistema anterior)
5. Inicializa reglas por defecto si no existen

**Flujo de detección:**
```
1. Reglas personalizadas activas (critical_rules) - Prioridad más alta
2. Detección de envíos (si has_shipping_system = false)
3. Palabras clave personalizadas (critical_keywords) - Compatibilidad
```

---

## 🎯 Cómo Usar el Sistema

### Para el Usuario Final

#### 1. Configurar Datos del Negocio

**Ubicación:** Panel "Configuración" → Sección "Datos del Negocio"

**Pasos:**
1. Ir a Settings
2. Completar campos:
   - Dirección del Negocio (opcional)
   - Teléfono de Contacto del Negocio (opcional)
   - Ubicación de Recogida (opcional, si aplica)
   - Marcar checkbox "Tengo sistema de tracking de envíos" (si aplica)
3. Guardar

**Importante:** Si no completas un campo, la IA NO lo inventará. Simplemente dirá que no tiene esa información.

#### 2. Configurar Mensajes Críticos

**Ubicación:** Panel "Contexto de Ventas" → Sección "🚨 Mensajes Críticos"

**Críticos Predefinidos:**
- Toggle para activar/desactivar cada uno:
  - ✅ Solicitud de Humano
  - ✅ Intención de Compra
  - ✅ Atención Urgente

**Críticos Personalizados:**
1. Clic en "Agregar crítico"
2. Ingresar:
   - Nombre del crítico (ej: "Consulta de envío")
   - Tipo: Palabra clave simple o Patrón (regex)
   - Patrón/Palabra: (ej: `(dónde|donde).*(envío|envio|pedido)`)
   - Tipo de detección: `shipping_inquiry`, `custom`, etc.
3. Se guarda automáticamente

**Ejemplo de Crítico Personalizado:**
- **Nombre:** "Consulta de Envío"
- **Tipo:** Patrón
- **Patrón:** `(dónde|donde).*(envío|envio|pedido|paquete)|(tracking|rastreo|seguimiento)`
- **Detección:** `shipping_inquiry`

---

## 🔄 Flujo Completo del Sistema

### 1. Configuración Inicial

```
Usuario → Settings → Completa "Datos del Negocio"
Usuario → Contexto de Ventas → Configura "Mensajes Críticos"
```

### 2. Flujo de Conversación

```
Mensaje llega → n8n recibe (Webhook1)
  ↓
Obtener Perfil de Usuario1 → Incluye nuevos campos
  ↓
Detectar Intención Crítica1 → Llama a Edge Function
  ↓
Edge Function → Llama a detect_critical_intent() SQL
  ↓
SQL consulta critical_rules del usuario
  ↓
Si detecta crítico → Pausa conversación + Notifica
  ↓
Si NO es crítico → Continúa a AI Agent
  ↓
AI Agent → Recibe prompt con datos disponibles
  ↓
AI Agent → Responde (sin inventar datos)
```

### 3. Prevención de Alucinaciones

**En el prompt del AI Agent:**
- Solo muestra datos que existen en el perfil
- Si `has_shipping_system = false`, instrucción específica para envíos
- Reglas estrictas: "NUNCA inventes direcciones, teléfonos, etc."

---

## 🧪 Cómo Probar

### Prueba 1: Críticos Predefinidos

1. **Activar "Solicitud de Humano"** en Contexto de Ventas
2. Enviar mensaje: "Quiero hablar con un humano"
3. **Resultado esperado:**
   - Conversación pausada
   - Notificación WhatsApp al dueño
   - Etiqueta "ignorar" agregada al contacto

### Prueba 2: Crítico Personalizado

1. **Agregar crítico personalizado:**
   - Nombre: "Consulta de Envío"
   - Tipo: Patrón
   - Patrón: `(dónde|donde).*(envío|envio)`
   - Detección: `shipping_inquiry`
2. Enviar mensaje: "¿Dónde está mi envío?"
3. **Resultado esperado:**
   - Detectado como crítico
   - Conversación pausada
   - Notificación enviada

### Prueba 3: Prevención de Alucinaciones

1. **NO completar** "Dirección del Negocio" en Settings
2. Enviar mensaje: "¿Cuál es tu dirección?"
3. **Resultado esperado:**
   - IA responde: "No tengo esa información disponible. Un humano te puede ayudar mejor con eso."
   - ❌ NO inventa una dirección

### Prueba 4: Sistema de Envíos

1. **Marcar `has_shipping_system = false`** en Settings
2. Enviar mensaje: "¿Dónde está mi pedido?"
3. **Resultado esperado:**
   - Detectado como crítico (`shipping_inquiry`)
   - Conversación pausada
   - O si no se detecta como crítico, IA dice: "No puedo proporcionar información de envíos. Un humano te ayudará."

---

## 📝 SQL para Verificar

### Ver reglas críticas de un usuario

```sql
SELECT * FROM critical_rules 
WHERE user_id = 'TU_USER_ID'
ORDER BY is_predefined DESC, priority ASC;
```

### Ver datos del negocio

```sql
SELECT 
    id, 
    business_address, 
    business_phone, 
    pickup_location, 
    has_shipping_system 
FROM profiles 
WHERE id = 'TU_USER_ID';
```

### Ver detecciones recientes

```sql
SELECT 
    cd.*,
    cr.rule_name,
    cr.rule_type
FROM critical_detections cd
LEFT JOIN critical_rules cr ON cr.detection_type = cd.detection_type
WHERE cd.user_id = 'TU_USER_ID'
ORDER BY cd.created_at DESC
LIMIT 10;
```

---

## ⚠️ Puntos Importantes

### 1. Migración SQL

**⚠️ CRÍTICO:** Debes ejecutar `supabase/schema/20251211_critical_customization.sql` en Supabase antes de usar el sistema.

**Cómo ejecutar:**
1. Ir a Supabase Dashboard
2. SQL Editor
3. Copiar y pegar todo el contenido del archivo
4. Ejecutar

### 2. Inicialización de Reglas

Las reglas predefinidas se crean automáticamente cuando:
- Se ejecuta la migración SQL (para usuarios existentes)
- Un usuario nuevo se registra (si hay trigger)
- Se llama a `initialize_default_critical_rules()` manualmente

### 3. Compatibilidad

- ✅ Compatible con sistema anterior (`critical_keywords`)
- ✅ Las reglas personalizadas tienen prioridad sobre las predefinidas
- ✅ Si no hay reglas personalizadas, usa las predefinidas

### 4. Workflow n8n

- ✅ No requiere cambios adicionales
- ✅ El nodo "Obtener Perfil de Usuario1" obtiene todos los campos automáticamente
- ✅ El prompt del AI Agent ya está actualizado

---

## 🐛 Troubleshooting

### Problema: No se detectan críticos personalizados

**Solución:**
1. Verificar que la regla esté activa (`is_active = true`)
2. Verificar que el patrón/palabra clave sea correcto
3. Revisar logs de la función SQL en Supabase

### Problema: La IA sigue inventando datos

**Solución:**
1. Verificar que el prompt del AI Agent esté actualizado en n8n
2. Verificar que "Obtener Perfil de Usuario1" esté obteniendo los campos
3. Revisar que los campos estén guardados en `profiles`

### Problema: No se crean reglas predefinidas

**Solución:**
```sql
-- Ejecutar manualmente para un usuario:
SELECT initialize_default_critical_rules('TU_USER_ID');
```

---

## 📚 Referencias de Código

### Archivos Clave

1. **Migración SQL:** `supabase/schema/20251211_critical_customization.sql`
2. **Función SQL:** `supabase/schema/20251125_realtime_critical_detection.sql` (modificada)
3. **Edge Function:** `supabase/functions/detect-critical-intent/index.ts` (no modificada, pero usa SQL actualizada)
4. **Frontend Settings:** `settings.html`, `settings.js`
5. **Frontend Sales Context:** `dashboard.html`, `sales-context.js`
6. **Workflow n8n:** `n8n/Elina V4 (1).json` (nodo AI Agent modificado)

### Funciones SQL Importantes

- `detect_critical_intent(p_message_content, p_user_id, p_contact_id)` - Detecta críticos
- `initialize_default_critical_rules(p_user_id)` - Inicializa reglas por defecto
- `pause_conversation(...)` - Pausa conversación (ya existía)
- `resume_conversation(...)` - Reanuda conversación (ya existía)

---

## 🎯 Próximos Pasos (Si es Necesario)

### Pendientes (Opcionales)

- [ ] Agregar UI más amigable para editar críticos personalizados (actualmente usa `prompt()`)
- [ ] Agregar validación de patrones regex antes de guardar
- [ ] Agregar estadísticas de detecciones por tipo de crítico
- [ ] Agregar preview de cómo funciona un patrón antes de guardar

### Mejoras Futuras

- [ ] Permitir importar/exportar configuración de críticos
- [ ] Agregar plantillas de críticos comunes por industria
- [ ] Dashboard de análisis de críticos detectados

---

## 📞 Notas para Continuar

**Estado actual:** ✅ TODO IMPLEMENTADO Y FUNCIONANDO

**Para continuar en otro computador:**
1. Ejecutar migración SQL en Supabase
2. Verificar que los archivos estén guardados
3. Probar con los escenarios de prueba arriba
4. Si hay problemas, revisar la sección Troubleshooting

**Archivos que NO deben modificarse sin revisar este documento:**
- `supabase/schema/20251125_realtime_critical_detection.sql` (ya modificado)
- `n8n/Elina V4 (1).json` (nodo AI Agent ya modificado)

**Última actualización:** 11 de diciembre de 2025

