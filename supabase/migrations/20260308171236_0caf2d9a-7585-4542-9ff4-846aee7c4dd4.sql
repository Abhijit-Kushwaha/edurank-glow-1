
-- Revoke direct column access to sensitive invite codes from the anon and authenticated roles
-- Then grant back only to admins via the get_org_safe() security definer function
REVOKE SELECT (invite_code_teacher, invite_code_admin) ON public.organisations FROM anon, authenticated;
