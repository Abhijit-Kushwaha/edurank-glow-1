
-- Fix 1: Update SECURITY DEFINER functions to use empty search_path (best practice)

CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  week_start_date DATE;
BEGIN
  week_start_date := public.get_week_start(CURRENT_DATE);
  
  UPDATE public.weekly_study_goals
  SET current_value = current_value + 1,
      updated_at = now(),
      is_completed = CASE WHEN current_value + 1 >= target_value THEN TRUE ELSE is_completed END,
      completed_at = CASE WHEN current_value + 1 >= target_value AND NOT is_completed THEN now() ELSE completed_at END
  WHERE user_id = NEW.user_id
    AND goal_type = 'quizzes'
    AND week_start = week_start_date
    AND NOT is_completed;

  UPDATE public.weekly_study_goals
  SET current_value = current_value + NEW.total_questions,
      updated_at = now(),
      is_completed = CASE WHEN current_value + NEW.total_questions >= target_value THEN TRUE ELSE is_completed END,
      completed_at = CASE WHEN current_value + NEW.total_questions >= target_value AND NOT is_completed THEN now() ELSE completed_at END
  WHERE user_id = NEW.user_id
    AND goal_type = 'questions'
    AND week_start = week_start_date
    AND NOT is_completed;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_daily_challenges(p_user_id uuid)
RETURNS SETOF public.user_daily_challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_expires TIMESTAMP WITH TIME ZONE := (v_today + 1)::TIMESTAMP WITH TIME ZONE;
  v_challenge RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_daily_challenges WHERE user_id = p_user_id AND challenge_date = v_today) THEN
    RETURN QUERY SELECT * FROM public.user_daily_challenges WHERE user_id = p_user_id AND challenge_date = v_today;
    RETURN;
  END IF;

  FOR v_challenge IN 
    SELECT * FROM public.daily_challenges 
    WHERE is_active = true 
    ORDER BY random() 
    LIMIT 3
  LOOP
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, challenge_date, target_value, expires_at)
    VALUES (p_user_id, v_challenge.id, v_today, v_challenge.target_value, v_expires);
  END LOOP;

  RETURN QUERY SELECT * FROM public.user_daily_challenges WHERE user_id = p_user_id AND challenge_date = v_today;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_daily_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_challenge RECORD;
  v_user_challenge RECORD;
  v_new_value INTEGER;
  v_xp_earned INTEGER;
  v_base_xp INTEGER;
  v_bonus_mult NUMERIC;
BEGIN
  FOR v_user_challenge IN 
    SELECT udc.*, dc.challenge_type, dc.base_xp_reward, dc.bonus_multiplier
    FROM public.user_daily_challenges udc
    JOIN public.daily_challenges dc ON dc.id = udc.challenge_id
    WHERE udc.user_id = NEW.user_id 
      AND udc.challenge_date = v_today 
      AND udc.is_completed = false
      AND udc.expires_at > now()
  LOOP
    v_new_value := v_user_challenge.current_value;
    v_base_xp := v_user_challenge.base_xp_reward;
    v_bonus_mult := v_user_challenge.bonus_multiplier;

    CASE v_user_challenge.challenge_type
      WHEN 'quiz_count' THEN
        v_new_value := v_new_value + 1;
      WHEN 'questions_answered' THEN
        v_new_value := v_new_value + NEW.correct_answers;
      WHEN 'perfect_quiz' THEN
        IF NEW.score = 100 THEN
          v_new_value := v_new_value + 1;
        END IF;
      WHEN 'speed_quiz' THEN
        IF NEW.time_taken_seconds IS NOT NULL AND NEW.time_taken_seconds <= v_user_challenge.target_value THEN
          v_new_value := v_new_value + 1;
        END IF;
      WHEN 'quiz_score' THEN
        IF NEW.score >= 80 THEN
          v_new_value := v_new_value + 1;
        END IF;
      ELSE
        v_new_value := v_new_value;
    END CASE;

    IF v_new_value >= v_user_challenge.target_value AND NOT v_user_challenge.is_completed THEN
      v_xp_earned := FLOOR(v_base_xp * (1 + (NEW.score / 100) * (v_bonus_mult - 1)));
      
      UPDATE public.user_daily_challenges
      SET current_value = v_new_value,
          is_completed = true,
          completed_at = now(),
          xp_earned = v_xp_earned,
          updated_at = now()
      WHERE id = v_user_challenge.id;

      UPDATE public.profiles
      SET total_xp = total_xp + v_xp_earned,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE public.user_daily_challenges
      SET current_value = v_new_value,
          updated_at = now()
      WHERE id = v_user_challenge.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 2: Update rate_limit_logs INSERT policy to allow authenticated users
DROP POLICY IF EXISTS "Service role can insert rate limit logs" ON public.rate_limit_logs;
DROP POLICY IF EXISTS "Users can insert their own rate limit logs" ON public.rate_limit_logs;

CREATE POLICY "Users can insert their own rate limit logs"
ON public.rate_limit_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
