-- ========================================
-- POLÍTICAS RLS PARA PÁGINA DE RESERVAS PÚBLICA (ELINA)
-- ========================================

-- 1. profiles: Lectura pública (para mostrar info del negocio)
DROP POLICY IF EXISTS "public_read_profiles_for_booking" ON "profiles";
CREATE POLICY "public_read_profiles_for_booking" ON "profiles"
  FOR SELECT
  USING (true); -- Cualquiera puede leer perfiles públicos

-- 2. products: Lectura pública (para mostrar servicios)
DROP POLICY IF EXISTS "public_read_services_for_booking" ON "products";
CREATE POLICY "public_read_services_for_booking" ON "products"
  FOR SELECT
  USING (product_type = 'service'); -- Solo servicios (sin verificar is_active)

-- 3. meetings: Lectura pública (para calcular disponibilidad)
DROP POLICY IF EXISTS "public_read_meetings_for_availability" ON "meetings";
CREATE POLICY "public_read_meetings_for_availability" ON "meetings"
  FOR SELECT
  USING (true); -- Cualquiera puede ver citas (solo para calcular disponibilidad)

-- 4. meetings: INSERCIÓN PÚBLICA (¡CRÍTICO!)
DROP POLICY IF EXISTS "public_insert_meetings_from_booking" ON "meetings";
CREATE POLICY "public_insert_meetings_from_booking" ON "meetings"
  FOR INSERT
  WITH CHECK (
    -- Solo permitir si viene de la página pública
    metadata->>'created_via' = 'public_booking'
  );

-- 5. contacts: Lectura pública (para verificar si existe)
DROP POLICY IF EXISTS "public_read_contacts_for_booking" ON "contacts";
CREATE POLICY "public_read_contacts_for_booking" ON "contacts"
  FOR SELECT
  USING (true);

-- 6. contacts: INSERCIÓN PÚBLICA (para crear contactos nuevos)
DROP POLICY IF EXISTS "public_insert_contacts_from_booking" ON "contacts";
CREATE POLICY "public_insert_contacts_from_booking" ON "contacts"
  FOR INSERT
  WITH CHECK (true); -- Cualquiera puede crear contactos desde booking

-- 7. appointment_settings: Skip - es una vista, no tabla
-- DROP POLICY IF EXISTS "public_read_appointment_settings" ON "appointment_settings";
-- CREATE POLICY "public_read_appointment_settings" ON "appointment_settings"
--   FOR SELECT
--   USING (is_enabled = true);

-- 8. appointment_hours: Lectura pública (para calcular disponibilidad)
DROP POLICY IF EXISTS "public_read_appointment_hours" ON "appointment_hours";
CREATE POLICY "public_read_appointment_hours" ON "appointment_hours"
  FOR SELECT
  USING (true);

-- ========================================
-- POLÍTICAS PRIVADAS (Solo el dueño)
-- ========================================

-- meetings: Solo el dueño puede actualizar/eliminar
DROP POLICY IF EXISTS "owner_update_meetings" ON "meetings";
CREATE POLICY "owner_update_meetings" ON "meetings"
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owner_delete_meetings" ON "meetings";
CREATE POLICY "owner_delete_meetings" ON "meetings"
  FOR DELETE
  USING (user_id = auth.uid());

-- contacts: Solo el dueño puede actualizar/eliminar
DROP POLICY IF EXISTS "owner_update_contacts" ON "contacts";
CREATE POLICY "owner_update_contacts" ON "contacts"
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owner_delete_contacts" ON "contacts";
CREATE POLICY "owner_delete_contacts" ON "contacts"
  FOR DELETE
  USING (user_id = auth.uid());

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verifica que RLS esté habilitado
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "appointment_settings" ENABLE ROW LEVEL SECURITY; -- Es una vista, no tabla
ALTER TABLE "appointment_hours" ENABLE ROW LEVEL SECURITY;

-- Listar todas las políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'products', 'meetings', 'contacts', 'appointment_hours')
ORDER BY tablename, policyname;
