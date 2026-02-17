# 🔧 Cómo Habilitar el Trigger Manualmente

## ❌ Problema

No tienes permisos para modificar triggers en `auth.users` desde el SQL Editor normal. Esto requiere permisos de **superusuario** o **service_role**.

---

## ✅ Solución: Habilitar el Trigger Manualmente

### **Opción 1: Desde Supabase Dashboard (Recomendado)**

1. Ve a **Supabase Dashboard**
2. **Database** → **Triggers**
3. Busca el trigger `on_auth_user_created` en la tabla `auth.users`
4. Si está **Disabled**, haz clic en **Enable**

---

### **Opción 2: Usar Service Role Key en SQL**

Si tienes acceso a la **Service Role Key**, puedes ejecutar este SQL usando esa key:

```sql
-- Solo ejecutar si tienes Service Role Key
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

**Nota:** La Service Role Key tiene permisos de superusuario y puede modificar triggers en `auth.users`.

---

### **Opción 3: Verificar si Ya Está Habilitado**

Primero verifica el estado actual:

```sql
SELECT 
    tgname as trigger_name,
    CASE tgenabled
        WHEN 'A' THEN 'Enabled ✅'
        WHEN 'O' THEN 'Disabled ❌'
        ELSE 'Unknown'
    END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

- Si muestra **`Enabled ✅`**: El trigger ya está habilitado, no necesitas hacer nada
- Si muestra **`Disabled ❌`**: Necesitas habilitarlo manualmente (Opción 1 o 2)

---

## 📋 Lo que Ya Hicimos

He creado un SQL que **solo actualiza la función** (no toca el trigger):

**Archivo:** `supabase/schema/20251202_update_function_only.sql`

Este SQL:
- ✅ Actualiza la función `handle_new_user` (sí puedes hacerlo)
- ✅ No intenta modificar el trigger (no tienes permisos)
- ✅ Verifica el estado del trigger (solo lectura)

---

## 🔍 Verificar que Todo Funciona

Después de habilitar el trigger manualmente:

1. **Registra un usuario nuevo**
2. **Verifica que el perfil se creó automáticamente:**

```sql
SELECT id, full_name, email, evolution_instance_name, contact_phone 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 1;
```

3. **Verifica que el trigger está habilitado:**

```sql
SELECT 
    tgname as trigger_name,
    CASE tgenabled
        WHEN 'A' THEN 'Enabled ✅'
        WHEN 'O' THEN 'Disabled ❌'
        ELSE 'Unknown'
    END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

---

## ✅ Checklist

- [ ] Ejecuté `20251202_update_function_only.sql` (actualiza la función)
- [ ] Verifiqué el estado del trigger (Enabled o Disabled)
- [ ] Si está Disabled, lo habilité manualmente desde Dashboard
- [ ] Probé registrar un usuario nuevo
- [ ] Verifiqué que el perfil se creó automáticamente

---

## 🆘 Si el Trigger No Existe

Si el trigger no existe, necesitas ejecutar el SQL original que lo crea:

**Archivo:** `supabase/schema/20251112_fix_profile_bootstrap.sql`

Este SQL crea el trigger con los permisos correctos (debe ejecutarse con service_role o desde migrations).

---

¿Verificaste el estado del trigger? Si está Disabled, habilítalo manualmente desde el Dashboard. 🚀

