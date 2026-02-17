# 🔍 Guía: Dónde Verificar las Invitaciones

## 📊 Tablas donde deberían aparecer los registros

### 1. **Tabla `team_invitations`** (Principal)

Esta es la tabla principal donde se guardan todas las invitaciones.

**Estructura:**
- `id` - UUID de la invitación
- `team_id` - ID del equipo
- `email` - Correo del invitado
- `role` - Rol asignado ('advisor', 'manager', etc.)
- `status` - Estado: 'pending', 'sent', 'accepted', 'failed', 'expired'
- `invited_by` - ID del usuario que envió la invitación
- `created_at` - Fecha de creación
- `expires_at` - Fecha de expiración (7 días)
- `accepted_at` - Fecha de aceptación (null hasta aceptar)

**Consulta para ver invitaciones:**
```sql
SELECT 
    ti.id,
    ti.email,
    ti.role,
    ti.status,
    ti.created_at,
    ti.expires_at,
    ti.invited_by,
    t.name as team_name,
    p.email as invited_by_email
FROM public.team_invitations ti
LEFT JOIN public.teams t ON t.id = ti.team_id
LEFT JOIN auth.users u ON u.id = ti.invited_by
LEFT JOIN public.profiles p ON p.id = u.id
WHERE ti.team_id = 'TU_TEAM_ID'  -- Reemplaza con tu team_id
ORDER BY ti.created_at DESC;
```

**Estados posibles:**
- `pending` - Invitación creada pero correo no enviado aún
- `sent` - Correo enviado exitosamente
- `failed` - Error al enviar correo
- `accepted` - Usuario aceptó la invitación y se registró
- `expired` - Invitación expiró (después de 7 días)

### 2. **Tabla `auth.users`** (Solo si el usuario ya existe)

Si el correo ya tiene cuenta en Supabase, el usuario aparecerá aquí.

**Consulta:**
```sql
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    u.raw_user_meta_data
FROM auth.users u
WHERE u.email = 'correo@ejemplo.com';
```

### 3. **Tabla `team_members`** (Solo después de aceptar)

El usuario aparecerá aquí cuando:
- Ya existía y se agregó directamente al equipo, O
- Se registró y aceptó la invitación

**Consulta:**
```sql
SELECT 
    tm.user_id,
    tm.role,
    tm.permissions,
    p.email,
    p.full_name
FROM public.team_members tm
JOIN public.profiles p ON p.id = tm.user_id
WHERE tm.team_id = 'TU_TEAM_ID'
ORDER BY tm.role, p.full_name;
```

## 🔍 Pasos para Diagnosticar

### Paso 1: Verificar si se creó el registro en `team_invitations`

```sql
-- Ver todas las invitaciones recientes
SELECT * FROM public.team_invitations 
ORDER BY created_at DESC 
LIMIT 10;
```

**Si NO hay registros:**
- La función `invite-team-member` no se ejecutó
- Revisa los logs del navegador para ver si hay errores
- Verifica que el botón "Invitar" esté conectado correctamente

### Paso 2: Verificar logs de la Edge Function

1. Ve a **Supabase Dashboard** → **Edge Functions** → **invite-team-member**
2. Haz clic en **Logs**
3. Busca mensajes que empiecen con `[Invite]`
4. Verifica si hay errores

**Logs esperados:**
```
[Invite] Función invocada - Método: POST
[Invite] Body recibido (raw): {"teamId":"...","inviteeEmail":"...","role":"advisor"}
[Invite] Datos recibidos: {teamId: "...", inviteeEmail: "...", role: "advisor"}
[Invite] Enviando invitación a: correo@ejemplo.com
[Invite] Correo enviado exitosamente a: correo@ejemplo.com
```

### Paso 3: Verificar en el navegador

Abre la consola del navegador (F12) y busca:

**Logs esperados cuando haces clic en "Invitar":**
```
[Settings] Botón de invitar CLICKEADO
[Settings] handleInviteMember llamado
[Settings] ===== INICIANDO INVITACIÓN =====
[Settings] Llamando a invokeFunction...
[Settings] Respuesta completa de invokeFunction: {...}
```

**Si NO ves estos logs:**
- El botón no está conectado al listener
- El formulario padre está capturando el evento
- Hay un error JavaScript que está deteniendo la ejecución

## 🐛 Problemas Comunes

### Problema 1: No se crea registro en `team_invitations`

**Causas posibles:**
1. La función no se ejecuta (revisa logs del navegador)
2. Error de permisos en la Edge Function
3. Error al insertar en la base de datos

**Solución:**
- Revisa los logs de la Edge Function en Supabase
- Verifica que el usuario tenga rol `admin` en `team_members`
- Verifica que `team_id` sea válido

### Problema 2: Se crea registro pero no se envía correo

**Causas posibles:**
1. SMTP no configurado en Supabase
2. Error al llamar a `inviteUserByEmail`
3. Correo en carpeta de spam

**Solución:**
- Revisa los logs de la Edge Function (busca errores de SMTP)
- Verifica configuración de SMTP en Supabase Dashboard
- Revisa la carpeta de spam del destinatario

### Problema 3: Error 403 al consultar `team_invitations`

**Causa:**
- Políticas RLS no configuradas o incorrectas

**Solución:**
- Ejecuta la migración SQL `20251219_add_team_invitations_rls.sql`
- Verifica que las políticas estén activas:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'team_invitations';
  ```

## ✅ Checklist de Verificación

- [ ] Registro creado en `team_invitations` con `status = 'pending'` o `'sent'`
- [ ] Logs en la Edge Function muestran que se ejecutó
- [ ] Logs en el navegador muestran que se llamó `handleInviteMember`
- [ ] No hay errores 403 al consultar `team_invitations`
- [ ] Correo enviado (verificar logs de Auth en Supabase)
- [ ] Invitación aparece en la lista de "Miembros del Equipo" con estado "Pendiente"

## 📝 Notas

- El registro en `team_invitations` se crea **ANTES** de intentar enviar el correo
- Si falla el envío del correo, el registro se mantiene con `status = 'failed'`
- El registro permanece hasta que:
  - El usuario acepta la invitación (status → 'accepted')
  - La invitación expira (después de 7 días)
  - Se elimina manualmente

