# 🚨 ANÁLISIS DE SEGURIDAD: VULNERABILIDADES CRÍTICAS EN SISTEMA DE RESERVAS

**Fecha:** 2026-02-20
**Severidad:** CRÍTICA
**Afectación:** Todos los tenants/empresas

---

## ⚠️ RESUMEN EJECUTIVO

Se detectaron **vulnerabilidades críticas de seguridad** en las políticas RLS del sistema de reservas públicas que permiten:

1. ✅ Ver servicios de TODAS las empresas (no solo la propia)
2. ✅ Ver perfiles de TODOS los usuarios incluyendo superadmin
3. ✅ Ver citas de TODOS los usuarios
4. ✅ Ver contactos de TODOS los usuarios
5. ✅ Ver horarios de disponibilidad de TODOS los usuarios

**Estas políticas permiten filtración masiva de datos confidenciales entre tenants.**

---

## 🔍 ANÁLISIS TÉCNICO

### 1. Archivo Problemático

**Archivo:** `supabase/migrations/20260129_public_booking_rls.sql`
**Fecha de creación:** 29 de enero de 2026

### 2. Políticas RLS Inseguras

#### 2.1 Profiles - TOTALMENTE ABIERTO
```sql
-- Línea 6-9
CREATE POLICY "public_read_profiles_for_booking" ON "profiles"
  FOR SELECT
  USING (true); -- ❌ Cualquiera puede leer TODOS los perfiles
```

**Impacto:** Cualquier persona con el SUPABASE_ANON_KEY puede ver:
- Todos los perfiles de usuarios
- Perfiles de superadmin
- Información de branding, configuración, organization_id

---

#### 2.2 Products - FILTRADO INSUFICIENTE
```sql
-- Línea 12-15
CREATE POLICY "public_read_services_for_booking" ON "products"
  FOR SELECT
  USING (product_type = 'service'); -- ❌ Solo filtra por tipo, NO por tenant
```

**Impacto:** Cualquiera puede ver TODOS los servicios de TODAS las empresas:
```sql
-- Consulta que CUALQUIERA puede hacer:
SELECT * FROM products WHERE product_type = 'service';
-- Retorna servicios de TODOS los tenants
```

---

#### 2.3 Meetings - TOTALMENTE ABIERTO
```sql
-- Línea 18-21
CREATE POLICY "public_read_meetings_for_availability" ON "meetings"
  FOR SELECT
  USING (true); -- ❌ Cualquiera puede ver TODAS las citas
```

**Impacto:** Exposición total de:
- Todas las citas de todos los usuarios
- Horarios ocupados
- Información de contactos (contact_id)
- Metadata de reuniones

---

#### 2.4 Contacts - TOTALMENTE ABIERTO
```sql
-- Línea 33-36
CREATE POLICY "public_read_contacts_for_booking" ON "contacts"
  FOR SELECT
  USING (true); -- ❌ Cualquiera puede ver TODOS los contactos
```

**Impacto:** Filtración de base de datos completa de contactos:
- Nombres completos
- Números de teléfono
- Emails
- Información de CRM de TODOS los tenants

---

#### 2.5 Appointment Hours - TOTALMENTE ABIERTO
```sql
-- Línea 51-54
CREATE POLICY "public_read_appointment_hours" ON "appointment_hours"
  FOR SELECT
  USING (true); -- ❌ Cualquiera puede ver TODOS los horarios
```

**Impacto:** Exposición de horarios de atención de todos los usuarios

---

## ✅ VERIFICACIÓN: Las Edge Functions SÍ Filtran Correctamente

### ✅ get-public-profile
```typescript
// Línea 54-63
const { data: services } = await supabase
  .from('appointment_types')
  .select('id, name, duration_minutes, description')
  .eq('user_id', userId)  // ✅ FILTRA por user_id
```

### ✅ get-available-slots
```typescript
// Línea 66-78
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('slug', slug)  // ✅ FILTRA por slug específico
  .single();
```

### ✅ book-appointment
```typescript
// Línea 27-29
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('slug', slug)  // ✅ FILTRA por slug
  .single();
```

**CONCLUSIÓN:** Las Edge Functions usan `SUPABASE_SERVICE_ROLE_KEY` (que bypasea RLS) y filtran correctamente. **NO NECESITAN las políticas RLS públicas.**

---

## 🎯 SOLUCIÓN RECOMENDADA

### Opción 1: ELIMINAR Políticas Públicas (RECOMENDADO)

**Razón:** Las Edge Functions ya hacen todo el trabajo de filtrado de manera segura.

```sql
-- Eliminar políticas públicas inseguras
DROP POLICY IF EXISTS "public_read_profiles_for_booking" ON "profiles";
DROP POLICY IF EXISTS "public_read_services_for_booking" ON "products";
DROP POLICY IF EXISTS "public_read_meetings_for_availability" ON "meetings";
DROP POLICY IF EXISTS "public_read_contacts_for_booking" ON "contacts";
DROP POLICY IF EXISTS "public_insert_contacts_from_booking" ON "contacts";
DROP POLICY IF EXISTS "public_read_appointment_hours" ON "appointment_hours";
DROP POLICY IF EXISTS "public_insert_meetings_from_booking" ON "meetings";
```

### Opción 2: RESTRINGIR Políticas (Si se necesita acceso directo)

**Solo usar si hay código frontend que hace consultas directas.**

