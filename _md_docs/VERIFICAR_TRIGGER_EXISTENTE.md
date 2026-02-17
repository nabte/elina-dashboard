# ✅ Verificar Trigger Existente

## 🎯 Buenas Noticias

El trigger **`on_auth_user_created`** **YA EXISTE** en tu base de datos. Solo necesitas verificar si está habilitado.

---

## 📋 Trigger Encontrado

**Trigger:** `auth.users → on_auth_user_created`

**Descripción:**
- ✅ Crea/actualiza un perfil en `public.profiles` cuando se crea un usuario
- ✅ Usa la función `public.handle_new_user()`
- ✅ Genera API key por defecto si falta
- ✅ Maneja fallback mínimo si hay error

**Esto es exactamente lo que necesitas.**

---

## 🔍 Verificar Estado del Trigger

Ejecuta este SQL para ver si está habilitado o deshabilitado:

```sql
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE tgenabled
        WHEN 'A' THEN 'Enabled ✅'
        WHEN 'O' THEN 'Disabled ❌'
        WHEN 'D' THEN 'Disabled (replica)'
        WHEN 'R' THEN 'Disabled (always)'
        ELSE 'Unknown'
    END as status,
    tgenabled as enabled_code
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

**Resultados posibles:**
- **`Enabled ✅`**: El trigger está activo, debería funcionar
- **`Disabled ❌`**: El trigger está deshabilitado, necesitas habilitarlo

---

## ✅ Si el Trigger Está Habilitado

Si el trigger está **Enabled ✅**, entonces:

1. ✅ **El trigger ya funciona** - crea el perfil automáticamente
2. ✅ **Solo necesitas actualizar la función** (si quieres cambios)
3. ✅ **No necesitas hacer nada más**

Ejecuta solo el SQL que actualiza la función:
- **Archivo:** `supabase/schema/20251202_update_function_only.sql`

---

## ❌ Si el Trigger Está Deshabilitado

Si el trigger está **Disabled ❌**, necesitas habilitarlo:

### **Opción 1: Desde Supabase Dashboard (Recomendado)**

1. Ve a **Supabase Dashboard**
2. **Database** → **Triggers**
3. Busca `on_auth_user_created` en la tabla `auth.users`
4. Haz clic en **Enable**

### **Opción 2: Con Service Role Key**

Si tienes acceso a la **Service Role Key**, ejecuta:

```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

---

## 🧪 Probar que Funciona

Después de verificar/habilitar el trigger:

1. **Registra un usuario nuevo**
2. **Verifica que el perfil se creó automáticamente:**

```sql
SELECT 
    id, 
    full_name, 
    email, 
    evolution_instance_name, 
    contact_phone,
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 1;
```

3. **Verifica que n8n actualizó el perfil después:**

```sql
SELECT 
    id, 
    full_name, 
    email, 
    evolution_instance_name, 
    evolution_api_key,
    contact_phone,
    urlfoto,
    updated_at
FROM profiles 
ORDER BY updated_at DESC 
LIMIT 1;
```

---

## 📋 Otros Triggers Útiles que Tienes

### **Trigger #9: `profiles_default_label_trigger`**
- Crea una etiqueta por defecto ('no-existe', roja) para nuevos usuarios
- ✅ Útil, déjalo activo

### **Trigger #4 y #5: Limpieza de Labels en Contacts**
- Limpia y normaliza labels en contactos
- ✅ Útiles, déjalos activos

### **Trigger #8: `trg_prevent_duplicate_label_insert`**
- Previene duplicados de etiquetas
- ✅ Útil, déjalo activo

### **Trigger #12: `on_new_business_subscription`**
- Crea teams automáticamente para suscripciones Business
- ✅ Útil si usas planes Business

---

## ✅ Checklist

- [ ] Verifiqué el estado del trigger `on_auth_user_created`
- [ ] Si está Disabled, lo habilité desde Dashboard
- [ ] Ejecuté `20251202_update_function_only.sql` (actualizar función)
- [ ] Probé registrar un usuario nuevo
- [ ] Verifiqué que el perfil se creó automáticamente
- [ ] Verifiqué que n8n actualizó el perfil con los datos completos

---

## 🎯 Resumen

**El trigger ya existe.** Solo necesitas:
1. Verificar si está habilitado
2. Habilitarlo si está deshabilitado (desde Dashboard)
3. Actualizar la función si quieres cambios (opcional)

¿Verificaste el estado del trigger? 🚀

