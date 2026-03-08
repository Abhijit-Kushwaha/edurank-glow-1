
-- Function to promote the org creator to super_admin after org creation
CREATE OR REPLACE FUNCTION public.promote_org_creator(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Verify caller is the user
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  -- Verify the org exists and was just created (within last 60 seconds)
  IF NOT EXISTS (
    SELECT 1 FROM public.organisations 
    WHERE id = p_org_id 
    AND created_at > now() - interval '60 seconds'
  ) THEN
    RETURN false;
  END IF;

  -- Update the profile
  UPDATE public.profiles
  SET org_id = p_org_id,
      role = 'super_admin',
      is_independent = false,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_org_creator(uuid, uuid) TO authenticated;
