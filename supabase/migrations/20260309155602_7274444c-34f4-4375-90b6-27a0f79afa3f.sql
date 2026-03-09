
-- Fix 1: battle_players - restrict UPDATE to only is_ready and power_ups columns (not score)
DROP POLICY IF EXISTS "Players can update ready status" ON public.battle_players;

CREATE POLICY "Players can toggle ready status"
ON public.battle_players FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND score = (SELECT bp.score FROM public.battle_players bp WHERE bp.id = battle_players.id)
);

-- Fix 3: user_credits - remove permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- Fix 4: consume_credits - add auth.uid() ownership check
CREATE OR REPLACE FUNCTION public.consume_credits(uid uuid, amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE current_credits integer; last_reset timestamp with time zone;
BEGIN
  -- Ownership check: users can only consume their own credits
  IF uid IS DISTINCT FROM auth.uid() THEN RETURN false; END IF;
  IF amount < 1 OR amount > 50 THEN RETURN false; END IF;
  INSERT INTO public.user_credits (user_id, credits_remaining, credits_used, last_reset_at) VALUES (uid, 50, 0, now()) ON CONFLICT (user_id) DO NOTHING;
  SELECT uc.credits_remaining, uc.last_reset_at INTO current_credits, last_reset FROM public.user_credits uc WHERE uc.user_id = uid;
  IF last_reset IS NULL OR (now() - last_reset) >= interval '30 days' THEN
    UPDATE public.user_credits SET credits_remaining = 50, credits_used = 0, last_reset_at = now(), updated_at = now() WHERE user_id = uid;
    current_credits := 50;
  END IF;
  IF current_credits < amount THEN RETURN false; END IF;
  UPDATE public.user_credits SET credits_remaining = credits_remaining - amount, credits_used = credits_used + amount, updated_at = now() WHERE user_id = uid;
  RETURN true;
END; $$;
