
-- 1. Replace the profiles UPDATE policy to restrict system fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND total_xp = (SELECT p.total_xp FROM public.profiles p WHERE p.user_id = auth.uid())
  AND xp_multiplier = (SELECT p.xp_multiplier FROM public.profiles p WHERE p.user_id = auth.uid())
  AND streak_protections = (SELECT p.streak_protections FROM public.profiles p WHERE p.user_id = auth.uid())
  AND unlocked_modes = (SELECT p.unlocked_modes FROM public.profiles p WHERE p.user_id = auth.uid())
  AND profile_highlights = (SELECT p.profile_highlights FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 2. SECURITY DEFINER function for streak protection changes
CREATE OR REPLACE FUNCTION public.use_streak_protection(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_protections integer;
BEGIN
  -- Verify caller is the owner
  IF p_user_id != auth.uid() THEN
    RETURN false;
  END IF;

  SELECT streak_protections INTO current_protections
  FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;

  IF current_protections IS NULL OR current_protections <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET streak_protections = streak_protections - 1, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- 3. SECURITY DEFINER function for adding streak protections (from achievements)
CREATE OR REPLACE FUNCTION public.add_streak_protection(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id != auth.uid() THEN
    RETURN false;
  END IF;

  IF p_amount < 1 OR p_amount > 5 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET streak_protections = streak_protections + p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- 4. Add validation to quiz_results INSERT policy
-- Require that a quiz exists for the todo_id and belongs to the user,
-- and that score matches the correct_answers/total_questions ratio
DROP POLICY IF EXISTS "Users can create their own quiz results" ON public.quiz_results;

CREATE POLICY "Users can create their own quiz results"
ON public.quiz_results FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND total_questions > 0
  AND total_questions <= 50
  AND correct_answers >= 0
  AND correct_answers <= total_questions
  AND score = ROUND((correct_answers::numeric / total_questions) * 100, 1)
  AND EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.todo_id = quiz_results.todo_id
    AND q.user_id = auth.uid()
  )
);
