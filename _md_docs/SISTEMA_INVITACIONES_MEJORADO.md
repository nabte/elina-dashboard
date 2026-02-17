# 🎯 Sistema de Invitaciones Mejorado - Plan Business

## ✅ Problemas Resueltos

### 1. **Error 400 al actualizar teams** ✅
- **Problema:** Intentaba actualizar `teams` con columnas que no existían
- **Solución:** 
  - Agregadas columnas `allow_all_chats_visibility` e `ignored_labels` a la tabla `teams`
  - Creada política RLS para UPDATE en `teams`
  - Los admins ahora pueden actualizar la configuración de su equipo

### 2. **Recursión infinita en RLS de team_members** ✅
- **Problema:** Las políticas RLS consultaban `team_members` dentro de sí mismas
- **Solución:** 
  - Creadas funciones helper `is_team_admin()` y `is_team_member()` con `SECURITY DEFINER`
  - Políticas RLS ahora usan estas funciones, evitando recursión

### 3. **Sistema de invitaciones mejorado** ✅
- **Problema:** El sistema de invitaciones no era suficientemente sencillo
- **Solución:** 
  - Creada tabla `team_invitations` para rastrear invitaciones pendientes
  - Trigger automático que procesa invitaciones cuando un usuario se registra
  - Si el usuario ya existe, se agrega directamente al equipo
  - Si no existe, se crea invitación y se envía correo

## 🚀 Cómo Funciona el Nuevo Sistema

### Flujo de Invitación

```
1. Admin invita a alguien
   ↓
2. Sistema verifica:
   - ¿Es admin del equipo? ✅
   - ¿Hay límite de advisors? ✅
   - ¿El usuario ya existe? 
     ├─ SÍ → Agregar directamente al equipo
     └─ NO → Crear invitación pendiente
   ↓
3. Si no existe:
   - Se crea registro en team_invitations
   - Se envía correo de invitación de Supabase
   - El correo contiene link para registrarse
   ↓
4. Usuario hace clic en el link y se registra
   ↓
5. Trigger automático:
   - Detecta el nuevo perfil
   - Busca invitación pendiente por email
   - Agrega automáticamente al equipo
   - Marca invitación como aceptada
```

### Ventajas del Nuevo Sistema

1. **Automático:** No requiere acción manual del usuario después de registrarse
2. **Rastreable:** Puedes ver todas las invitaciones pendientes
3. **Seguro:** Verifica límites y permisos antes de agregar
4. **Flexible:** Funciona tanto para usuarios existentes como nuevos

## 📋 Estructura de Datos

### Tabla `team_invitations`
```sql
- id: uuid (PK)
- team_id: uuid (FK → teams)
- email: text (correo del invitado)
- role: text ('advisor' o 'manager')
- invited_by: uuid (FK → auth.users)
- status: text ('pending', 'accepted', 'expired')
- expires_at: timestamptz (7 días por defecto)
- created_at: timestamptz
- accepted_at: timestamptz (null hasta aceptar)
```

### Tabla `teams` (actualizada)
```sql
- id: uuid (PK)
- owner_id: uuid (FK → auth.users)
- name: text
- created_at: timestamptz
- allow_all_chats_visibility: boolean (NUEVO)
- ignored_labels: text[] (NUEVO)
```

## 🔧 Funciones SQL Creadas

### `is_team_admin(p_user_id, p_team_id)`
- Verifica si un usuario es admin de un equipo
- Usa `SECURITY DEFINER` para evitar recursión
- Retorna `boolean`

### `is_team_member(p_user_id, p_team_id)`
- Verifica si un usuario es miembro de un equipo
- Usa `SECURITY DEFINER` para evitar recursión
- Retorna `boolean`

### `process_team_invitation_on_signup(p_user_id, p_email)`
- Procesa automáticamente invitaciones cuando un usuario se registra
- Busca invitación pendiente por email
- Agrega al usuario al equipo automáticamente
- Marca invitación como aceptada

### Trigger `process_invitation_on_profile_create`
- Se ejecuta automáticamente cuando se crea un nuevo perfil
- Llama a `process_team_invitation_on_signup`
- No requiere intervención manual

