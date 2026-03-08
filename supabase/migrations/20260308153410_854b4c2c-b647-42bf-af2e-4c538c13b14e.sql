
-- Create a secure function to handle org creation + creator promotion atomically
CREATE OR REPLACE FUNCTION public.create_organisation(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_profile_id uuid;
  v_safe_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check user doesn't already belong to an org
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND org_id IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already belong to an organization');
  END IF;

  -- Sanitize name
  v_safe_name := regexp_replace(left(trim(p_name), 100), '[<>"\x00-\x1f]', '', 'g');
  IF length(v_safe_name) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization name must be at least 2 characters');
  END IF;

  -- Create the org
  INSERT INTO public.organisations (name)
  VALUES (v_safe_name)
  RETURNING id INTO v_org_id;

  -- Promote creator to super_admin
  UPDATE public.profiles
  SET org_id = v_org_id, role = 'super_admin', is_independent = false, updated_at = now()
  WHERE user_id = v_user_id
  RETURNING id INTO v_profile_id;

  RETURN jsonb_build_object('success', true, 'org_id', v_org_id, 'profile_id', v_profile_id);
END;
$$;
