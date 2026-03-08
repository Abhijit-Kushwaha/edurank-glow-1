
-- Drop the overly permissive policy
DROP POLICY "Authenticated users can create organisations" ON public.organisations;

-- Only allow admins/super_admins to create organisations
CREATE POLICY "Admins can create organisations"
ON public.organisations
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin'));
