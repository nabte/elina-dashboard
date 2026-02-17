# ✅ Solución: Deshabilitar Trigger de Perfil (Perfil se crea desde n8n)

## 🎯 Situación Actual

- ❌ El trigger `handle_new_user` está intentando crear el perfil automáticamente
- ✅ El perfil debe crearse desde **n8n** después del registro
- ✅ El webhook `volution-instance-create` en n8n actualiza el perfil con `UPDATE`

---

## ✅ Solución: Deshabilitar el Trigger

### **Paso 1: Ejecutar SQL en Supabase**

Ejecuta este SQL en Supabase Dashboard:

**Archivo:** `supabase/schema/20251202_disable_profile_trigger.sql`

Este script:
- ✅ Deshabilita el trigger `on_auth_user_created`
- ✅ El perfil NO se creará automáticamente
- ✅ El registro funcionará sin errores
- ✅ n8n creará/actualizará el perfil después

---

### **Paso 2: Verificar que el Trigger está Deshabilitado**

```sql
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE tgenabled
        WHEN 'O' THEN 'Disabled'
        WHEN 'A' THEN 'Enabled'
        ELSE 'Unknown'
    END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

**Resultado esperado:** `status = 'Disabled'`

---

## 🔄 Flujo Correcto Ahora

### **1. Usuario se Registra:**
```
Frontend (auth.js) → Supabase Auth.signUp()
  ↓
✅ Usuario creado en auth.users
✅ Trigger deshabilitado → NO crea perfil automáticamente
✅ Webhook n8n llamado: volution-instance-create
```

### **2. n8n Procesa el Webhook:**
```
Webhook recibe: { nombre, email, telefono_admin, Passwr }
  ↓
1. Get User ID from Supabase Auth
2. Criar instancia (Evolution API)
3. Buscar instancia
4. Buscar foto do perfil
5. UPDATE profiles (crea/actualiza el perfil)
6. Definir comportamento
7. Enviar texto (notificación)
```

### **3. Perfil Creado desde n8n:**
- ✅ `profiles` se actualiza con todos los datos
- ✅ `evolution_instance_name` y `evolution_api_key` se guardan
- ✅ `contact_phone` se normaliza y guarda
- ✅ `urlfoto` se obtiene y guarda

---

## ⚠️ Nota sobre Suscripciones

Si quieres que la suscripción se cree automáticamente (sin esperar a n8n), puedes:

### **Opción A: Crear suscripción desde n8n**

Agrega un nodo en n8n después de actualizar el perfil:

```json
{
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
  }
}
```

### **Opción B: Usar trigger simplificado (solo suscripción)**

Si prefieres que la suscripción se cree automáticamente, puedes usar el trigger simplificado del SQL:

```sql
-- Descomenta estas líneas en el SQL:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription_only();
```

Este trigger solo crea la suscripción, NO el perfil.

---

## ✅ Cambios Realizados

1. ✅ **SQL creado:** `supabase/schema/20251202_disable_profile_trigger.sql`
2. ✅ **auth.js modificado:** Eliminado el código que intentaba crear suscripción desde el frontend
3. ✅ **Trigger deshabilitado:** El perfil se crea solo desde n8n

---

## 🧪 Probar el Registro

1. **Ejecuta el SQL** para deshabilitar el trigger
2. **Intenta registrar un usuario nuevo**
3. **Verifica que:**
   - ✅ No aparece error en la consola
   - ✅ El usuario se crea en `auth.users`
   - ✅ El webhook de n8n se llama
   - ✅ n8n crea/actualiza el perfil
   - ✅ El perfil tiene todos los datos correctos

---

## 🔍 Verificar que Funcionó

```sql
-- Verificar que el trigger está deshabilitado
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Verificar que el usuario se creó
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Verificar que n8n creó el perfil
SELECT id, full_name, email, evolution_instance_name, contact_phone 
FROM profiles 
ORDER BY updated_at DESC 
LIMIT 5;
```

---

## ✅ Checklist

- [ ] Ejecuté el SQL para deshabilitar el trigger
- [ ] Verifiqué que el trigger está deshabilitado
- [ ] Probé registrar un usuario nuevo
- [ ] Verifiqué que no aparece error en la consola
- [ ] Verifiqué que el webhook de n8n se llama
- [ ] Verifiqué que n8n crea/actualiza el perfil correctamente
- [ ] (Opcional) Agregué nodo en n8n para crear suscripción

---

¿Ejecutaste el SQL? El registro debería funcionar ahora sin errores. 🚀

