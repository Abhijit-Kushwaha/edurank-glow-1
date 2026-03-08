
-- 1. FIX: Profiles SELECT - restrict PII exposure
CREATE OR REPLACE FUNCTION public.is_same_org(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.org_id = p2.org_id AND p2.org_id IS NOT NULL
    WHERE p1.user_id = auth.uid() AND p2.user_id = target_user_id
  );
$$;

DROP POLICY IF EXISTS "Authenticated users can search profiles by name" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Org members can read same-org profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_same_org(user_id));

CREATE POLICY "Users can search profiles for friends"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE (f.user_id = auth.uid() AND f.friend_id = profiles.user_id)
       OR (f.friend_id = auth.uid() AND f.user_id = profiles.user_id)
  )
);

-- 2. FIX: Organisations - safe function to mask invite codes for non-admins
CREATE OR REPLACE FUNCTION public.get_org_safe(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_org_id uuid;
  v_result jsonb;
BEGIN
  SELECT role, org_id INTO v_role, v_org_id FROM profiles WHERE user_id = auth.uid();
  IF v_org_id IS DISTINCT FROM p_org_id THEN RETURN NULL; END IF;
  
  IF v_role IN ('super_admin', 'admin') THEN
    SELECT jsonb_build_object(
      'id', o.id, 'name', o.name, 'status', o.status,
      'invite_code', o.invite_code, 'invite_code_student', o.invite_code_student,
      'invite_code_teacher', o.invite_code_teacher, 'invite_code_admin', o.invite_code_admin,
      'created_at', o.created_at
    ) INTO v_result FROM organisations o WHERE o.id = p_org_id;
  ELSE
    SELECT jsonb_build_object(
      'id', o.id, 'name', o.name, 'status', o.status,
      'invite_code', o.invite_code, 'invite_code_student', o.invite_code_student,
      'invite_code_teacher', NULL, 'invite_code_admin', NULL,
      'created_at', o.created_at
    ) INTO v_result FROM organisations o WHERE o.id = p_org_id;
  END IF;
  
  RETURN v_result;
END;
$$;

-- 3. FIX: user_credits UPDATE - remove direct client UPDATE entirely
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- 4. FIX: student_marks - students only see their own
DROP POLICY IF EXISTS "Org members can read student_marks" ON public.student_marks;

CREATE POLICY "Students can read own marks"
ON public.student_marks FOR SELECT TO authenticated
USING (student_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Staff can read all org marks"
ON public.student_marks FOR SELECT TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'teacher')
);

-- 5. FIX: student_promotions - students only see their own
DROP POLICY IF EXISTS "Org members can read promotions" ON public.student_promotions;

CREATE POLICY "Students can read own promotions"
ON public.student_promotions FOR SELECT TO authenticated
USING (student_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Admins can read all org promotions"
ON public.student_promotions FOR SELECT TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);
