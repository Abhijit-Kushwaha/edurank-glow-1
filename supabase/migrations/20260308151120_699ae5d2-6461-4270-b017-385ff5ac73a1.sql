-- Org member credits table: Super Admin controls credit allocation
CREATE TABLE public.org_member_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits integer NOT NULL DEFAULT 0,
  used_credits integer NOT NULL DEFAULT 0,
  last_reset_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE public.org_member_credits ENABLE ROW LEVEL SECURITY;

-- Members can view their own credits
CREATE POLICY "Members can view own credits"
  ON public.org_member_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- SA/Admin can view all org credits
CREATE POLICY "SA/Admin can view org credits"
  ON public.org_member_credits FOR SELECT TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

-- SA/Admin can manage org credits
CREATE POLICY "SA/Admin can manage org credits"
  ON public.org_member_credits FOR ALL TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

-- Credit log for audit trail
CREATE TABLE public.org_credit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_credit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit log"
  ON public.org_credit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "SA/Admin can view org credit log"
  ON public.org_credit_log FOR SELECT TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

CREATE POLICY "SA/Admin can insert credit log"
  ON public.org_credit_log FOR INSERT TO authenticated
  WITH CHECK (
    org_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

-- RPC: Allocate credits to a member (only SA/Admin)
CREATE OR REPLACE FUNCTION public.allocate_org_credits(
  p_target_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'Allocated by admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
  v_target_org uuid;
  v_current_total integer;
BEGIN
  SELECT role, org_id INTO v_caller_role, v_caller_org
  FROM public.profiles WHERE user_id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only Super Admins and Admins can allocate credits');
  END IF;

  -- Admin cannot allocate if not super_admin (optional: restrict to super_admin only)
  -- For now both SA and admin can allocate

  SELECT org_id INTO v_target_org FROM public.profiles WHERE user_id = p_target_user_id;

  IF v_caller_org IS DISTINCT FROM v_target_org THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not in your organization');
  END IF;

  IF p_amount < 1 OR p_amount > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be between 1 and 10000');
  END IF;

  -- Upsert credits
  INSERT INTO public.org_member_credits (org_id, user_id, total_credits, updated_at)
  VALUES (v_caller_org, p_target_user_id, p_amount, now())
  ON CONFLICT (org_id, user_id)
  DO UPDATE SET total_credits = org_member_credits.total_credits + p_amount, updated_at = now();

  -- Log
  INSERT INTO public.org_credit_log (org_id, user_id, amount, reason, granted_by)
  VALUES (v_caller_org, p_target_user_id, p_amount, p_reason, auth.uid());

  SELECT total_credits INTO v_current_total
  FROM public.org_member_credits WHERE org_id = v_caller_org AND user_id = p_target_user_id;

  RETURN jsonb_build_object('success', true, 'new_total', v_current_total);
END;
$$;

-- RPC: Use org credits (called by edge functions / teachers)
CREATE OR REPLACE FUNCTION public.use_org_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_total integer;
  v_used integer;
BEGIN
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
$$;

-- RPC: Get org credits for a user
CREATE OR REPLACE FUNCTION public.get_my_org_credits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_result jsonb;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE user_id = auth.uid();

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'used', 0, 'remaining', 0);
  END IF;

  SELECT jsonb_build_object(
    'total', COALESCE(total_credits, 0),
    'used', COALESCE(used_credits, 0),
    'remaining', COALESCE(total_credits - used_credits, 0)
  ) INTO v_result
  FROM public.org_member_credits WHERE org_id = v_org_id AND user_id = auth.uid();

  RETURN COALESCE(v_result, jsonb_build_object('total', 0, 'used', 0, 'remaining', 0));
END;
$$;