
CREATE OR REPLACE FUNCTION public.assign_daily_challenges(p_user_id uuid)
 RETURNS SETOF user_daily_challenges
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_expires TIMESTAMP WITH TIME ZONE := (v_today + 1)::TIMESTAMP WITH TIME ZONE;
  v_challenge RECORD;
BEGIN
  -- Verify caller owns this account
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Users can only assign their own challenges';
  END IF;

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
