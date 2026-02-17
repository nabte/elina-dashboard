# 🔍 Explicación del Error: "permission denied for function is_superadmin"

## ❌ ¿Qué significa este error?

**Error:** `permission denied for function is_superadmin`

**Código:** `42501` (PostgreSQL error code para "insufficient privilege")

**Significado:** El usuario que intenta registrarse NO tiene permisos para ejecutar la función `is_superadmin()` que probablemente está siendo llamada por un trigger o función en la tabla `subscriptions`.

---

## 🔍 ¿Por qué ocurre?

Cuando un usuario nuevo se registra:

1. ✅ Se crea el usuario en `auth.users` (esto funciona)
2. ❌ El código intenta insertar en `subscriptions` (línea 248 de `auth.js`)
3. ❌ La tabla `subscriptions` probablemente tiene un trigger o función que llama a `is_superadmin()`
4. ❌ El usuario recién creado NO tiene permisos para ejecutar esa función
5. ❌ Falla la inserción

---

## ✅ Solución 1: Modificar el Trigger (RECOMENDADO - Mejor Solución)

Ya existe un trigger `handle_new_user` que se ejecuta cuando se crea un usuario. Vamos a modificarlo para que **también cree la suscripción automáticamente**.

**Archivo:** `supabase/schema/20251202_add_subscription_to_trigger.sql`

### **Pasos:**

1. Ve a **Supabase Dashboard**
2. **SQL Editor** → **New Query**
3. Copia y pega el contenido del archivo `20251202_add_subscription_to_trigger.sql`
4. **Run** (o presiona Ctrl+Enter)
5. Verifica que aparezca: `✅ Tabla subscriptions creada exitosamente`

**Ventaja:** Con esto, **NO necesitas modificar el código de `auth.js`**. La suscripción se crea automáticamente cuando se registra un usuario.

---

## ✅ Solución 2: Ejecutar el SQL de Fix (Alternativa)

Si prefieres mantener el código actual en `auth.js`, ejecuta este SQL:

**Archivo:** `supabase/schema/20251202_fix_subscription_insert_permissions.sql`

### **Pasos:**

1. Ve a **Supabase Dashboard**
2. **SQL Editor** → **New Query**
3. Copia y pega el contenido del archivo `20251202_fix_subscription_insert_permissions.sql`
4. **Run** (o presiona Ctrl+Enter)
5. Verifica que aparezca: `✅ Política de INSERT agregada a subscriptions`

---

## ✅ Solución 2: Usar Trigger Automático (Alternativa)

En lugar de insertar desde el frontend, podemos hacer que Supabase cree la suscripción automáticamente cuando se crea un usuario.

### **SQL para crear trigger automático:**

```sql
-- Función que crea suscripción automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear perfil (si no existe)
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Crear suscripción de prueba
  INSERT INTO public.subscriptions (user_id, plan_type, trial_ends_at)
  VALUES (
    NEW.id,
    'trial',
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Ventaja:** No necesitas modificar el código de `auth.js`, se hace automáticamente.

**Desventaja:** Si ya tienes un trigger `handle_new_user`, podría haber conflicto.

---

## ✅ Solución 3: Modificar el Código Frontend (Temporal)

Si no puedes ejecutar SQL ahora, puedes hacer que el error no bloquee el registro:

**Modificar `auth.js` línea 248-252:**

```javascript
// Si el usuario se creó correctamente, creamos su registro de prueba
if (data.user) {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const { error: subError } = await this.sb.from('subscriptions').insert({
        user_id: data.user.id,
        trial_ends_at: trialEndDate.toISOString()
    });
    
    // ⚠️ CAMBIO: Solo loguear el error, no bloquear el registro
    if (subError) {
        console.warn("No se pudo crear suscripción de prueba (se creará automáticamente):", subError);
        // El usuario puede continuar, la suscripción se creará después
    }
}
```

**Nota:** Esto es solo temporal. La mejor solución es ejecutar el SQL de fix.

---

## 🔍 Verificar si el Problema está Resuelto

### **1. Verificar políticas RLS:**

```sql
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'subscriptions';
```

**Debe aparecer:**
- `Users can insert their own subscriptions` (INSERT)
- `Users can view their own subscriptions` (SELECT)
- `Users can update their own subscriptions` (UPDATE)

### **2. Verificar permisos de función:**

```sql
SELECT 
    proname,
    proacl
FROM pg_proc
WHERE proname = 'is_superadmin';
```

### **3. Probar registro nuevo:**

1. Intenta registrar un usuario nuevo
2. Verifica en la consola que NO aparezca el error
3. Verifica en Supabase que se creó la suscripción:

```sql
SELECT * FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 📋 Resumen

| Problema | Causa | Solución |
|----------|-------|----------|
| `permission denied for function is_superadmin` | Usuario no tiene permisos para ejecutar función en trigger | Ejecutar SQL de fix que otorga permisos |
| No se crea suscripción | Falta política RLS de INSERT | El SQL de fix crea la política |
| Error bloquea registro | Código no maneja el error gracefully | Modificar código para no bloquear |

---

## ✅ Checklist

- [ ] Ejecuté el SQL de fix (`20251202_fix_subscription_insert_permissions.sql`)
- [ ] Verifiqué que las políticas RLS están activas
- [ ] Verifiqué permisos de `is_superadmin`
- [ ] Probé registrar un usuario nuevo
- [ ] Verifiqué que se creó la suscripción en Supabase
- [ ] El error ya no aparece en la consola

---

## 🆘 Si el Error Persiste

1. **Verifica que ejecutaste el SQL completo** (no solo una parte)
2. **Verifica que la tabla `subscriptions` existe:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'subscriptions';
   ```
3. **Verifica que no hay triggers conflictivos:**
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname LIKE '%subscription%';
   ```
4. **Comparte el error completo** (incluyendo stack trace) para revisarlo

---

¿Ejecutaste el SQL de fix? Si sí y aún falla, comparte el error completo. 🚀

