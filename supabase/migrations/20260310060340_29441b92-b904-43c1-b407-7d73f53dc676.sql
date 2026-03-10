-- Fix circular RLS on battle_players: use battles table instead of self-reference
DROP POLICY IF EXISTS "Battle participants can view players" ON public.battle_players;
CREATE POLICY "Battle participants can view players"
  ON public.battle_players FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.battles b
      WHERE b.id = battle_players.battle_id
      AND (b.creator_id = auth.uid() OR b.status IN ('waiting', 'active'))
    )
  );

-- Fix battle_questions: reference battles table directly instead of battle_players
DROP POLICY IF EXISTS "Battle participants can view questions" ON public.battle_questions;
CREATE POLICY "Battle participants can view questions"
  ON public.battle_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.battles b
      WHERE b.id = battle_questions.battle_id
      AND (b.creator_id = auth.uid() OR b.status IN ('waiting', 'active', 'completed'))
    )
  );

-- Fix battle_answers: reference battles table directly instead of battle_players
DROP POLICY IF EXISTS "Participants can view answers" ON public.battle_answers;
CREATE POLICY "Participants can view answers"
  ON public.battle_answers FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.battles b
      WHERE b.id = battle_answers.battle_id
      AND (b.creator_id = auth.uid() OR b.status IN ('active', 'completed'))
    )
  );