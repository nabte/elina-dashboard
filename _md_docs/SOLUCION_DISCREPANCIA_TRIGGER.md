# 🔍 Solución: Discrepancia entre UI y Base de Datos

## ❓ Problema

- **UI de Supabase muestra:** `ENABLED` ✅ (check verde)
- **SQL muestra:** `Disabled ❌`

Esto indica que hay una **desincronización** entre la UI y el estado real en la base de datos.

---

## 🔍 Diagnóstico

El código `tgenabled = 'O'` significa **"Disabled (Origin)"**, lo que indica que el trigger está **deshabilitado** en la base de datos, aunque la UI pueda mostrar lo contrario.

---

## ✅ Solución: Habilitar desde Dashboard

Como la UI muestra que está "ENABLED" pero la base de datos dice "Disabled", necesitas:

### **Paso 1: Deshabilitar y Re-habilitar desde Dashboard**

1. Ve a **Supabase Dashboard**
2. **Database** → **Triggers**
3. Busca `on_auth_user_created` en la tabla `users` (auth schema)
4. **Deshabilita** el trigger (click en Disable)
5. **Espera 2-3 segundos**
6. **Habilita** el trigger (click en Enable)
7. **Espera 2-3 segundos**

Esto fuerza una sincronización entre la UI y la base de datos.

---

### **Paso 2: Verificar que Funcionó**

Ejecuta este SQL después de habilitar desde Dashboard:

```sql
SELECT 
    tgname as trigger_name,
    CASE tgenabled
        WHEN 'A' THEN 'Enabled ✅'
        WHEN 'O' THEN 'Disabled ❌'
        ELSE 'Unknown: ' || tgenabled
    END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

**Debería mostrar:** `status = 'Enabled ✅'`

---

## 🧪 Probar que Funciona

Después de habilitar correctamente:

1. **Registra un usuario nuevo** desde la app
2. **Verifica que el perfil se creó automáticamente:**

```sql
SELECT 
    id, 
    full_name, 
    email, 
    evolution_instance_name,
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 1;
```

Si el perfil se creó, el trigger está funcionando correctamente.

---

## 🔧 Si No Puedes Habilitar desde Dashboard

Si el botón Enable/Disable no funciona en el Dashboard, puedes intentar:

### **Opción A: Usar Service Role Key**

Si tienes acceso a la **Service Role Key**, ejecuta este SQL usando esa key:

```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

### **Opción B: Ejecutar el SQL Original**

Ejecuta el SQL que crea el trigger originalmente:

**Archivo:** `supabase/schema/20251112_fix_profile_bootstrap.sql`

Este SQL recrea el trigger con los permisos correctos.

---

## 📋 Códigos de Estado

| Código | Significado | Estado |
|--------|------------|--------|
| `'A'` | Always enabled | ✅ Habilitado |
| `'O'` | Origin (disabled) | ❌ Deshabilitado |
| `'D'` | Disabled (replica) | ❌ Deshabilitado (replica) |
| `'R'` | Disabled (always) | ❌ Siempre deshabilitado |

Tu trigger muestra `'O'`, que significa **Disabled**.

---

## ✅ Checklist

- [ ] Verifiqué el estado con el SQL de diagnóstico
- [ ] Deshabilité y re-habilité el trigger desde Dashboard
- [ ] Verifiqué que ahora muestra `Enabled ✅`
- [ ] Probé registrar un usuario nuevo
- [ ] Verifiqué que el perfil se creó automáticamente

---

## 🆘 Si Sigue Deshabilitado

Si después de intentar habilitar desde Dashboard sigue mostrando "Disabled":

1. **Ejecuta el SQL original** que crea el trigger:
   - `supabase/schema/20251112_fix_profile_bootstrap.sql`
   
2. **O contacta a Supabase Support** para que lo habiliten con permisos de superusuario

---

¿Intentaste deshabilitar y re-habilitar desde el Dashboard? Eso debería sincronizar el estado. 🚀

