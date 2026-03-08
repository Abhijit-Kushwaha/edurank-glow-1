CREATE OR REPLACE FUNCTION public.request_join_org(p_code text, p_role text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org record;
  v_code text;
  v_detected_role text;
  v_user_id uuid;
  v_existing_org uuid;
  v_existing_request record;
  v_inserted_request_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid organization code');
  END IF;

  SELECT org_id INTO v_existing_org
  FROM public.profiles
  WHERE user_id = v_user_id;

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

  -- Race-safe insert-first pattern (prevents 409 from unique conflicts)
  INSERT INTO public.org_join_requests (org_id, user_id, requested_role)
  VALUES (v_org.id, v_user_id, v_detected_role)
  ON CONFLICT (org_id, user_id) DO NOTHING
  RETURNING id INTO v_inserted_request_id;

  IF v_inserted_request_id IS NULL THEN
    SELECT * INTO v_existing_request
    FROM public.org_join_requests
    WHERE org_id = v_org.id AND user_id = v_user_id;

    IF v_existing_request IS NOT NULL AND v_existing_request.status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'You already have a pending request for this organization');
    END IF;

    UPDATE public.org_join_requests
    SET status = 'pending',
        requested_role = v_detected_role,
        reviewer_id = NULL,
        reviewed_at = NULL,
        reviewer_note = NULL,
        updated_at = now()
    WHERE org_id = v_org.id AND user_id = v_user_id;
  END IF;

  -- Notify admins (notifications.user_id expects profiles.id, not profiles.user_id)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT p.id, 'org_join_request', 'New Join Request',
      'A user wants to join your organization as ' || v_detected_role,
      '/org'
    FROM public.profiles p
    WHERE p.org_id = v_org.id AND p.role IN ('super_admin', 'admin');
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'request_join_org notification insert failed for user % / org %: %', v_user_id, v_org.id, SQLERRM;
  END;

  RETURN jsonb_build_object('success', true, 'org_name', v_org.name, 'role', v_detected_role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_join_request(p_request_id uuid, p_action text, p_note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
  v_request RECORD;
  v_requester_profile_id uuid;
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

  UPDATE public.org_join_requests
  SET status = p_action, reviewer_id = auth.uid(), reviewed_at = now(), reviewer_note = p_note, updated_at = now()
  WHERE id = p_request_id;

  IF p_action = 'approved' THEN
    UPDATE public.profiles
    SET org_id = v_request.org_id, role = v_request.requested_role, is_independent = false, updated_at = now()
    WHERE user_id = v_request.user_id;
  END IF;

  SELECT id INTO v_requester_profile_id
  FROM public.profiles
  WHERE user_id = v_request.user_id
  LIMIT 1;

  IF v_requester_profile_id IS NOT NULL THEN
    BEGIN
      IF p_action = 'approved' THEN
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (
          v_requester_profile_id,
          'org_join_approved',
          'Request Approved!',
          'Your request to join the organization has been approved.',
          '/org'
        );
      ELSE
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (
          v_requester_profile_id,
          'org_join_rejected',
          'Request Declined',
          COALESCE(p_note, 'Your request to join the organization was declined.'),
          '/org'
        );
      END IF;
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'review_join_request notification insert failed for request %: %', p_request_id, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$function$;