# 🔍 Guía: Sistema de "Ignorar" y "Pausar Seguimiento"

## 📋 Dos Sistemas Diferentes

Hay **DOS sistemas separados** que funcionan de forma independiente:

### 1. **Sistema de "Ignorar" (Labels)** 🏷️
- **Campo:** `contacts.labels` (array de strings)
- **Función:** Controla si la **IA responde o no** en el chat actual
- **Valor:** `["ignorar"]` o similar
- **Efecto:** La IA NO genera respuesta cuando el contacto tiene esta label

### 2. **Sistema de "Pausar Seguimiento" (Followup Status)** ⏸️
- **Campo:** `contacts.followup_status` (string)
- **Función:** Controla si el **sistema de seguimiento automático** envía mensajes programados
- **Valores:** `'active'` o `'paused'`
- **Efecto:** Detiene los mensajes automáticos programados (followups)

---

## 🔄 Cómo Funciona Cada Sistema

### Sistema 1: "Ignorar" (Labels)

#### **Flujo cuando se detecta algo crítico:**

```
Detectar Intención Crítica → IF: ¿Es Crítico? → Enviar Notificación WhatsApp
                                                      ↓
                                    Preparar Labels con Ignorar1
                                                      ↓
                                         Update a row1 (agrega label "ignorar")
```

#### **Nodos involucrados:**

1. **"ignorar?1"** (IF node)
   - **Verifica:** ¿El contacto ya tiene la label "ignorar"?
   - **Si SÍ tiene:** NO procesa el mensaje (se detiene)
   - **Si NO tiene:** Continúa el flujo normal

2. **"Preparar Labels con Ignorar1"** (Code node)
   - Obtiene las labels actuales del contacto
   - Agrega "ignorar" si no existe (case-insensitive)
   - Retorna el array actualizado

3. **"Update a row1"** (Supabase node)
   - Actualiza el contacto en la BD
   - Guarda las labels con "ignorar" incluida

#### **Código del nodo "Preparar Labels con Ignorar1":**

```javascript
// Obtener las labels actuales del contacto
const currentLabels = $('Merge5').item.json.labels || [];

// Convertir a array si es string o null
let labelsArray = [];
if (Array.isArray(currentLabels)) {
  labelsArray = [...currentLabels];
} else if (typeof currentLabels === 'string') {
  try {
    labelsArray = JSON.parse(currentLabels);
  } catch (e) {
    labelsArray = currentLabels.split(',').map(l => l.trim()).filter(Boolean);
  }
}

// Verificar si "ignorar" ya existe (case-insensitive)
const hasIgnore = labelsArray.some(label => 
  label && label.toString().toLowerCase().trim() === 'ignorar'
);

// Agregar "ignorar" solo si no existe
if (!hasIgnore) {
  labelsArray.push('ignorar');
}

// Retornar el array preparado
return [{
  json: {
    ...$('Merge5').item.json,
    labels: labelsArray,
    phone_number: $('Merge5').item.json.phone_number
  }
}];
```

---

### Sistema 2: "Pausar Seguimiento Activo" (Followup Status)

#### **Qué hace el nodo "Pausar Seguimiento Activo1":**

```sql
UPDATE public.contacts
SET followup_status = 'paused'
WHERE 
  user_id = '{{ $('Get a row1').item.json.id }}' 
  AND phone_number = '{{ número del contacto }}'
  AND followup_status = 'active';
```

**Función:**
- Cuando llega un mensaje nuevo de un contacto
- Si ese contacto tiene `followup_status = 'active'` (seguimiento automático activo)
- Lo cambia a `'paused'` para **detener los mensajes automáticos programados**

**Ejemplo:**
- Contacto tiene seguimiento activo que envía mensajes cada 3 días
- Cliente envía un mensaje manual
- El nodo pausa el seguimiento automático
- Ya NO se enviarán más mensajes programados hasta que se reactive

#### **Conexión del nodo:**

```
Get a row1 → Pausar Seguimiento Activo1 → Registrar Métrica1
```

**Está conectado correctamente** desde "Get a row1", lo que significa que se ejecuta cuando llega cualquier mensaje nuevo.

---

## ⚠️ Problema: "Ignorar" no se guarda siempre

### Posibles causas:

1. **El nodo "Update a row1" no se ejecuta**
   - Verifica que esté conectado después de "Preparar Labels con Ignorar1"
   - Revisa que el flujo de detección crítica llegue hasta ahí