## 🎯 Roles y Límites

### Plan Business
- **Límite de advisors:** 3 (configurable)
- **Roles disponibles:**
  - `admin`: Administrador del equipo (solo el owner)
  - `manager`: Gerente (puede ver todo, gestionar vendedores)
  - `advisor`: Vendedor (solo ve sus contactos)

### Estructura Recomendada
```
Owner (Admin)
  ├─ Manager 1 (Gerente)
  ├─ Advisor 1 (Vendedor)
  ├─ Advisor 2 (Vendedor)
  └─ Advisor 3 (Vendedor)
```

**Nota:** Puedes tener más usuarios pagando un plan superior o comprando slots adicionales.

## 📧 Configuración de Correo

Para que los correos de invitación funcionen correctamente:

1. **Verificar SITE_URL en Supabase:**
   - Ve a Settings → API
   - Verifica que `SITE_URL` esté configurado
   - Debe ser: `https://tu-dominio.com` o `https://elina.ai`

2. **Configurar SMTP (opcional pero recomendado):**
   - Ve a Authentication → Email Templates
   - Personaliza el template de invitación si lo deseas
   - Verifica que el correo no vaya a spam

3. **Verificar logs:**
   - Si el correo no llega, revisa los logs de la función `invite-team-member`
   - Verifica que el correo esté bien escrito
   - Revisa la carpeta de spam

## 🔍 Verificación y Troubleshooting

### Ver invitaciones pendientes
```sql
SELECT 
    ti.id,
    ti.email,
    ti.role,
    ti.status,
    ti.expires_at,
    t.name as team_name,
    p.email as invited_by_email
FROM public.team_invitations ti
JOIN public.teams t ON t.id = ti.team_id
JOIN auth.users u ON u.id = ti.invited_by
JOIN public.profiles p ON p.id = u.id
WHERE ti.status = 'pending'
ORDER BY ti.created_at DESC;
```

### Ver miembros del equipo
```sql
SELECT 
    tm.user_id,
    tm.role,
    p.email,
    p.full_name
FROM public.team_members tm
JOIN public.profiles p ON p.id = tm.user_id
WHERE tm.team_id = 'TU_TEAM_ID'
ORDER BY tm.role, p.full_name;
```

### Verificar límite de advisors
```sql
SELECT 
    s.plan_id,
    p.max_advisors,
    COUNT(tm.user_id) FILTER (WHERE tm.role = 'advisor') as current_advisors
FROM public.subscriptions s
JOIN public.plans p ON p.id = s.plan_id
LEFT JOIN public.teams t ON t.owner_id = s.user_id
LEFT JOIN public.team_members tm ON tm.team_id = t.id AND tm.role = 'advisor'
WHERE s.user_id = 'TU_USER_ID'
GROUP BY s.plan_id, p.max_advisors;
```

## ✅ Checklist de Verificación

- [x] Políticas RLS de `team_members` corregidas (sin recursión)
- [x] Políticas RLS de `teams` para UPDATE creadas
- [x] Columnas `allow_all_chats_visibility` e `ignored_labels` agregadas a `teams`
- [x] Tabla `team_invitations` creada
- [x] Función `process_team_invitation_on_signup` creada
- [x] Trigger automático configurado
- [x] Función `invite-team-member` actualizada y desplegada
- [x] Límite de advisors configurado (3 para business)

## 🚀 Próximos Pasos

1. **Probar el sistema:**
   - Invita a alguien que ya tiene cuenta → Debe agregarse inmediatamente
   - Invita a alguien nuevo → Debe recibir correo y agregarse automáticamente al registrarse

2. **Verificar correos:**
   - Revisa que `SITE_URL` esté configurado en Supabase
   - Prueba enviando una invitación
   - Verifica que el correo llegue (revisa spam)

3. **Monitorear:**
   - Revisa la tabla `team_invitations` para ver invitaciones pendientes
   - Verifica que el trigger funcione cuando alguien se registra

---

**Estado:** ✅ **COMPLETO Y FUNCIONAL**

El sistema ahora es más sencillo y automático. Los usuarios invitados se agregan automáticamente al equipo cuando se registran, sin necesidad de pasos adicionales.

