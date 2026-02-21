-- ========================================
-- CORRECCIÓN CRÍTICA DE SEGURIDAD
-- Fecha: 2026-02-20
-- Elimina políticas RLS públicas inseguras del sistema de reservas
-- ========================================

-- CONTEXTO:
-- Las Edge Functions (get-public-profile, get-available-slots, book-appointment)
-- usan SUPABASE_SERVICE_ROLE_KEY que BYPASEA todas las políticas RLS.
-- Estas funciones ya filtran correctamente por tenant usando el slug.
--
-- Las políticas RLS públicas creadas en 20260129_public_booking_rls.sql
-- exponen datos de TODOS los tenants sin filtrado, permitiendo:
-- - Ver servicios de todas las empresas
-- - Ver perfiles de todos los usuarios (incluyendo superadmin)
-- - Ver todas las citas de todos los usuarios
-- - Ver todos los contactos de todos los tenants
--
-- SOLUCIÓN: Eliminar políticas públicas inseguras.
-- Las Edge Functions seguirán funcionando correctamente.

-- ========================================
-- 1. ELIMINAR POLÍTICAS PÚBLICAS INSEGURAS
-- ========================================

-- 1.1 Profiles: Expone TODOS los perfiles sin filtrado
DROP POLICY IF EXISTS "public_read_profiles_for_booking" ON "profiles";

-- 1.2 Products: Expone TODOS los servicios de TODAS las empresas
DROP POLICY IF EXISTS "public_read_services_for_booking" ON "products";

-- 1.3 Meetings: Expone TODAS las citas de TODOS los usuarios
DROP POLICY IF EXISTS "public_read_meetings_for_availability" ON "meetings";

-- 1.4 Meetings: Permite inserción sin validación adecuada de tenant
DROP POLICY IF EXISTS "public_insert_meetings_from_booking" ON "meetings";

-- 1.5 Contacts: Expone TODOS los contactos de TODOS los tenants
DROP POLICY IF EXISTS "public_read_contacts_for_booking" ON "contacts";

-- 1.6 Contacts: Permite crear contactos sin validación de tenant
DROP POLICY IF EXISTS "public_insert_contacts_from_booking" ON "contacts";

-- 1.7 Appointment Hours: Expone TODOS los horarios de TODOS los usuarios
DROP POLICY IF EXISTS "public_read_appointment_hours" ON "appointment_hours";

-- ========================================
-- 2. VERIFICAR POLÍTICAS RESTANTES
-- ========================================

-- Listar políticas activas (solo deben quedar las de 'owner_*')
SELECT
    tablename,
    policyname,
    cmd AS operacion,
    CASE
        WHEN policyname LIKE 'public_%' THEN '⚠️ PÚBLICA (NO DEBERÍA EXISTIR)'
        WHEN policyname LIKE 'owner_%' THEN '✅ PRIVADA (correcto)'
        ELSE '❓ REVISAR'
    END as tipo_politica,
    permissive AS permisiva
FROM pg_policies
WHERE tablename IN ('profiles', 'products', 'meetings', 'contacts', 'appointment_hours')
ORDER BY tablename, cmd, policyname;

-- ========================================
-- 3. CONFIRMAR QUE RLS ESTÁ HABILITADO
-- ========================================

-- Verificar que RLS esté activo en todas las tablas críticas
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_habilitado,
    CASE
        WHEN rowsecurity THEN '✅ RLS activo'
        ELSE '❌ RLS DESACTIVADO (PELIGRO)'
    END AS estado
FROM pg_tables
WHERE tablename IN ('profiles', 'products', 'meetings', 'contacts', 'appointment_hours')
  AND schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================

-- 1. Las Edge Functions NO se ven afectadas por esta corrección
--    porque usan SERVICE_ROLE_KEY que bypasea RLS.
--
-- 2. Los usuarios autenticados siguen teniendo acceso a sus propios
--    datos mediante las políticas 'owner_*'.
--
-- 3. La página pública de booking (booking.html) seguirá funcionando
--    porque solo usa las Edge Functions, NO hace consultas directas.
--
-- 4. Cualquier intento de hacer consultas directas usando ANON_KEY
--    ahora será bloqueado por RLS (comportamiento esperado y seguro).

-- ========================================
-- TESTING POST-MIGRACIÓN
-- ========================================

-- Test 1: Usuario anónimo NO puede ver productos
-- (Debe retornar [] vacío)
-- SELECT * FROM products WHERE product_type = 'service';

-- Test 2: Usuario anónimo NO puede ver meetings
-- (Debe retornar [] vacío)
-- SELECT * FROM meetings;

-- Test 3: Usuario anónimo NO puede ver contacts
-- (Debe retornar [] vacío)
-- SELECT * FROM contacts;

-- Test 4: Usuario autenticado PUEDE ver solo sus productos
-- (Debe retornar solo productos con user_id = auth.uid())
-- SELECT * FROM products WHERE user_id = auth.uid();