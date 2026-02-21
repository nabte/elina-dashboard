-- Permitir INSERT en ryze_purchase_receipt_images para usuarios autenticados
CREATE POLICY IF NOT EXISTS "Users can insert their own receipt images"
ON ryze_purchase_receipt_images
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Si la política ya existe, primero eliminarla y recrearla
DROP POLICY IF EXISTS "Users can insert their own receipt images" ON ryze_purchase_receipt_images;

CREATE POLICY "Users can insert their own receipt images"
ON ryze_purchase_receipt_images
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
