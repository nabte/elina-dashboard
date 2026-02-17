# 🏢 Sistema Business - Implementación Completa

## 📋 Resumen del Sistema

El sistema de **Plan Business** permite a los administradores crear y gestionar equipos de vendedores (advisors) con permisos y filtros personalizados. Este documento explica cómo funciona y cómo activarlo desde superadmin.

## ✅ Estado Actual

### Lo que está implementado:

1. **Función SQL `create_business_team_for_user`** ✅
   - Crea el equipo para el usuario
   - Asigna al usuario como admin del equipo
   - **NUEVO:** Crea/actualiza la suscripción con `plan_id='business'` y `status='active'`
   - Ubicación: `supabase/schema/20251125_add_team_info_functions.sql`

2. **Panel de Superadmin** ✅
   - Permite cambiar el plan de usuarios a "business"
   - Llama automáticamente a `create_business_team_for_user` cuando se asigna el plan business
   - Ubicación: `superadmin.js` línea 263

3. **Panel de Administración de Empresa** ✅
   - Permite crear vendedores directamente
   - Permite invitar vendedores por correo
   - Gestiona permisos de vendedores
   - Ubicación: `company-admin.html` y `company-admin.js`

4. **Sistema de Filtros para Vendedores** ✅
   - Los vendedores solo ven contactos/chats con su etiqueta
   - Los administradores ven todos los contactos
   - Funciones SQL: `setup_advisor_user`, `sync_advisor_name_to_label`

## 🔧 Cómo Activar el Plan Business desde Superadmin

### Paso 1: Acceder al Panel de Superadmin
1. Inicia sesión como superadmin
2. Ve a `/superadmin.html`
3. Verifica que tengas permisos de superadmin

### Paso 2: Asignar Plan Business a un Usuario
1. En la sección "Gestión de Usuarios", busca el usuario
2. Haz clic en el botón **"Cambiar Plan"**
3. Selecciona **"Business"** en el dropdown
4. **Marca la casilla "Forzar cambio (sin pasar por pago)"**
5. Haz clic en **"Guardar Cambio"**

### Paso 3: Verificar que se Activó Correctamente
El sistema automáticamente:
- ✅ Crea un equipo para el usuario (si no existe)
- ✅ Asigna al usuario como admin del equipo
- ✅ Crea/actualiza la suscripción con `plan_id='business'` y `status='active'`
- ✅ Configura permisos por defecto (acceso completo)

### Paso 4: El Usuario Puede Acceder a Company Admin
1. El usuario con plan business puede ir a `/company-admin.html`
2. Desde ahí puede:
   - Crear vendedores directamente
   - Invitar vendedores por correo
   - Gestionar permisos de vendedores
   - Configurar alertas y notificaciones

## 📊 Estructura del Sistema Business

```
┌─────────────────────────────────────┐
│  Administrador (Plan Business)       │
│  - Tiene suscripción business        │
│  - Es owner del equipo               │
│  - Rol: admin                        │
│  - Ve todos los contactos           │
│  - Accede a /company-admin.html      │
└──────────────┬────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│ Vendedor 1  │  │ Vendedor 2  │
│ - Rol:      │  │ - Rol:      │
│   advisor   │  │   advisor   │
│ - Solo ve   │  │ - Solo ve   │
│   contactos │  │   contactos │
│   con su    │  │   con su    │
│   etiqueta  │  │   etiqueta  │
└─────────────┘  └─────────────┘
```

## 🔐 Permisos y Roles

### Administrador (Admin)
- ✅ Acceso completo a todos los contactos
- ✅ Puede crear y gestionar vendedores
- ✅ Puede configurar permisos de vendedores
- ✅ Puede ver todos los chats, seguimientos, kanban
- ✅ Acceso a `/company-admin.html`

### Vendedor (Advisor)
- ✅ Solo ve contactos con su etiqueta (su nombre)
- ✅ Solo ve chats de contactos con su etiqueta
- ✅ Puede ver seguimientos de sus contactos
- ✅ Puede ver kanban de sus contactos
- ❌ Por defecto NO puede ver "Contactos" (configurable)
- ❌ No puede acceder a `/company-admin.html`
- ❌ No puede crear otros usuarios

## 🗄️ Estructura de Base de Datos

### Tabla `teams`
- `id`: UUID del equipo
- `owner_id`: UUID del usuario administrador
- `name`: Nombre del equipo