2. **El nodo "ignorar?1" detiene el flujo antes**
   - Si el contacto YA tiene "ignorar", el flujo se detiene
   - No llega a "Preparar Labels con Ignorar1"

3. **Error en la actualización de Supabase**
   - Revisa los logs del nodo "Update a row1"
   - Verifica permisos RLS en la tabla `contacts`

4. **El flujo de detección crítica no se ejecuta**
   - Verifica que "Detectar Intención Crítica1" se ejecute
   - Revisa que "IF: ¿Es Crítico?" detecte correctamente

### Cómo verificar:

1. **Revisa el flujo en n8n:**
   ```
   Detectar Intención Crítica1
        ↓
   IF: ¿Es Crítico? (TRUE)
        ↓
   Enviar Notificación WhatsApp
        ↓
   Preparar Labels con Ignorar1
        ↓
   Update a row1 ← ¿Se ejecuta?
   ```

2. **Verifica en la base de datos:**
   ```sql
   -- Ver contactos con label "ignorar"
   SELECT id, full_name, phone_number, labels, followup_status
   FROM contacts
   WHERE labels @> ARRAY['ignorar']::text[]
      OR labels @> ARRAY['Ignorar']::text[]
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

3. **Revisa los logs de n8n:**
   - Abre una ejecución donde debería haberse agregado "ignorar"
   - Verifica que todos los nodos se ejecutaron correctamente
   - Busca errores en "Update a row1"

---

## 🎯 Diferencia Clave

| Aspecto | Sistema "Ignorar" (Labels) | Sistema "Pausar Seguimiento" |
|---------|---------------------------|------------------------------|
| **Campo** | `contacts.labels` | `contacts.followup_status` |
| **Controla** | Si la IA responde en el chat | Si se envían mensajes automáticos |
| **Cuándo se activa** | Cuando se detecta intención crítica | Cuando llega cualquier mensaje nuevo |
| **Efecto** | La IA NO genera respuesta | NO se envían followups programados |
| **Nodo principal** | "Preparar Labels con Ignorar1" | "Pausar Seguimiento Activo1" |

---

## ✅ Solución Recomendada

### Para que "ignorar" se guarde siempre:

1. **Verifica la conexión del flujo:**
   - Asegúrate de que "Update a row1" esté conectado después de "Preparar Labels con Ignorar1"
   - Verifica que no haya un nodo que detenga el flujo antes

2. **Revisa el nodo "ignorar?1":**
   - Este nodo verifica si YA tiene "ignorar"
   - Si lo tiene, se detiene (esto es correcto)
   - Si NO lo tiene, continúa para agregarlo

3. **Agrega logging:**
   - En "Preparar Labels con Ignorar1", agrega un console.log para ver qué labels se están preparando
   - En "Update a row1", verifica que se esté ejecutando

4. **Verifica permisos:**
   - Asegúrate de que el usuario tenga permisos para actualizar `contacts.labels`
   - Revisa las políticas RLS en Supabase

---

## 🔧 Debugging

### Query para verificar estado actual:

```sql
-- Ver contactos y sus estados
SELECT 
  id,
  full_name,
  phone_number,
  labels,
  followup_status,
  updated_at
FROM contacts
WHERE user_id = 'tu-user-id'
ORDER BY updated_at DESC
LIMIT 20;
```

### Verificar si "ignorar" está en las labels:

```sql
-- Contactos con "ignorar" (case-insensitive)
SELECT 
  id,
  full_name,
  labels,
  CASE 
    WHEN labels IS NULL THEN 'Sin labels'
    WHEN EXISTS (
      SELECT 1 FROM unnest(labels) AS label
      WHERE lower(trim(label)) = 'ignorar'
    ) THEN 'Tiene ignorar'
    ELSE 'No tiene ignorar'
  END AS estado_ignorar
FROM contacts
WHERE user_id = 'tu-user-id';
```

---

## 📝 Resumen

1. **"Pausar Seguimiento Activo1"** está conectado y funciona correctamente
   - Se ejecuta cuando llega cualquier mensaje nuevo
   - Pausa el seguimiento automático (followups)

2. **"Ignorar" (labels)** es un sistema diferente
   - Se agrega cuando se detecta intención crítica
   - Controla si la IA responde o no

3. **Si "ignorar" no se guarda:**
   - Verifica que el flujo de detección crítica se ejecute
   - Revisa que "Update a row1" esté conectado y se ejecute
   - Verifica permisos y logs de n8n

