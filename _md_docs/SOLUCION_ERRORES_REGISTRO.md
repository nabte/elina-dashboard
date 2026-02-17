# 🔧 Solución de Errores de Registro

## ❌ Error: "permission denied for function is_superadmin"

### **Problema:**
Al registrar un usuario nuevo, el código intenta crear una suscripción de prueba en la tabla `subscriptions`, pero falla por permisos.

### **Causa:**
La tabla `subscriptions` probablemente no tiene una política RLS que permita a usuarios autenticados insertar sus propias suscripciones.

---

## ✅ Solución

### **Paso 1: Ejecutar el SQL de Fix**

Ejecuta este archivo en Supabase SQL Editor:

```sql
-- Archivo: supabase/schema/20251202_fix_subscription_insert_permissions.sql
```

Este script:
1. ✅ Crea la tabla `subscriptions` si no existe
2. ✅ Agrega política RLS para que usuarios puedan insertar sus propias suscripciones
3. ✅ Verifica permisos en la función `is_superadmin`

---

### **Paso 2: Verificar que Funcionó**

```sql
-- Verificar que la tabla existe
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'subscriptions';

-- Verificar políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'subscriptions';

-- Probar insertar (reemplaza con tu user_id)
INSERT INTO subscriptions (user_id, plan_type, trial_ends_at)
VALUES (
  'TU_USER_ID_AQUI',
  'trial',
  NOW() + INTERVAL '7 days'
);
```

---

### **Paso 3: Probar Registro Nuevo**

1. Intenta registrar un usuario nuevo
2. Verifica en la consola que no aparezca el error
3. Verifica en Supabase que se creó la suscripción:

```sql
SELECT * FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 📋 Estructura Esperada de `subscriptions`

```sql
CREATE TABLE public.subscriptions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    plan_type text default 'trial',
    trial_ends_at timestamptz,
    status text default 'active',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);
```

---

## 🔍 Si el Error Persiste

### **Verificar que el usuario esté autenticado:**

El código en `auth.js` intenta insertar DESPUÉS de `signUp`, pero el usuario podría no estar completamente autenticado aún.

**Solución alternativa:** Usar un trigger en Supabase para crear la suscripción automáticamente:

```sql
-- Trigger para crear suscripción automáticamente al crear usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, trial_ends_at)
  VALUES (
    NEW.id,
    'trial',
    NOW() + INTERVAL '7 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta al crear un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

Con este trigger, NO necesitas insertar desde el frontend, se hace automáticamente.

---

## ✅ Checklist

- [ ] Ejecutaste el SQL de fix (`20251202_fix_subscription_insert_permissions.sql`)
- [ ] Verificaste que la tabla `subscriptions` existe
- [ ] Verificaste que las políticas RLS están activas
- [ ] Probaste registrar un usuario nuevo
- [ ] Verificaste que se creó la suscripción en Supabase
- [ ] (Opcional) Implementaste el trigger automático

---

¿Funcionó? Si no, comparte el error completo y lo revisamos. 🚀

