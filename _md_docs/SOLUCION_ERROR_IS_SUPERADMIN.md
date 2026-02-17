# 🔧 Solución: Error "permission denied for function is_superadmin"

## ❌ Error

**Error:** `permission denied for function is_superadmin`

**Código:** `42501`

**Causa:** La tabla `subscriptions` probablemente tiene un trigger o función que llama a `is_superadmin()`, pero el usuario autenticado no tiene permisos para ejecutarla.

---

## ✅ Solución 1: Dar Permisos a la Función (Rápido)

Ejecuta este SQL en Supabase:

**Archivo:** `supabase/schema/20251202_fix_is_superadmin_permissions.sql`

Este SQL:
- ✅ Verifica que la función `is_superadmin` existe
- ✅ Le da permisos a `authenticated` para ejecutarla
- ✅ Crea la función si no existe

---

## ✅ Solución 2: Crear Suscripción desde el Trigger (Mejor)

En lugar de crear la suscripción desde el frontend, podemos hacer que el trigger `handle_new_user` la cree automáticamente.

### **Modificar la función handle_new_user:**

Agrega esto al final de la función `handle_new_user` (antes del `RETURN NEW;`):

```sql
-- Crear suscripción de prueba automáticamente
INSERT INTO public.subscriptions (user_id, plan_type, trial_ends_at, status)
VALUES (
  NEW.id,
  'trial',
  now_utc + INTERVAL '7 days',
  'active'
)
ON CONFLICT (user_id) DO NOTHING;
```

**Ventaja:** El trigger tiene permisos de `SECURITY DEFINER`, así que puede crear la suscripción sin problemas de permisos.

---

## 🔍 Verificar si Hay Trigger en Subscriptions

Ejecuta esto para ver si hay un trigger en `subscriptions`:

```sql
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'public.subscriptions'::regclass;
```

Si hay un trigger, ese puede estar llamando a `is_superadmin` y causando el error.

---

## ✅ Solución Recomendada: Crear Suscripción en el Trigger

He creado un SQL que modifica el trigger para que también cree la suscripción:

**Archivo:** `supabase/schema/20251202_add_subscription_to_trigger.sql`

Este SQL:
- ✅ Modifica `handle_new_user` para crear la suscripción automáticamente
- ✅ El trigger tiene permisos suficientes (SECURITY DEFINER)
- ✅ No hay problemas de permisos

---

## 📋 Pasos Recomendados

### **Opción A: Solo Dar Permisos (Rápido)**

1. Ejecuta: `20251202_fix_is_superadmin_permissions.sql`
2. Prueba registrar un usuario nuevo
3. Verifica que no aparece el error

### **Opción B: Crear Suscripción en el Trigger (Mejor)**

1. Ejecuta: `20251202_add_subscription_to_trigger.sql`
2. Esto hace que el trigger cree la suscripción automáticamente
3. Ya no necesitas crear la suscripción desde el frontend

---

## 🧪 Verificar que Funcionó

Después de aplicar la solución:

1. **Registra un usuario nuevo**
2. **Verifica que no aparece el error en la consola**
3. **Verifica que se creó la suscripción:**

```sql
SELECT user_id, plan_type, trial_ends_at, status 
FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## ✅ Checklist

- [ ] Ejecuté el SQL para dar permisos a `is_superadmin`
- [ ] (Opcional) Ejecuté el SQL para crear suscripción en el trigger
- [ ] Probé registrar un usuario nuevo
- [ ] Verifiqué que no aparece el error
- [ ] Verifiqué que se creó la suscripción

---

¿Ejecutaste el SQL para dar permisos? Eso debería solucionar el error. 🚀

