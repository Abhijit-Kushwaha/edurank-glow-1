
-- 1. Revoke SELECT on sensitive invite code columns from organisations table
-- The get_org_safe() SECURITY DEFINER function already handles role-based access
REVOKE SELECT (invite_code_admin) ON public.organisations FROM authenticated;
REVOKE SELECT (invite_code_admin) ON public.organisations FROM anon;
REVOKE SELECT (invite_code_teacher) ON public.organisations FROM authenticated;
REVOKE SELECT (invite_code_teacher) ON public.organisations FROM anon;

-- 2. Restrict requested_role in org_join_requests INSERT policy
-- Drop existing policy and recreate with role restriction
DROP POLICY IF EXISTS "Users can create own join requests" ON public.org_join_requests;

CREATE POLICY "Users can create own join requests"
ON public.org_join_requests FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  requested_role IN ('student', 'teacher', 'admin')
);
