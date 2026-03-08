
-- Add invite_code column to organisations
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Create function to generate a random 8-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_org_invite_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO ''
AS $$
  SELECT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
$$;

-- Backfill existing orgs with codes
UPDATE public.organisations SET invite_code = public.generate_org_invite_code() WHERE invite_code IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.organisations ALTER COLUMN invite_code SET NOT NULL;
ALTER TABLE public.organisations ALTER COLUMN invite_code SET DEFAULT public.generate_org_invite_code();

-- Create a SECURITY DEFINER function to join org by code during signup
CREATE OR REPLACE FUNCTION public.join_org_by_code(p_user_id uuid, p_code text, p_role text DEFAULT 'student')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_final_role text;
BEGIN
  -- Verify caller is the user
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Validate role input
  IF p_role NOT IN ('student', 'teacher') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Look up org by invite code
  SELECT id, name INTO v_org_id, v_org_name
  FROM public.organisations
  WHERE invite_code = upper(trim(p_code))
    AND status = 'active';

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid organization code');
  END IF;

  -- Map role
  IF p_role = 'student' THEN
    v_final_role := 'student';
  ELSE
    v_final_role := 'teacher';
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET org_id = v_org_id,
      role = v_final_role,
      is_independent = false,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'org_name', v_org_name, 'org_id', v_org_id);
END;
$$;

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.join_org_by_code(uuid, text, text) TO authenticated;

-- Allow anyone to read org name by invite code (for signup validation)
CREATE OR REPLACE FUNCTION public.validate_org_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_org_name text;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT name INTO v_org_name
  FROM public.organisations
  WHERE invite_code = upper(trim(p_code))
    AND status = 'active';

  IF v_org_name IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object('valid', true, 'org_name', v_org_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_org_code(text) TO anon, authenticated;
