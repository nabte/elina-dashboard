-- ============================================
-- Fix: Dar permisos a la función is_superadmin
-- Esto soluciona el error "permission denied for function is_superadmin"
-- ============================================

-- Verificar que la función is_superadmin existe
SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'is_superadmin' THEN 'Existe ✅'
        ELSE 'No existe ❌'
    END as status
FROM pg_proc
WHERE proname = 'is_superadmin';

-- Dar permisos a authenticated para ejecutar is_superadmin
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;

-- Verificar permisos otorgados
SELECT 
    p.proname as function_name,
    a.rolname as role_name,
    CASE 
        WHEN a.rolname = 'authenticated' THEN 'Permisos otorgados ✅'
        ELSE 'Otro rol'
    END as status
FROM pg_proc p
JOIN pg_proc_acl pa ON pa.oid = p.oid
JOIN pg_roles a ON a.oid = ANY(pa.acl)
WHERE p.proname = 'is_superadmin';

-- Si la función no existe, crearla
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND COALESCE(role, 'user') = 'superadmin'
  );
$$;

-- Asegurar permisos después de crear/actualizar
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, anon;

-- Verificar estado final
SELECT 
    'Función is_superadmin configurada correctamente ✅' as resultado,
    proname as function_name
FROM pg_proc
WHERE proname = 'is_superadmin';

