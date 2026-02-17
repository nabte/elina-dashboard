-- Migración: Corregir políticas RLS de team_invitations completamente
-- Elimina políticas duplicadas y conflictivas, crea nuevas correctas

-- 1. Eliminar TODAS las políticas existentes (nuevas y antiguas)
DROP POLICY IF EXISTS "Admins can view team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can create team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can update team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Los admins pueden ver invitaciones de su equipo" ON public.team_invitations;
DROP POLICY IF EXISTS "Los admins pueden crear invitaciones" ON public.team_invitations;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propia invitación" ON public.team_invitations;

-- 2. Verificar/crear función helper con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_team_admin_for_invitations(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
  );
END;
$$;

-- Otorgar permisos de ejecución
REVOKE ALL ON FUNCTION public.is_team_admin_for_invitations(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_team_admin_for_invitations(uuid) TO authenticated;

-- 3. Crear función helper para verificar si el usuario puede ver su propia invitación
-- (sin acceder a auth.users directamente)
CREATE OR REPLACE FUNCTION public.can_view_own_invitation(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Obtener el email del usuario actual desde profiles (no desde auth.users)
  SELECT p.email INTO v_user_email
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
  
  -- Comparar emails (case-insensitive)
  RETURN LOWER(TRIM(v_user_email)) = LOWER(TRIM(p_email));
END;
$$;

-- Otorgar permisos de ejecución
REVOKE ALL ON FUNCTION public.can_view_own_invitation(text) FROM public;
GRANT EXECUTE ON FUNCTION public.can_view_own_invitation(text) TO authenticated;

-- 4. Crear políticas nuevas (solo estas, sin duplicados)

-- Política para SELECT: Admins pueden ver invitaciones de su equipo
-- Y usuarios pueden ver su propia invitación pendiente
CREATE POLICY "team_invitations_select_policy"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  -- Admins pueden ver todas las invitaciones de su equipo
  public.is_team_admin_for_invitations(team_id)
  OR
  -- Usuarios pueden ver su propia invitación pendiente
  (public.can_view_own_invitation(email) AND status = 'pending')
);

-- Política para INSERT: Solo admins pueden crear invitaciones
CREATE POLICY "team_invitations_insert_policy"
ON public.team_invitations
FOR INSERT
TO authenticated
WITH CHECK (public.is_team_admin_for_invitations(team_id));

-- Política para UPDATE: Solo admins pueden actualizar invitaciones de su equipo
CREATE POLICY "team_invitations_update_policy"
ON public.team_invitations
FOR UPDATE
TO authenticated
USING (public.is_team_admin_for_invitations(team_id))
WITH CHECK (public.is_team_admin_for_invitations(team_id));

-- Comentarios
COMMENT ON FUNCTION public.is_team_admin_for_invitations(uuid) IS 
  'Verifica si el usuario actual es admin de un equipo. Usa SECURITY DEFINER para evitar problemas de permisos con auth.users';

COMMENT ON FUNCTION public.can_view_own_invitation(text) IS 
  'Verifica si el usuario actual puede ver una invitación por email. Usa SECURITY DEFINER y accede a profiles en lugar de auth.users';

COMMENT ON POLICY "team_invitations_select_policy" ON public.team_invitations IS 
  'Permite a los administradores ver invitaciones de su equipo y a los usuarios ver su propia invitación pendiente';

COMMENT ON POLICY "team_invitations_insert_policy" ON public.team_invitations IS 
  'Permite a los administradores crear invitaciones para su equipo';

COMMENT ON POLICY "team_invitations_update_policy" ON public.team_invitations IS 
  'Permite a los administradores actualizar invitaciones de su equipo';

