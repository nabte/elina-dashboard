-- ==============================================================================
-- Migration: Allow Super Admins to update ANY profile
-- Purpose: Fix the issue where Super Admins cannot toggle 'is_affiliate' or update other users
-- ==============================================================================

-- 1. Ensure the is_superadmin function exists and is secure (SECURITY DEFINER)
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
      AND role = 'superadmin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;

-- 2. Create or Replace the policy for UPDATE on profiles
-- First drop to avoid conflicts if it exists with a different definition
DROP POLICY IF EXISTS "Superparams can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can update any profile" ON public.profiles;

CREATE POLICY "Superadmins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- The user fulfilling the action must be a superadmin
  public.is_superadmin(auth.uid())
  OR
  -- OR the user is updating their own profile (keep existing functionality)
  auth.uid() = id
)
WITH CHECK (
  -- Same condition for the new row state
  public.is_superadmin(auth.uid())
  OR
  auth.uid() = id
);

-- 3. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Verify policy creation
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Superadmins can update any profile';
