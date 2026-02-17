# 🔧 Pasos para Verificar y Corregir

## ❌ Error que Viste

```
ERROR: 42703: column s.id does not exist
```

**Causa:** La tabla `subscriptions` en tu base de datos real tiene una estructura diferente a la que esperábamos.

---

## ✅ Pasos a Seguir

### **Paso 1: Verificar Estructura Real de la Tabla**

Ejecuta este SQL en Supabase:

**Archivo:** `supabase/schema/20251202_verificar_estructura_subscriptions.sql`

O ejecuta directamente:

```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'subscriptions'
ORDER BY ordinal_position;
```

**Esto te mostrará:**
- Qué columnas tiene la tabla
- Si usa `plan_id` o `plan_type`
- Si tiene columna `id` o solo `user_id` como PK

---

### **Paso 2: Verificar si el Usuario Tiene Suscripción**

Ejecuta este SQL (CORREGIDO):

**Archivo:** `supabase/schema/20251202_verificar_suscripcion_CORREGIDO.sql`

O ejecuta directamente:

```sql
SELECT 
    p.id as user_id,
    p.email,
    CASE 
        WHEN s.user_id IS NOT NULL THEN '✅ Tiene suscripción'
        ELSE '❌ Sin suscripción'
    END as subscription_status,
    s.plan_id,  -- o s.plan_type, según lo que veas en el Paso 1
    s.status
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
WHERE p.id = 'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4';
```

---

### **Paso 3: Corregir el Trigger (Si es Necesario)**

Si el trigger que ejecutaste usa `plan_type` pero tu tabla usa `plan_id`, ejecuta:

**Archivo:** `supabase/schema/20251202_fix_trigger_subscription_plan_id.sql`

Este SQL tiene **2 opciones**:
- **Opción 1:** Si tu tabla usa `plan_id` (descomenta esta)
- **Opción 2:** Si tu tabla usa `plan_type` (descomenta esta)

**IMPORTANTE:** Revisa el resultado del Paso 1 para saber cuál usar.

---

### **Paso 4: Crear Suscripción para Usuario Existente (Si No Tiene)**

Si el usuario existente no tiene suscripción, créala manualmente:

**Si tu tabla usa `plan_id`:**
```sql
INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at)
VALUES (
    'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4',
    'free_trial', -- o el plan_id que uses
    'active',
    NOW() + INTERVAL '7 days'
)
ON CONFLICT (user_id) DO NOTHING;
```

**Si tu tabla usa `plan_type`:**
```sql
INSERT INTO public.subscriptions (user_id, plan_type, status, trial_ends_at)
VALUES (
    'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4',
    'trial',
    'active',
    NOW() + INTERVAL '7 days'
)
ON CONFLICT (user_id) DO NOTHING;
```

---

### **Paso 5: Probar con Usuario Nuevo**

1. Registra un usuario nuevo
2. El trigger debería crear la suscripción automáticamente
3. Verifica que no aparece el error en la consola

---

## 📋 Checklist

- [ ] Ejecuté el SQL para verificar estructura de `subscriptions`
- [ ] Identifiqué si usa `plan_id` o `plan_type`
- [ ] Verifiqué si el usuario existente tiene suscripción
- [ ] (Si es necesario) Corregí el trigger con el SQL correcto
- [ ] (Si no tiene suscripción) Creé la suscripción manualmente
- [ ] Probé registrar un usuario nuevo
- [ ] Verifiqué que no aparece el error

---

## 💡 Resumen

1. **El error del SQL de verificación** es porque la tabla tiene estructura diferente
2. **El trigger que ejecutaste** puede estar usando la columna incorrecta (`plan_type` vs `plan_id`)
3. **Necesitas verificar primero** la estructura real antes de corregir

---

## 🚀 Siguiente Paso

**Ejecuta el Paso 1** y compárteme el resultado. Así sabré exactamente qué estructura tiene tu tabla y te daré el SQL correcto. 🎯

