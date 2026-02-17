# 📋 Lista de Pendientes - Modo Business

## ✅ Lo que está implementado

1. **Función de creación de equipo business**:
   - ✅ `create_business_team_for_user(p_user_id uuid)` - Existe en `supabase/schema/20251125_add_team_info_functions.sql`
   - ✅ Se llama desde `superadmin.js` cuando se asigna el plan business

2. **Características del plan business**:
   - ✅ 150 imágenes + 25 videos VEO 3.1
   - ✅ Multi-usuario (multi_user: true)
   - ✅ Límites configurados en la tabla `plans`

3. **Integración con superadmin**:
   - ✅ `superadmin.js` línea 263: Llama a `create_business_team_for_user` cuando se asigna el plan business

## ⚠️ Pendientes de Verificación Manual

### 1. Funcionalidad Multi-Usuario
- [ ] Verificar que los usuarios con plan business puedan crear múltiples usuarios
- [ ] Verificar que los usuarios creados tengan permisos correctos
- [ ] Verificar que los usuarios puedan acceder a sus datos de forma aislada

### 2. Gestión de Equipos
- [ ] Verificar que `create_business_team_for_user` cree correctamente el equipo
- [ ] Verificar que el usuario sea asignado como admin del equipo
- [ ] Verificar que los permisos por defecto se configuren correctamente

### 3. Límites y Restricciones
- [ ] Verificar que los límites del plan business (150 imágenes, 25 videos) se apliquen correctamente
- [ ] Verificar que los límites se compartan entre usuarios del mismo equipo (si aplica)
- [ ] Verificar que los contadores se incrementen correctamente para usuarios business

### 4. API y Roles Avanzados
- [ ] Verificar que la API abierta funcione para usuarios business
- [ ] Verificar que los roles avanzados se configuren correctamente
- [ ] Verificar que los permisos se apliquen según el rol

### 5. Integración con Stripe
- [ ] Verificar que el pago del plan business se procese correctamente
- [ ] Verificar que `last_payment_at` se actualice cuando se procesa el pago
- [ ] Verificar que el bloqueo funcione correctamente si no se paga

## 📝 Notas

- El modo business requiere verificación manual porque involucra múltiples usuarios y permisos complejos
- Se recomienda probar en un entorno de desarrollo antes de producción
- La función `create_business_team_for_user` debe ejecutarse correctamente sin errores

## 🔧 Comandos para Verificar

```sql
-- Verificar que el plan business existe y tiene los límites correctos
SELECT id, name, image_generations_limit, video_generations_limit, features->>'multi_user' as multi_user
FROM public.plans
WHERE id = 'business';

-- Verificar usuarios con plan business
SELECT s.user_id, s.plan_id, s.status, p.full_name, p.email
FROM public.subscriptions s
JOIN public.profiles p ON p.id = s.user_id
WHERE s.plan_id = 'business';

-- Verificar equipos creados para usuarios business
SELECT t.id, t.owner_id, t.name, p.full_name as owner_name
FROM public.teams t
JOIN public.profiles p ON p.id = t.owner_id
JOIN public.subscriptions s ON s.user_id = t.owner_id
WHERE s.plan_id = 'business';
```

