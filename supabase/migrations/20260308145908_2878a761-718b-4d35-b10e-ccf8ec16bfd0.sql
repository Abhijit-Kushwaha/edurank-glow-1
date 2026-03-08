
-- Create a SECURITY DEFINER function for Super Admin/Admin to change member roles
CREATE OR REPLACE FUNCTION public.set_member_role(p_target_user_id uuid, p_new_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
  v_target_org uuid;
  v_target_current_role text;
BEGIN
  -- Get caller info
  SELECT role, org_id INTO v_caller_role, v_caller_org
  FROM public.profiles WHERE user_id = auth.uid();

  -- Get target info
  SELECT role, org_id INTO v_target_current_role, v_target_org
  FROM public.profiles WHERE user_id = p_target_user_id;

  -- Must be in the same org
  IF v_caller_org IS NULL OR v_caller_org IS DISTINCT FROM v_target_org THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in the same organization');
  END IF;

  -- Validate new role
  IF p_new_role NOT IN ('admin', 'teacher', 'student', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Cannot change own role
  IF p_target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change your own role');
  END IF;

  -- Role hierarchy enforcement
  IF v_caller_role = 'super_admin' THEN
    -- Super admin can set any role
    NULL;
  ELSIF v_caller_role = 'admin' THEN
    -- Admin cannot set super_admin or change other admins/super_admins
    IF p_new_role = 'super_admin' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only Super Admins can assign Super Admin role');
    END IF;
    IF v_target_current_role IN ('super_admin', 'admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot modify users with equal or higher role');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Update the role
  UPDATE public.profiles
  SET role = p_new_role, updated_at = now()
  WHERE user_id = p_target_user_id;

  RETURN jsonb_build_object('success', true, 'new_role', p_new_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text) TO authenticated;

-- Create a function to get org members with their stats (for admin/teacher view)
CREATE OR REPLACE FUNCTION public.get_org_members_with_stats(p_org_id uuid)
RETURNS TABLE(
  user_id uuid,
  profile_id uuid,
  name text,
  email text,
  avatar_url text,
  role text,
  status text,
  total_xp integer,
  level integer,
  streak integer,
  total_quizzes bigint,
  average_score numeric,
  last_activity date,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
BEGIN
  -- Verify caller has permission
  SELECT p.role, p.org_id INTO v_caller_role, v_caller_org
  FROM public.profiles p WHERE p.user_id = auth.uid();

  IF v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Not in this organization';
  END IF;

  IF v_caller_role NOT IN ('super_admin', 'admin', 'teacher') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT 
    pr.user_id,
    pr.id as profile_id,
    pr.name,
    pr.email,
    pr.avatar_url,
    pr.role,
    pr.status,
    pr.total_xp,
    pr.level,
    pr.streak,
    COALESCE(ls.total_quizzes, 0)::bigint as total_quizzes,
    COALESCE(ls.average_score, 0)::numeric as average_score,
    ls.last_activity_date as last_activity,
    pr.created_at
  FROM public.profiles pr
  LEFT JOIN public.leaderboard_stats ls ON ls.user_id = pr.user_id
  WHERE pr.org_id = p_org_id
  ORDER BY 
    CASE pr.role 
      WHEN 'super_admin' THEN 0 
      WHEN 'admin' THEN 1 
      WHEN 'teacher' THEN 2 
      WHEN 'student' THEN 3 
      ELSE 4 
    END, pr.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_members_with_stats(uuid) TO authenticated;

-- Create a function to get detailed student progress
CREATE OR REPLACE FUNCTION public.get_student_progress(p_student_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
  v_student_org uuid;
  v_result jsonb;
BEGIN
  SELECT p.role, p.org_id INTO v_caller_role, v_caller_org
  FROM public.profiles p WHERE p.user_id = auth.uid();

  SELECT p.org_id INTO v_student_org
  FROM public.profiles p WHERE p.user_id = p_student_user_id;

  IF v_caller_org IS DISTINCT FROM v_student_org THEN
    RAISE EXCEPTION 'Not in the same organization';
  END IF;

  IF v_caller_role NOT IN ('super_admin', 'admin', 'teacher') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'name', pr.name,
        'email', pr.email,
        'total_xp', pr.total_xp,
        'level', pr.level,
        'streak', pr.streak,
        'rank', pr.rank,
        'consistency_score', pr.consistency_score,
        'created_at', pr.created_at
      ) FROM public.profiles pr WHERE pr.user_id = p_student_user_id
    ),
    'quiz_stats', (
      SELECT jsonb_build_object(
        'total_quizzes', COALESCE(ls.total_quizzes, 0),
        'total_correct', COALESCE(ls.total_correct, 0),
        'total_questions', COALESCE(ls.total_questions, 0),
        'average_score', COALESCE(ls.average_score, 0),
        'best_score', COALESCE(ls.best_score, 0),
        'current_streak', COALESCE(ls.current_streak, 0),
        'longest_streak', COALESCE(ls.longest_streak, 0)
      ) FROM public.leaderboard_stats ls WHERE ls.user_id = p_student_user_id
    ),
    'recent_quizzes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'score', qr.score,
        'total_questions', qr.total_questions,
        'correct_answers', qr.correct_answers,
        'difficulty', qr.difficulty,
        'created_at', qr.created_at
      ) ORDER BY qr.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.quiz_results WHERE user_id = p_student_user_id ORDER BY created_at DESC LIMIT 20) qr
    ),
    'topic_mastery', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'topic_name', t.name,
        'quizzes_completed', tm.quizzes_completed,
        'average_score', tm.average_score,
        'best_score', tm.best_score
      )), '[]'::jsonb)
      FROM public.topic_mastery tm
      JOIN public.topics t ON t.id = tm.topic_id
      WHERE tm.user_id = p_student_user_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_progress(uuid) TO authenticated;
