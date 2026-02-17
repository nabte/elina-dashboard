# 🔧 Fix: Flow volution-instance-create - Crear Perfil Correctamente

## ❌ Problema Actual

El nodo `profiles` usa `operation: "update"`, pero si el perfil **no existe** (porque deshabilitamos el trigger), el UPDATE **fallará**.

---

## ✅ Solución: Cambiar a INSERT con Upsert

### **Opción 1: Cambiar el nodo `profiles` a INSERT con Upsert (RECOMENDADO)**

En el nodo `profiles`, cambia la configuración:

**ANTES (UPDATE - falla si no existe):**
```json
{
  "operation": "update",
  "tableId": "profiles",
  "matchType": "allFilters",
  "filters": {
    "conditions": [
      {
        "keyName": "id",
        "condition": "eq",
        "keyValue": "={{ $('Get User ID from Supabase Auth').item.json.users[0].id }}"
      }
    ]
  }
}
```

**DESPUÉS (INSERT con Upsert - crea si no existe, actualiza si existe):**
```json
{
  "operation": "insert",
  "tableId": "profiles",
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": "id",
        "fieldValue": "={{ $('Get User ID from Supabase Auth').item.json.users[0].id }}"
      },
      {
        "fieldId": "evolution_instance_name",
        "fieldValue": "={{ $('Criar instancia').item.json.data.instance.instanceName }}"
      },
      {
        "fieldId": "evolution_api_key",
        "fieldValue": "={{ $('Buscar instancia').item.json.data[0].token }}"
      },
      {
        "fieldId": "full_name",
        "fieldValue": "={{ $('Webhook').item.json.body.nombre }}"
      },
      {
        "fieldId": "contact_phone",
        "fieldValue": "={{ $('Code2').item.json.telefono_admin }}"
      },
      {
        "fieldId": "email",
        "fieldValue": "={{ $('Webhook').item.json.body.email }}"
      },
      {
        "fieldId": "urlfoto",
        "fieldValue": "={{ $json.data.profilePictureUrl }}"
      },
      {
        "fieldId": "bulk_sends_used",
        "fieldValue": "0"
      },
      {
        "fieldId": "video_generations_used",
        "fieldValue": "0"
      },
      {
        "fieldId": "image_generations_used",
        "fieldValue": "0"
      },
      {
        "fieldId": "sync_status",
        "fieldValue": "Cargando"
      },
      {
        "fieldId": "whatsapp_connected",
        "fieldValue": "false"
      },
      {
        "fieldId": "timezone",
        "fieldValue": "America/Mexico_City"
      },
      {
        "fieldId": "role",
        "fieldValue": "user"
      },
      {
        "fieldId": "ai_enhancements_used",
        "fieldValue": "0"
      }
    ]
  },
  "options": {
    "upsert": true,
    "upsertFields": ["id"]
  }
}
```

**Nota:** El nodo de Supabase en n8n puede no tener la opción `upsert` directamente. Si no la tiene, usa la **Opción 2**.

---

### **Opción 2: Agregar Nodo INSERT Antes del UPDATE**

Agrega un nuevo nodo **antes** del nodo `profiles`:

**Nodo: "Crear Perfil Si No Existe"**

```json
{
  "parameters": {
    "operation": "insert",
    "tableId": "profiles",
    "fieldsUi": {
      "fieldValues": [
        {
          "fieldId": "id",
          "fieldValue": "={{ $('Get User ID from Supabase Auth').item.json.users[0].id }}"
        },
        {
          "fieldId": "email",
          "fieldValue": "={{ $('Webhook').item.json.body.email }}"
        },
        {
          "fieldId": "full_name",
          "fieldValue": "={{ $('Webhook').item.json.body.nombre }}"
        },
        {
          "fieldId": "sync_status",
          "fieldValue": "Cargando"
        },
        {
          "fieldId": "timezone",
          "fieldValue": "America/Mexico_City"
        },
        {
          "fieldId": "role",
          "fieldValue": "user"
        }
      ]
    },
    "options": {
      "skipOnConflict": true
    }
  },
  "type": "n8n-nodes-base.supabase",
  "typeVersion": 1,
  "name": "Crear Perfil Si No Existe",
  "credentials": {
    "supabaseApi": {
      "id": "mhKY7YSuY0L0jM2B",
      "name": "Supabase account"
    }
  }
}
```

**Conexión:** 
- Conectar desde `Buscar foto do perfil` → `Crear Perfil Si No Existe` → `profiles`

---

## ✅ Agregar Creación de Suscripción

Agrega un nodo **después** de `profiles` para crear la suscripción:

**Nodo: "Crear Suscripción"**

```json
{
  "parameters": {
    "operation": "insert",
    "tableId": "subscriptions",
    "fieldsUi": {
      "fieldValues": [
        {
          "fieldId": "user_id",
          "fieldValue": "={{ $('Get User ID from Supabase Auth').item.json.users[0].id }}"
        },
        {
          "fieldId": "plan_type",
          "fieldValue": "trial"
        },
        {
          "fieldId": "trial_ends_at",
          "fieldValue": "={{ new Date(Date.now() + 7*24*60*60*1000).toISOString() }}"
        },
        {
          "fieldId": "status",
          "fieldValue": "active"
        }
      ]
    },
    "options": {
      "skipOnConflict": true
    }
  },
  "type": "n8n-nodes-base.supabase",
  "typeVersion": 1,
  "name": "Crear Suscripción",
  "credentials": {
    "supabaseApi": {
      "id": "mhKY7YSuY0L0jM2B",
      "name": "Supabase account"
    }
  }
}
```

**Conexión:**
- Conectar desde `profiles` → `Crear Suscripción` → `Definir comportamento`

---

## 📋 Flujo Corregido

```
Webhook
  ↓
Wait (2 seg)
  ↓
Get User ID from Supabase Auth
  ↓
Criar instancia
  ↓
Edit Fields
  ↓
Buscar instancia
  ↓
Code2 (normalizar teléfono)
  ↓
Prepare Client Data
  ↓
Buscar foto do perfil
  ↓
[NUEVO] Crear Perfil Si No Existe (INSERT con skipOnConflict)
  ↓
profiles (UPDATE - ahora sí existe el perfil)
  ↓
[NUEVO] Crear Suscripción (INSERT con skipOnConflict)
  ↓
Definir comportamento
  ↓
Enviar texto
```

---

## 🔍 Verificar que Funciona

Después de hacer los cambios:

1. **Registra un usuario nuevo**
2. **Verifica en Supabase:**

```sql
-- Verificar que el perfil se creó
SELECT id, full_name, email, evolution_instance_name, contact_phone 
FROM profiles 
ORDER BY updated_at DESC 
LIMIT 1;

-- Verificar que la suscripción se creó
SELECT user_id, plan_type, trial_ends_at, status 
FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## ✅ Checklist

- [ ] Cambié el nodo `profiles` a INSERT con upsert (Opción 1) O agregué nodo INSERT antes (Opción 2)
- [ ] Agregué nodo "Crear Suscripción" después de `profiles`
- [ ] Probé registrar un usuario nuevo
- [ ] Verifiqué que el perfil se creó correctamente
- [ ] Verifiqué que la suscripción se creó correctamente
- [ ] El flow completa sin errores

---

¿Prefieres la Opción 1 (cambiar a INSERT) o la Opción 2 (agregar nodo INSERT antes)? 🚀

