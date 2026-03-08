
-- Create org_join_requests table for approval workflow
CREATE TABLE public.org_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  requested_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;

-- Requester can view their own requests
CREATE POLICY "Users can view own join requests"
  ON public.org_join_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own join request
CREATE POLICY "Users can create own join requests"
  ON public.org_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SA/Admin can view all org requests
CREATE POLICY "SA/Admin can view org join requests"
  ON public.org_join_requests FOR SELECT
  TO authenticated
  USING (org_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- SA/Admin can update (approve/reject) org requests
CREATE POLICY "SA/Admin can manage org join requests"
  ON public.org_join_requests FOR UPDATE
  TO authenticated
  USING (org_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- RPC: Request to join an org (pending approval)
CREATE OR REPLACE FUNCTION public.request_join_org(p_code text, p_role text DEFAULT 'student')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_user_id uuid;
  v_existing_org uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_role NOT IN ('student', 'teacher') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Check user doesn't already belong to an org
  SELECT org_id INTO v_existing_org FROM public.profiles WHERE user_id = v_user_id;
  IF v_existing_org IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already belong to an organization');
  END IF;

  -- Lookup org by code
  SELECT id, name INTO v_org_id, v_org_name
  FROM public.organisations
  WHERE invite_code = upper(trim(p_code)) AND status = 'active';

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid organization code');
  END IF;

  -- Check for existing pending request
  IF EXISTS (SELECT 1 FROM public.org_join_requests WHERE org_id = v_org_id AND user_id = v_user_id AND status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending request for this organization');
  END IF;

  -- Create join request
  INSERT INTO public.org_join_requests (org_id, user_id, requested_role)
  VALUES (v_org_id, v_user_id, p_role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET
    status = 'pending',
    requested_role = p_role,
    reviewer_id = NULL,
    reviewed_at = NULL,
    reviewer_note = NULL,
    updated_at = now();

  -- Send notification to all admins of the org
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.user_id, 'org_join_request', 'New Join Request',
    'A user wants to join your organization as ' || p_role,
    '/org'
  FROM public.profiles p
  WHERE p.org_id = v_org_id AND p.role IN ('super_admin', 'admin');

  RETURN jsonb_build_object('success', true, 'org_name', v_org_name);
END;
$$;

-- RPC: Approve/Reject join request (admin only)
CREATE OR REPLACE FUNCTION public.review_join_request(p_request_id uuid, p_action text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
  v_request RECORD;
  v_user_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_action NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  SELECT role, org_id INTO v_caller_role, v_caller_org
  FROM public.profiles WHERE user_id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  SELECT * INTO v_request FROM public.org_join_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_request.org_id IS DISTINCT FROM v_caller_org THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your organization');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already reviewed');
  END IF;

  -- Update request
  UPDATE public.org_join_requests
  SET status = p_action, reviewer_id = auth.uid(), reviewed_at = now(), reviewer_note = p_note, updated_at = now()
  WHERE id = p_request_id;

  IF p_action = 'approved' THEN
    -- Add user to org
    UPDATE public.profiles
    SET org_id = v_request.org_id, role = v_request.requested_role, is_independent = false, updated_at = now()
    WHERE user_id = v_request.user_id;

    -- Notify the user
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (v_request.user_id, 'org_join_approved', 'Request Approved!', 'Your request to join the organization has been approved.', '/org');
  ELSE
    -- Notify rejection
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (v_request.user_id, 'org_join_rejected', 'Request Declined', COALESCE(p_note, 'Your request to join the organization was declined.'), '/org');
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$$;

-- Enable realtime for join requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_join_requests;
