
-- Allow any authenticated user to INSERT a new organisation
CREATE POLICY "Authenticated users can create organisations"
ON public.organisations
FOR INSERT
TO authenticated
WITH CHECK (true);
