
-- Remove direct INSERT on battle_answers (now handled by submit-battle-answer edge function)
DROP POLICY IF EXISTS "Users can submit answers" ON public.battle_answers;

-- Remove direct UPDATE on battle_players score (now handled server-side)
DROP POLICY IF EXISTS "Players can update own record" ON public.battle_players;

-- Add read-only update for is_ready only (players can toggle ready status)
CREATE POLICY "Players can update ready status"
ON public.battle_players FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Remove direct INSERT on brain_points_log (now handled server-side)  
DROP POLICY IF EXISTS "Users can insert brain points" ON public.brain_points_log;

-- Remove direct UPDATE on battle_leaderboard (now handled server-side)
DROP POLICY IF EXISTS "Players can update own leaderboard" ON public.battle_leaderboard;
DROP POLICY IF EXISTS "Users can update leaderboard" ON public.battle_leaderboard;
