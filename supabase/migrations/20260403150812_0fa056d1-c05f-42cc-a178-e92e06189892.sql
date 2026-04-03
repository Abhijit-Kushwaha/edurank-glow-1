
CREATE OR REPLACE FUNCTION public.use_org_credits(p_user_id uuid, p_amount integer, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_total integer;
  v_used integer;
BEGIN
  -- Ownership check: users can only consume their own credits
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT org_id INTO v_org_id FROM public.profiles WHERE user_id = p_user_id;
  
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not in an organization');
  END IF;

  SELECT total_credits, used_credits INTO v_total, v_used
  FROM public.org_member_credits WHERE org_id = v_org_id AND user_id = p_user_id;

  IF v_total IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No credits allocated. Ask your Super Admin for credits.');
  END IF;

  IF (v_used + p_amount) > v_total THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits. You have ' || (v_total - v_used) || ' remaining.');
  END IF;

  UPDATE public.org_member_credits
  SET used_credits = used_credits + p_amount, updated_at = now()
  WHERE org_id = v_org_id AND user_id = p_user_id;

  INSERT INTO public.org_credit_log (org_id, user_id, amount, reason)
  VALUES (v_org_id, p_user_id, -p_amount, p_reason);

  RETURN jsonb_build_object('success', true, 'remaining', v_total - v_used - p_amount);
END;
$function$;
