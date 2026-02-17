# 🔧 Fix: Funciones de Team Info Faltantes

## ❌ Problema

Al iniciar sesión como super admin, se producen estos errores:

1. **Error 400 en refresh token** - Problema con el token de sesión
2. **Error 404 en `get_user_team_info`** - La función no existe en la base de datos

```
POST /rest/v1/rpc/get_user_team_info 404 (Not Found)
Could not find the function public.get_user_team_info without parameters
```

---

## ✅ Solución

### Paso 1: Ejecutar SQL en Supabase

**Archivo:** `supabase/schema/20251125_add_team_info_functions.sql`

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia y pega todo el contenido del archivo
3. Ejecuta (RUN)

**Qué crea:**
- ✅ `get_user_team_info()` - Sin parámetros, usa `auth.uid()`
- ✅ `get_user_team_info_with_permissions(p_user_id uuid)` - Con parámetro
- ✅ `create_business_team_for_user(p_user_id uuid)` - Crea equipo business

---

## 🔍 Verificación

Después de ejecutar el SQL, verifica que las funciones existen:

```sql
-- Verificar funciones
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_team_info',
    'get_user_team_info_with_permissions',
    'create_business_team_for_user'
  );
```

Debe mostrar las 3 funciones.

---

## 🐛 Sobre el Error de Refresh Token

El error 400 en el refresh token puede ser porque:

1. **El token está expirado** - Cierra sesión y vuelve a iniciar
2. **El token está corrupto** - Limpia el localStorage:
   ```javascript
   localStorage.clear();
   ```
3. **Problema de configuración** - Verifica que las URLs de Supabase sean correctas

**Solución rápida:**
- Cierra sesión completamente
- Limpia cookies y localStorage
- Vuelve a iniciar sesión

---

## 📝 Cambios en el Código

Ya actualicé:
- ✅ `auth.js` - Maneja correctamente `user_role` vs `role`
- ✅ `company-admin.js` - Normaliza el campo `role` para compatibilidad

---

## ✅ Checklist

- [ ] Ejecutar SQL en Supabase
- [ ] Verificar que las funciones existen
- [ ] Cerrar sesión y limpiar localStorage
- [ ] Volver a iniciar sesión
- [ ] Verificar que no hay errores en consola

---

**¡Listo!** Las funciones deberían estar disponibles y el error 404 debería desaparecer. 🎉

