-- ============================================
-- Sistema de Permisos Granulares para Organizaciones
-- ============================================
-- Permite a los admins definir qué pueden ver/modificar los asesores

-- Crear tabla de permisos de organización
CREATE TABLE IF NOT EXISTS public.organization_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('advisor', 'admin')),
  resource text NOT NULL, -- 'qr_number', 'ai_prompt', 'images', 'branding', 'settings', 'contacts', 'chats', 'products', etc.
  can_view boolean DEFAULT false,
  can_modify boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, role, resource)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_org_permissions_org_role ON public.organization_permissions(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_org_permissions_resource ON public.organization_permissions(resource);

-- Habilitar RLS
ALTER TABLE public.organization_permissions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para hacer la migración idempotente)
DROP POLICY IF EXISTS "Users can view organization permissions" ON public.organization_permissions;
DROP POLICY IF EXISTS "Admins can modify organization permissions" ON public.organization_permissions;

-- Política: Los usuarios pueden ver permisos de su organización
CREATE POLICY "Users can view organization permissions"
ON public.organization_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = organization_permissions.organization_id
  )
);

-- Política: Solo admins pueden modificar permisos
CREATE POLICY "Admins can modify organization permissions"
ON public.organization_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.team_members tm ON tm.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.organization_id = organization_permissions.organization_id
      AND tm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.team_members tm ON tm.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.organization_id = organization_permissions.organization_id
      AND tm.role = 'admin'
  )
);

-- Función para verificar permisos de acceso a recursos
CREATE OR REPLACE FUNCTION public.can_access_resource(
  p_user_id uuid,
  p_resource text,
  p_action text -- 'view' o 'modify'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
  v_user_role text;
  v_organization_id uuid;
  v_permission record;
BEGIN
  -- Los admins siempre tienen acceso completo
  SELECT tm.role, p.organization_id
  INTO v_user_role, v_organization_id
  FROM public.profiles p
  LEFT JOIN public.team_members tm ON tm.user_id = p.id
  WHERE p.id = p_user_id
  LIMIT 1;
  
  -- Si es admin, siempre permitir
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Si no tiene organización, denegar
  IF v_organization_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si no es admin ni advisor, denegar
  IF v_user_role IS NULL OR v_user_role != 'advisor' THEN
    RETURN false;
  END IF;
  
  -- Buscar permiso específico para el recurso
  SELECT 
    CASE 
      WHEN p_action = 'view' THEN can_view
      WHEN p_action = 'modify' THEN can_modify
      ELSE false
    END as has_permission
  INTO v_permission
  FROM public.organization_permissions
  WHERE organization_id = v_organization_id
    AND role = 'advisor'
    AND resource = p_resource
  LIMIT 1;
  
  -- Si no hay permiso explícito, denegar (principio de menor privilegio)
  IF v_permission IS NULL OR v_permission.has_permission = false THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Otorgar permisos de ejecución
REVOKE ALL ON FUNCTION public.can_access_resource(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_resource(uuid, text, text) TO authenticated;

-- Comentarios
COMMENT ON TABLE public.organization_permissions IS 
  'Define permisos granulares para recursos de la organización. Los admins pueden configurar qué pueden ver/modificar los asesores.';

COMMENT ON FUNCTION public.can_access_resource(uuid, text, text) IS 
  'Verifica si un usuario puede acceder (ver o modificar) un recurso específico. Los admins siempre tienen acceso completo.';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_organization_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_permissions_updated_at
BEFORE UPDATE ON public.organization_permissions
FOR EACH ROW
EXECUTE FUNCTION update_organization_permissions_updated_at();

