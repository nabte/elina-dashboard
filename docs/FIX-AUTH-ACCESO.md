# Fix: Problema de Acceso en Autenticación

## Problema Identificado

Algunos usuarios no podían acceder al sistema por las siguientes razones:

1. **No tenían suscripción creada**: El trigger `handle_new_user()` solo creaba el perfil, pero NO la suscripción
2. **Dependencia de n8n**: La creación de suscripción se delegaba a n8n, pero si n8n fallaba, el usuario quedaba sin suscripción
3. **Bloqueo automático**: La función `check_account_access` bloquea usuarios sin suscripción
4. **Sin validación en login**: El código de auth.js no verificaba `check_account_access` durante el login

## Solución Implementada

### 1. Migración SQL (Base de Datos)

**Archivo**: `supabase/migrations/20260220_fix_auth_create_subscription.sql`

Esta migración:
- ✅ Actualiza el trigger `handle_new_user()` para crear AUTOMÁTICAMENTE una suscripción de prueba (15 días)
- ✅ Arregla usuarios existentes que no tienen suscripción
- ✅ Verifica que todos los usuarios tengan suscripción

### 2. Mejoras en el Frontend

**Archivo**: `src/core/auth.js`

Cambios realizados:
- ✅ `handleLogin()`: Ahora verifica `check_account_access` ANTES de permitir el acceso
- ✅ `handleRegister()`: Simplificado, la creación de suscripción es automática por el trigger
- ✅ Mejores mensajes de error para problemas de suscripción

## Cómo Aplicar la Migración

### Opción 1: Dashboard de Supabase (Recomendado)

1. Ve a [Supabase SQL Editor](https://supabase.com/dashboard/project/mytvwfbijlgbihlegmfg/sql/new)
2. Abre el archivo `supabase/migrations/20260220_fix_auth_create_subscription.sql`
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Click en **Run** (botón verde)
6. Verifica en los logs que diga:
   - "Created subscription for user: ..." (para cada usuario sin suscripción)
   - "Fixed N users without subscription"
   - "All users now have subscriptions"

### Opción 2: CLI (Requiere Service Role Key)

```bash
# 1. Configura la Service Role Key
set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# 2. Ejecuta la migración
node apply-migrations-simple.cjs supabase/migrations/20260220_fix_auth_create_subscription.sql
```

## Verificación

Después de aplicar la migración, verifica:

1. **Usuarios sin suscripción**:
```sql
SELECT p.email, p.full_name
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = p.id
)
AND p.role != 'superadmin';
```
Debería retornar 0 filas.

2. **Trigger actualizado**:
```sql
SELECT tgname, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';
```
Debería mostrar el trigger activo.

3. **Probar registro nuevo**:
   - Registra un nuevo usuario de prueba
   - Verifica que se cree automáticamente su suscripción:
```sql
SELECT * FROM subscriptions WHERE user_id = 'user_id_aqui';
```

## Flujo Actualizado

### Registro
1. Usuario se registra en `/auth.html`
2. Supabase Auth crea el usuario en `auth.users`
3. **Trigger automático** crea:
   - Perfil en `profiles`
   - Suscripción `free_trial` (15 días) en `subscriptions`
4. n8n crea la instancia de WhatsApp (opcional, no bloqueante)

### Login
1. Usuario ingresa credenciales
2. Supabase Auth valida email/password
3. **Verificación `check_account_access`**:
   - ✅ Si tiene suscripción activa → Permitir acceso
   - ❌ Si trial expirado → Bloquear con mensaje
   - ❌ Si sin suscripción → Crear una automática (fallback)
4. Redirección a dashboard

## Beneficios

- ✅ Usuarios siempre tienen suscripción al registrarse
- ✅ No depende de servicios externos (n8n) para acceso básico
- ✅ Mensajes de error claros y útiles
- ✅ Fallback automático si algo falla
- ✅ Usuarios existentes arreglados automáticamente

## Rollback (Si es necesario)

Si necesitas revertir los cambios:

```sql
-- Restaurar trigger anterior (sin creación de suscripción)
-- Ejecutar el contenido de: supabase/schema/20251112_fix_profile_bootstrap.sql
```

## Notas Importantes

1. **Superadmins**: No se les crea suscripción (intencional)
2. **Trial de 15 días**: Configurado en la constante del trigger
3. **Usuarios de equipo**: Heredan la suscripción del owner (manejado por `check_account_access`)
4. **Google Login**: También funciona con este flujo (el trigger se dispara igual)

## Contacto

Si tienes problemas aplicando esta migración, contacta al equipo de desarrollo.
