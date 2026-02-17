-- ============================================
-- VERIFICAR ESTRUCTURAS REALES DE LAS TABLAS
-- ============================================
-- 
-- Ejecuta estos SQLs y compárteme TODOS los resultados
-- Así sabré exactamente qué columnas tienen las tablas
-- ============================================

-- 1. Estructura de la tabla profiles
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Estructura de la tabla subscriptions (ya la tienes, pero por si acaso)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 3. Ver una fila de ejemplo de profiles (si existe)
SELECT * 
FROM public.profiles 
LIMIT 1;

-- 4. Ver una fila de ejemplo de subscriptions (si existe)
SELECT * 
FROM public.subscriptions 
LIMIT 1;

-- 5. Verificar si el usuario específico tiene suscripción
SELECT 
    p.id as user_id,
    p.email,
    CASE 
        WHEN s.user_id IS NOT NULL THEN '✅ Tiene suscripción'
        ELSE '❌ Sin suscripción'
    END as subscription_status
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
WHERE p.id = 'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4'; -- Cambia este ID si es necesario

