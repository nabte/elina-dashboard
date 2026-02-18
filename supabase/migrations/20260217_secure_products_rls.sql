-- ========================================
-- POLÍTICAS RLS DE SEGURIDAD PARA PRODUCTOS
-- Fecha: 2026-02-17
-- Propósito: Restringir acceso a productos solo al dueño
-- ========================================

-- IMPORTANTE: Los productos tienen dos tipos de acceso:
-- 1. PÚBLICO: Lectura de servicios activos (para página de reservas)
--    → Ya existe: "public_read_services_for_booking"
--
-- 2. PRIVADO: El dueño gestiona sus propios productos
--    → FALTAN estas políticas (se crean aquí)

-- ========================================
-- POLÍTICAS PRIVADAS PARA PRODUCTOS
-- ========================================

-- 1. INSERCIÓN: Solo el usuario autenticado puede crear productos para sí mismo
DROP POLICY IF EXISTS "owner_insert_products" ON "products";
CREATE POLICY "owner_insert_products" ON "products"
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 2. LECTURA PRIVADA: El dueño puede ver TODOS sus productos (activos e inactivos)
--    Nota: Esta política coexiste con "public_read_services_for_booking"
DROP POLICY IF EXISTS "owner_read_products" ON "products";
CREATE POLICY "owner_read_products" ON "products"
  FOR SELECT
  USING (user_id = auth.uid());

-- 3. ACTUALIZACIÓN: Solo el dueño puede actualizar sus productos
DROP POLICY IF EXISTS "owner_update_products" ON "products";
CREATE POLICY "owner_update_products" ON "products"
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid()); -- Evitar cambiar user_id

-- 4. ELIMINACIÓN: Solo el dueño puede eliminar sus productos
DROP POLICY IF EXISTS "owner_delete_products" ON "products";
CREATE POLICY "owner_delete_products" ON "products"
  FOR DELETE
  USING (user_id = auth.uid());

-- ========================================
-- VERIFICACIÓN DE SEGURIDAD
-- ========================================

-- Asegurar que RLS esté habilitado (redundante pero seguro)
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

-- Verificar todas las políticas de productos
SELECT
    policyname,
    cmd AS "Operación",
    CASE
        WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
        ELSE 'Sin USING'
    END AS "Condición USING",
    CASE
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check::text
        ELSE 'Sin WITH CHECK'
    END AS "Condición WITH CHECK"
FROM pg_policies
WHERE tablename = 'products'
ORDER BY cmd, policyname;

-- ========================================
-- TESTING (Comentado - descomentar para probar)
-- ========================================

/*
-- Test 1: Usuario autenticado puede crear su propio producto
-- (Ejecutar como usuario autenticado)
INSERT INTO products (user_id, product_name, sku, price, product_type)
VALUES (auth.uid(), 'Test Product', 'TEST-SKU', 100, 'physical');

-- Test 2: Usuario NO puede crear producto para otro usuario
-- (Esto debería FALLAR con error de RLS)
INSERT INTO products (user_id, product_name, sku, price, product_type)
VALUES ('00000000-0000-0000-0000-000000000000', 'Hack', 'HACK', 1, 'physical');

-- Test 3: Usuario puede ver solo sus propios productos
SELECT id, product_name, user_id
FROM products
WHERE user_id = auth.uid();

-- Test 4: Usuario NO puede actualizar producto de otro
-- (Esto debería FALLAR o no afectar filas)
UPDATE products
SET price = 999
WHERE user_id != auth.uid();

-- Test 5: Usuario NO puede eliminar producto de otro
-- (Esto debería FALLAR o no afectar filas)
DELETE FROM products
WHERE user_id != auth.uid();
*/
