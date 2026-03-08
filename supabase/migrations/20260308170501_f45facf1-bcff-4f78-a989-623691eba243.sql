
-- 6. FIX: Leaderboard INSERT - restrict to zero-initialized values only
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.leaderboard_stats;

CREATE POLICY "Users can insert own zeroed stats"
ON public.leaderboard_stats FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND total_quizzes = 0
  AND total_correct = 0
  AND total_questions = 0
  AND average_score = 0
  AND best_score = 0
  AND current_streak = 0
  AND longest_streak = 0
);

DROP POLICY IF EXISTS "Users can insert own leaderboard" ON public.battle_leaderboard;

CREATE POLICY "Users can insert own zeroed battle stats"
ON public.battle_leaderboard FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND brain_points = 0
  AND total_battles = 0
  AND total_wins = 0
  AND total_losses = 0
  AND win_streak = 0
  AND best_win_streak = 0
  AND daily_points = 0
  AND weekly_points = 0
);
