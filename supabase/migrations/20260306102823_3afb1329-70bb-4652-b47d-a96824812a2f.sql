
CREATE OR REPLACE FUNCTION public.check_achievements_v2(uid uuid)
 RETURNS TABLE(achievement_id uuid, achievement_name text, category text, tier text, just_unlocked boolean, progress numeric, progress_max numeric, reward_type text, reward_value jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_total_quizzes integer;
  v_current_streak integer;
  v_longest_streak integer;
  v_best_score numeric;
  v_average_score numeric;
  v_notes_count integer;
  v_perfect_scores integer;
  v_unlocked_count integer;
  v_achievement record;
  v_is_unlocked boolean;
  v_current_progress numeric;
  v_target numeric;
BEGIN
  -- Verify caller owns the uid
  IF uid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: users can only check their own achievements';
  END IF;

  SELECT ls.total_quizzes, ls.current_streak, ls.longest_streak, ls.best_score, ls.average_score
  INTO v_total_quizzes, v_current_streak, v_longest_streak, v_best_score, v_average_score
  FROM public.leaderboard_stats ls
  WHERE ls.user_id = uid;
  
  SELECT COUNT(*) INTO v_notes_count
  FROM public.notes n WHERE n.user_id = uid AND n.is_ai_generated = true;
  
  SELECT COUNT(*) INTO v_perfect_scores
  FROM public.quiz_results qr WHERE qr.user_id = uid AND qr.score = 100;
  
  SELECT COUNT(*) INTO v_unlocked_count
  FROM public.user_achievements ua WHERE ua.user_id = uid;
  
  v_total_quizzes := COALESCE(v_total_quizzes, 0);
  v_current_streak := COALESCE(v_current_streak, 0);
  v_longest_streak := COALESCE(v_longest_streak, 0);
  v_best_score := COALESCE(v_best_score, 0);
  v_average_score := COALESCE(v_average_score, 0);
  v_notes_count := COALESCE(v_notes_count, 0);
  v_perfect_scores := COALESCE(v_perfect_scores, 0);
  v_unlocked_count := COALESCE(v_unlocked_count, 0);
  
  FOR v_achievement IN 
    SELECT a.* FROM public.achievements a ORDER BY a.sort_order
  LOOP
    v_is_unlocked := EXISTS (
      SELECT 1 FROM public.user_achievements ua 
      WHERE ua.user_id = uid AND ua.achievement_id = v_achievement.id
    );
    
    v_target := v_achievement.requirement_value;
    v_current_progress := 0;
    
    CASE v_achievement.requirement_type
      WHEN 'quizzes_completed' THEN v_current_progress := v_total_quizzes;
      WHEN 'streak_days' THEN v_current_progress := GREATEST(v_current_streak, v_longest_streak);
      WHEN 'perfect_score' THEN v_current_progress := v_best_score;
      WHEN 'perfect_count' THEN v_current_progress := v_perfect_scores;
      WHEN 'notes_created' THEN v_current_progress := v_notes_count;
      WHEN 'achievements_unlocked' THEN v_current_progress := v_unlocked_count;
      WHEN 'sustained_accuracy' THEN 
        IF v_total_quizzes >= 20 THEN v_current_progress := v_average_score;
        ELSE v_current_progress := 0; END IF;
      ELSE v_current_progress := 0;
    END CASE;
    
    PERFORM public.update_achievement_progress(uid, v_achievement.id, LEAST(v_current_progress, v_target), v_target);
    
    IF NOT v_is_unlocked AND v_current_progress >= v_target THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress, progress_max)
      VALUES (uid, v_achievement.id, v_target, v_target)
      ON CONFLICT DO NOTHING;
      
      INSERT INTO public.user_rewards (user_id, achievement_id, reward_type, reward_value, expires_at)
      VALUES (
        uid, 
        v_achievement.id, 
        v_achievement.reward_type, 
        v_achievement.reward_value,
        CASE 
          WHEN v_achievement.reward_value->>'duration_hours' IS NOT NULL 
          THEN now() + ((v_achievement.reward_value->>'duration_hours')::integer * interval '1 hour')
          ELSE NULL
        END
      );
      
      IF v_achievement.reward_type = 'xp_bonus' THEN
        UPDATE public.profiles 
        SET total_xp = total_xp + (v_achievement.reward_value->>'amount')::integer
        WHERE public.profiles.user_id = uid;
      END IF;
      
      achievement_id := v_achievement.id;
      achievement_name := v_achievement.name;
      category := v_achievement.category;
      tier := v_achievement.tier;
      just_unlocked := true;
      progress := v_target;
      progress_max := v_target;
      reward_type := v_achievement.reward_type;
      reward_value := v_achievement.reward_value;
      RETURN NEXT;
    ELSE
      achievement_id := v_achievement.id;
      achievement_name := v_achievement.name;
      category := v_achievement.category;
      tier := v_achievement.tier;
      just_unlocked := false;
      progress := LEAST(v_current_progress, v_target);
      progress_max := v_target;
      reward_type := v_achievement.reward_type;
      reward_value := v_achievement.reward_value;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_achievement_progress(p_user_id uuid, p_achievement_id uuid, p_current_value numeric, p_target_value numeric, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
BEGIN
  -- Verify caller owns the account
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: users can only update their own achievement progress';
  END IF;

  INSERT INTO public.achievement_progress (user_id, achievement_id, current_value, target_value, metadata, last_updated)
  VALUES (p_user_id, p_achievement_id, p_current_value, p_target_value, p_metadata, now())
  ON CONFLICT (user_id, achievement_id) DO UPDATE SET
    current_value = EXCLUDED.current_value,
    target_value = EXCLUDED.target_value,
    metadata = EXCLUDED.metadata,
    last_updated = now();
END;
$$;
