-- Migración: Agregar políticas RLS para team_invitations
-- Permite a los admins leer las invitaciones de su equipo

-- Primero, crear una función helper con SECURITY DEFINER para verificar si un usuario es admin
-- Esto evita problemas de permisos al acceder a auth.users
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

-- Otorgar permisos de ejecución a usuarios autenticados
REVOKE ALL ON FUNCTION public.is_team_admin_for_invitations(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_team_admin_for_invitations(uuid) TO authenticated;

-- Habilitar RLS en team_invitations si no está habilitado
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para poder recrearlas)
DROP POLICY IF EXISTS "Admins can view team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can create team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can update team invitations" ON public.team_invitations;

-- Política para SELECT: Los admins pueden ver las invitaciones de su equipo
CREATE POLICY "Admins can view team invitations"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (public.is_team_admin_for_invitations(team_id));

-- Política para INSERT: Los admins pueden crear invitaciones para su equipo
CREATE POLICY "Admins can create team invitations"
ON public.team_invitations
FOR INSERT
TO authenticated
WITH CHECK (public.is_team_admin_for_invitations(team_id));

-- Política para UPDATE: Los admins pueden actualizar invitaciones de su equipo
CREATE POLICY "Admins can update team invitations"
ON public.team_invitations
FOR UPDATE
TO authenticated
USING (public.is_team_admin_for_invitations(team_id))
WITH CHECK (public.is_team_admin_for_invitations(team_id));

-- Comentarios
COMMENT ON FUNCTION public.is_team_admin_for_invitations(uuid) IS 
  'Verifica si el usuario actual es admin de un equipo. Usa SECURITY DEFINER para evitar problemas de permisos con auth.users';

COMMENT ON POLICY "Admins can view team invitations" ON public.team_invitations IS 
  'Permite a los administradores ver las invitaciones de su equipo';

COMMENT ON POLICY "Admins can create team invitations" ON public.team_invitations IS 
  'Permite a los administradores crear invitaciones para su equipo';

COMMENT ON POLICY "Admins can update team invitations" ON public.team_invitations IS 
  'Permite a los administradores actualizar invitaciones de su equipo';

