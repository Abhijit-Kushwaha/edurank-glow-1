
-- Add role-specific invite codes
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS invite_code_student text DEFAULT generate_org_invite_code(),
  ADD COLUMN IF NOT EXISTS invite_code_teacher text DEFAULT generate_org_invite_code(),
  ADD COLUMN IF NOT EXISTS invite_code_admin text DEFAULT generate_org_invite_code();

-- Populate for existing orgs
UPDATE public.organisations
SET
  invite_code_student = generate_org_invite_code(),
  invite_code_teacher = generate_org_invite_code(),
  invite_code_admin = generate_org_invite_code()
WHERE invite_code_student IS NULL OR invite_code_teacher IS NULL OR invite_code_admin IS NULL;

-- Update validate_org_code to return role from code type
CREATE OR REPLACE FUNCTION public.validate_org_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org record;
  v_code text;
  v_role text;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  v_code := upper(trim(p_code));

  SELECT id, name, invite_code, invite_code_student, invite_code_teacher, invite_code_admin, status
  INTO v_org
  FROM public.organisations
  WHERE (invite_code = v_code OR invite_code_student = v_code OR invite_code_teacher = v_code OR invite_code_admin = v_code)
    AND status = 'active';

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  IF v_org.invite_code_admin = v_code THEN
    v_role := 'admin';
  ELSIF v_org.invite_code_teacher = v_code THEN
    v_role := 'teacher';
  ELSIF v_org.invite_code_student = v_code THEN
    v_role := 'student';
  ELSE
    v_role := 'student';
  END IF;

  RETURN jsonb_build_object('valid', true, 'org_name', v_org.name, 'role', v_role);
END;
$$;

-- Update request_join_org to auto-detect role from code
CREATE OR REPLACE FUNCTION public.request_join_org(p_code text, p_role text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org record;
  v_code text;
  v_detected_role text;
  v_user_id uuid;
  v_existing_org uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT org_id INTO v_existing_org FROM public.profiles WHERE user_id = v_user_id;
  IF v_existing_org IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already belong to an organization');
  END IF;

  v_code := upper(trim(p_code));

  SELECT id, name, invite_code, invite_code_student, invite_code_teacher, invite_code_admin
  INTO v_org
  FROM public.organisations
  WHERE (invite_code = v_code OR invite_code_student = v_code OR invite_code_teacher = v_code OR invite_code_admin = v_code)
    AND status = 'active';

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid organization code');
  END IF;

  IF v_org.invite_code_admin = v_code THEN
    v_detected_role := 'admin';
  ELSIF v_org.invite_code_teacher = v_code THEN
    v_detected_role := 'teacher';
  ELSIF v_org.invite_code_student = v_code THEN
    v_detected_role := 'student';
  ELSE
    v_detected_role := COALESCE(p_role, 'student');
  END IF;

  IF v_detected_role NOT IN ('student', 'teacher', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  IF EXISTS (SELECT 1 FROM public.org_join_requests WHERE org_id = v_org.id AND user_id = v_user_id AND status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending request for this organization');
  END IF;

  INSERT INTO public.org_join_requests (org_id, user_id, requested_role)
  VALUES (v_org.id, v_user_id, v_detected_role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET
    status = 'pending',
    requested_role = v_detected_role,
    reviewer_id = NULL,
    reviewed_at = NULL,
    reviewer_note = NULL,
    updated_at = now();

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.user_id, 'org_join_request', 'New Join Request',
    'A user wants to join your organization as ' || v_detected_role,
    '/org'
  FROM public.profiles p
  WHERE p.org_id = v_org.id AND p.role IN ('super_admin', 'admin');

  RETURN jsonb_build_object('success', true, 'org_name', v_org.name, 'role', v_detected_role);
END;
$$;