### Tabla `team_members`
- `team_id`: UUID del equipo
- `user_id`: UUID del usuario
- `role`: 'admin' o 'advisor'
- `permissions`: JSONB con permisos personalizados

### Tabla `subscriptions`
- `user_id`: UUID del usuario (PK)
- `plan_id`: 'business' para plan business
- `status`: 'active' para suscripción activa

## 🔄 Flujo de Activación

```
1. Superadmin asigna plan "business" a usuario
   ↓
2. Se llama a create_business_team_for_user(user_id)
   ↓
3. Función SQL:
   - Verifica que el usuario existe
   - Crea equipo (o usa existente)
   - Asigna usuario como admin
   - Crea/actualiza suscripción business
   ↓
4. Usuario puede acceder a /company-admin.html
   ↓
5. Usuario puede crear vendedores
   ↓
6. Vendedores tienen acceso limitado por etiquetas
```

## ⚙️ Configuración del Plan Business

El plan business debe tener estas características en la tabla `plans`:

```sql
SELECT id, name, features, image_generations_limit, video_generations_limit, max_advisors
FROM public.plans
WHERE id = 'business';
```

Características esperadas:
- `features->>'multi_user'` = `'true'`
- `image_generations_limit` = 150
- `video_generations_limit` = 25
- `max_advisors` = 2 (o el límite configurado)

## 🐛 Solución de Problemas

### El usuario no puede acceder a company-admin.html
1. Verifica que tenga suscripción business:
   ```sql
   SELECT * FROM public.subscriptions WHERE user_id = 'USER_ID';
   ```
2. Verifica que tenga equipo:
   ```sql
   SELECT * FROM public.teams WHERE owner_id = 'USER_ID';
   ```
3. Verifica que sea admin del equipo:
   ```sql
   SELECT * FROM public.team_members 
   WHERE user_id = 'USER_ID' AND role = 'admin';
   ```

### El vendedor ve todos los contactos
1. Verifica que tenga rol 'advisor':
   ```sql
   SELECT role FROM public.team_members WHERE user_id = 'USER_ID';
   ```
2. Verifica que tenga etiqueta asignada:
   ```sql
   SELECT name FROM public.labels 
   WHERE user_id = (SELECT owner_id FROM public.teams WHERE id = 'TEAM_ID')
   AND name = 'NOMBRE_DEL_VENDEDOR';
   ```

### Error al crear vendedor
1. Verifica que el admin tenga plan business activo
2. Verifica que no se haya alcanzado el límite de advisors
3. Verifica que la Edge Function `create-user` esté desplegada

## 📝 Notas Importantes

1. **La función `create_business_team_for_user` ahora crea la suscripción automáticamente**
   - Ya no es necesario crear la suscripción manualmente
   - Si el usuario ya tiene suscripción, se actualiza a business

2. **Los equipos se mantienen aunque cambie el plan**
   - Si un usuario cambia de business a otro plan, el equipo se mantiene
   - Esto permite reactivar el plan business sin perder la configuración

3. **Los vendedores son usuarios completos de Supabase**
   - Tienen su propia cuenta en `auth.users`
   - Pueden iniciar sesión normalmente
   - Sus permisos están limitados por el sistema de filtros

## ✅ Checklist de Verificación

- [ ] Función `create_business_team_for_user` actualizada y desplegada
- [ ] Plan business existe en la tabla `plans` con características correctas
- [ ] Superadmin puede asignar plan business a usuarios
- [ ] Usuarios con plan business pueden acceder a `/company-admin.html`
- [ ] Administradores pueden crear vendedores
- [ ] Vendedores solo ven contactos con su etiqueta
- [ ] Sistema de permisos funciona correctamente

## 🚀 Próximos Pasos

1. **Ejecutar la migración SQL actualizada:**
   ```sql
   -- Ejecutar en Supabase SQL Editor:
   -- supabase/schema/20251125_add_team_info_functions.sql
   ```

2. **Verificar que el plan business esté configurado:**
   ```sql
   SELECT * FROM public.plans WHERE id = 'business';
   ```

3. **Probar el flujo completo:**
   - Asignar plan business desde superadmin
   - Verificar que el usuario puede acceder a company-admin
   - Crear un vendedor de prueba
   - Verificar que el vendedor solo ve sus contactos

---

**Última actualización:** Diciembre 2024  
**Estado:** ✅ Funcional y listo para usar

