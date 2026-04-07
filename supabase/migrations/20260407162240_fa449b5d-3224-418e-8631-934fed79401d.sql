
-- Fix: Restrict org_join_requests INSERT to only student/teacher roles
-- Admin role assignment is handled securely via the request_join_org RPC
DROP POLICY IF EXISTS "Users can create own join requests" ON public.org_join_requests;

CREATE POLICY "Users can create own join requests"
ON public.org_join_requests FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  requested_role IN ('student', 'teacher')
);
