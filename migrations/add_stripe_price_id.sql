-- Agregar columna stripe_price_id a la tabla plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Agregar comentario para claridad
COMMENT ON COLUMN plans.stripe_price_id IS 'Stripe Price ID (price_xxx) para el checkout, diferente del Product ID';

-- IMPORTANTE: Necesitas actualizar estos valores con los Price IDs reales de tu cuenta de Stripe
-- Los Price IDs se ven así: price_1ABC123xyz (NO prod_xxx)
-- Puedes encontrarlos en: https://dashboard.stripe.com/products
--
-- Ejemplo de cómo actualizar (reemplaza con tus Price IDs reales):
-- UPDATE plans SET stripe_price_id = 'price_1ABC123xyz' WHERE id = 'starter';
-- UPDATE plans SET stripe_price_id = 'price_1DEF456xyz' WHERE id = 'grow';
-- UPDATE plans SET stripe_price_id = 'price_1GHI789xyz' WHERE id = 'business';
