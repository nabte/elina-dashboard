# Explicación: Cómo funcionan los Advisors (Vendedores)

## ✅ ¿Cómo se crea un Advisor?

### 1. **SÍ, se crea como un usuario normal en Supabase Auth**

Cuando el administrador crea un vendedor:

```typescript
// Edge Function: create-user/index.ts
await supabaseAdmin.auth.admin.createUser({
  email: "vendedor@empresa.com",
  password: "contraseña123",
  email_confirm: true,
  user_metadata: {
    full_name: "Juan Pérez",
    role: "advisor"
  }
});
```

**Esto crea:**
- ✅ Un usuario completo en `auth.users` (tabla de Supabase Auth)
- ✅ Un perfil en `public.profiles` (automático por trigger)
- ✅ Una entrada en `public.team_members` con rol `advisor`
- ✅ Una etiqueta con su nombre en `public.labels`

### 2. **SÍ, solo accede a sus niveles en su empresa**

El advisor es un usuario normal de Supabase, PERO:

#### Cuando inicia sesión:

1. **El sistema verifica su rol:**
   ```javascript
   // app.js - loadTeamInfo()
   const { data } = await auth.sb.rpc('get_user_team_info_with_permissions', {
     p_user_id: this.user.id
   });
   ```

2. **Si es `advisor`, se aplican filtros:**
   ```javascript
   // contacts.js - getAdvisorLabelFilters()
   if (teamInfo?.user_role !== 'advisor') return null;
   // Si es advisor, retorna las etiquetas permitidas
   ```

3. **Solo ve datos con su etiqueta:**
   - En **Contactos**: Solo ve contactos que tienen su nombre como etiqueta
   - En **Chats**: Solo ve chats de contactos con su etiqueta
   - En **Kanban**: Solo ve tarjetas de contactos con su etiqueta
   - En **Follow-ups**: Solo ve seguimientos de sus contactos

#### Lo que NO puede hacer:

- ❌ Ver contactos de otros vendedores
- ❌ Ver datos del administrador
- ❌ Modificar etiquetas (por defecto, configurable)
- ❌ Ver panel de "Contactos" (por defecto, configurable)
- ❌ Acceder a configuración de empresa
- ❌ Crear otros usuarios

#### Lo que SÍ puede hacer:

- ✅ Iniciar sesión normalmente (es un usuario de Supabase)
- ✅ Ver y chatear con SUS contactos
- ✅ Gestionar seguimientos de SUS contactos
- ✅ Ver Kanban de SUS contactos
- ✅ Cambiar su nombre (y la etiqueta se actualiza automáticamente)

## 🔒 Seguridad y Aislamiento

### RLS (Row Level Security) en Supabase:

Los advisors están protegidos por:

1. **Filtros en el código JavaScript:**
   ```javascript
   // Solo se aplican si es advisor
   const restrictedLabels = getAdvisorLabelFilters('contacts');
   if (restrictedLabels) {
     query = query.overlaps('labels', restrictedLabels);
   }
   ```

2. **Permisos en `team_members.permissions`:**
   ```json
   {
     "chats": true,
     "follow-ups": true,
     "kanban": true,
     "contacts": false,
     "label_filters": {
       "contacts": ["Juan Pérez"],
       "chats": ["Juan Pérez"]
     }
   }
   ```

3. **Verificación en funciones SQL:**
   ```sql
   -- setup_advisor_user verifica que el usuario sea admin
   if not exists(
     select 1 from public.team_members tm
     where tm.team_id = p_team_id
       and tm.user_id = auth.uid()
       and tm.role = 'admin'
   ) then
     raise exception 'No tienes permisos';
   end if;
   ```

## 💰 ¿Cómo comprar más Advisors?

### Opción 1: Límites en el Plan (Recomendado)

Agregar límites al plan business:

```sql
-- En la tabla plans
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS max_advisors INTEGER DEFAULT 3;

-- Actualizar plan business
UPDATE public.plans 
SET max_advisors = 3 
WHERE id = 'business';
```

Luego verificar antes de crear:

```typescript
// En create-user/index.ts
// Verificar límite de advisors
const { data: currentAdvisors } = await supabaseAdmin
  .from("team_members")
  .select("user_id")
  .eq("team_id", teamMember.team_id)
  .eq("role", "advisor");

// Obtener límite del plan
const { data: plan } = await supabaseAdmin
  .from("subscriptions")
  .select("plans!inner(max_advisors)")
  .eq("user_id", teamMember.teams.owner_id)
  .single();

const maxAdvisors = plan?.plans?.max_advisors || 3;

if (currentAdvisors.length >= maxAdvisors) {
  return jsonResponse(
    { error: `Has alcanzado el límite de ${maxAdvisors} advisors. Compra más slots.` },
    403
  );
}
```

### Opción 2: Slots Adicionales (Más Flexible)

Crear tabla para slots adicionales:

```sql
CREATE TABLE IF NOT EXISTS public.advisor_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  stripe_subscription_item_id TEXT,
  UNIQUE(team_id)
);
```

Luego contar: `advisors_incluidos + slots_adicionales`

### Opción 3: Planes Escalonados

```
- Business Basic: 3 advisors incluidos
- Business Pro: 5 advisors incluidos  
- Business Enterprise: 10 advisors incluidos
```

## 📊 Flujo Completo de un Advisor

```
1. Admin crea advisor
   ↓
2. Se crea usuario en auth.users
   ↓
3. Trigger crea perfil en profiles
   ↓
4. setup_advisor_user() crea:
   - Etiqueta con su nombre
   - Entrada en team_members (rol: advisor)
   - Permisos por defecto
   ↓
5. Advisor inicia sesión
   ↓
6. Sistema carga teamInfo
   ↓
7. Detecta que es advisor
   ↓
8. Aplica filtros de etiquetas
   ↓
9. Solo ve sus contactos
```

## ✅ Resumen

**¿Se crea como usuario normal?**
- ✅ SÍ, es un usuario completo en Supabase Auth
- ✅ Puede iniciar sesión normalmente
- ✅ Tiene su propio perfil

**¿Solo accede a sus niveles?**
- ✅ SÍ, solo ve contactos con su etiqueta
- ✅ No puede ver datos de otros vendedores
- ✅ No puede acceder a configuración de empresa
- ✅ Permisos configurables por el admin

**¿Cómo comprar más?**
- Opción 1: Límites en el plan (más simple)
- Opción 2: Slots adicionales (más flexible)
- Opción 3: Planes escalonados (más escalable)

¿Quieres que implemente alguna de estas opciones para comprar más advisors?