```sql
-- profiles: Solo perfiles con slug público y appointments habilitados
DROP POLICY IF EXISTS "public_read_profiles_for_booking" ON "profiles";
CREATE POLICY "public_read_profiles_for_booking" ON "profiles"
  FOR SELECT
  USING (
    slug IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM appointment_settings
      WHERE user_id = profiles.id
      AND is_enabled = true
    )
  );

-- products: Requiere pasar user_id en la query
-- (NO HAY FORMA SEGURA de hacer esto público sin exponer todos los servicios)
-- MEJOR: Eliminar esta política y usar solo Edge Functions

-- meetings: NUNCA debe ser público
-- ELIMINAR esta política

-- contacts: NUNCA debe ser público
-- ELIMINAR esta política

-- appointment_hours: Requiere user_id específico
-- ELIMINAR esta política y usar solo Edge Functions
```

---

## 📋 MIGRACIÓN DE CORRECCIÓN

Crear archivo: `supabase/migrations/20260220_fix_public_booking_security.sql`

```sql
-- ========================================
-- CORRECCIÓN CRÍTICA DE SEGURIDAD
-- Fecha: 2026-02-20
-- Elimina políticas RLS públicas inseguras
-- ========================================

-- IMPORTANTE: Las Edge Functions usan SERVICE_ROLE_KEY
-- y ya filtran correctamente por tenant.
-- NO se necesitan políticas RLS públicas.

-- 1. ELIMINAR política pública de profiles
DROP POLICY IF EXISTS "public_read_profiles_for_booking" ON "profiles";

-- 2. ELIMINAR política pública de products
DROP POLICY IF EXISTS "public_read_services_for_booking" ON "products";

-- 3. ELIMINAR política pública de meetings (lectura)
DROP POLICY IF EXISTS "public_read_meetings_for_availability" ON "meetings";

-- 4. ELIMINAR política pública de meetings (inserción)
DROP POLICY IF EXISTS "public_insert_meetings_from_booking" ON "meetings";

-- 5. ELIMINAR política pública de contacts (lectura)
DROP POLICY IF EXISTS "public_read_contacts_for_booking" ON "contacts";

-- 6. ELIMINAR política pública de contacts (inserción)
DROP POLICY IF EXISTS "public_insert_contacts_from_booking" ON "contacts";

-- 7. ELIMINAR política pública de appointment_hours
DROP POLICY IF EXISTS "public_read_appointment_hours" ON "appointment_hours";

-- ========================================
-- NOTA: Las Edge Functions seguirán funcionando
-- porque usan SERVICE_ROLE_KEY y bypassean RLS
-- ========================================

-- Verificar que solo existan políticas de owner
SELECT
    tablename,
    policyname,
    cmd,
    CASE
        WHEN policyname LIKE 'public_%' THEN '⚠️ PÚBLICA (revisar)'
        WHEN policyname LIKE 'owner_%' THEN '✅ PRIVADA (correcto)'
        ELSE '❓ REVISAR'
    END as tipo
FROM pg_policies
WHERE tablename IN ('profiles', 'products', 'meetings', 'contacts', 'appointment_hours')
ORDER BY tablename, policyname;
```

---

## 🧪 TESTING POST-CORRECCIÓN

### 1. Verificar que Edge Functions sigan funcionando

```bash
# Test público (debe funcionar)
curl -X POST https://[tu-proyecto].supabase.co/functions/v1/get-public-profile \
  -H "Content-Type: application/json" \
  -d '{"slug": "empresa-test"}'

# Test booking (debe funcionar)
curl -X POST https://[tu-proyecto].supabase.co/functions/v1/get-available-slots \
  -H "Content-Type: application/json" \
  -d '{"slug": "empresa-test", "date": "2026-02-21"}'
```

### 2. Verificar que consultas directas NO funcionen

```javascript
// Esto DEBE FALLAR después de la corrección
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('product_type', 'service');
// Esperado: [] (sin resultados por RLS)

// Esto DEBE FALLAR
const { data } = await supabase
  .from('meetings')
  .select('*');
// Esperado: [] (sin resultados por RLS)
```

### 3. Verificar que usuarios autenticados vean solo sus datos

```javascript
// Usuario autenticado debe ver solo SUS productos
const { data } = await supabase
  .from('products')
  .select('*');
// Esperado: Solo productos del user_id actual
```

---

## 📊 IMPACTO DE LA CORRECCIÓN

### ✅ Después de Aplicar la Migración:

1. **Edge Functions:** Funcionarán igual (usan SERVICE_ROLE_KEY)
2. **Frontend autenticado:** Funcionará igual (tiene políticas owner_*)
3. **Página pública de booking:** Funcionará igual (usa Edge Functions)
4. **Consultas anónimas maliciosas:** ❌ BLOQUEADAS (no hay políticas públicas)

### ⚠️ Posibles Efectos Secundarios:

Si hay código que hace consultas directas desde `booking.js` usando el cliente anónimo:
- Revisar `src/booking/booking.js`
- Confirmar que solo usa `.functions.invoke()`
- NO debe usar `.from()` directamente

**VERIFICADO:** El archivo `booking.js` solo usa Edge Functions, no hay consultas directas.

---

## 🚀 PRÓXIMOS PASOS

1. **URGENTE:** Aplicar la migración de corrección
2. Verificar que no haya código que use consultas directas
3. Monitorear logs de Supabase por errores RLS
4. Considerar auditoría de seguridad completa de otras tablas

---

## 📝 LECCIONES APRENDIDAS

1. **NUNCA usar `USING (true)` en políticas RLS públicas**
2. **Siempre filtrar por tenant (user_id/organization_id)**
3. **Preferir Edge Functions con SERVICE_ROLE_KEY para endpoints públicos**
4. **Auditar políticas RLS regularmente**

---

## 👥 REFERENCIAS

- Archivo problemático: `supabase/migrations/20260129_public_booking_rls.sql`
- Edge Functions verificadas:
  - `get-public-profile/index.ts` ✅
  - `get-available-slots/index.ts` ✅
  - `book-appointment/index.ts` ✅
- Frontend verificado: `src/booking/booking.js` ✅