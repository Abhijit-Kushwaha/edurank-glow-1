
-- Fix 1: Lock identity/privilege fields in profiles UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND total_xp = (SELECT p.total_xp FROM public.profiles p WHERE p.user_id = auth.uid())
  AND xp_multiplier = (SELECT p.xp_multiplier FROM public.profiles p WHERE p.user_id = auth.uid())
  AND streak_protections = (SELECT p.streak_protections FROM public.profiles p WHERE p.user_id = auth.uid())
  AND unlocked_modes IS NOT DISTINCT FROM (SELECT p.unlocked_modes FROM public.profiles p WHERE p.user_id = auth.uid())
  AND profile_highlights IS NOT DISTINCT FROM (SELECT p.profile_highlights FROM public.profiles p WHERE p.user_id = auth.uid())
  AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  AND org_id IS NOT DISTINCT FROM (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid())
  AND status = (SELECT p.status FROM public.profiles p WHERE p.user_id = auth.uid())
  AND is_independent = (SELECT p.is_independent FROM public.profiles p WHERE p.user_id = auth.uid())
  AND department_id IS NOT DISTINCT FROM (SELECT p.department_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Fix 2: Add caller check to consume_credits function
CREATE OR REPLACE FUNCTION public.consume_credits(uid uuid, amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_credits integer;
  last_reset timestamp with time zone;
BEGIN
  -- Verify the caller owns this credit account
  IF uid IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  -- Validate amount
  IF amount < 1 OR amount > 50 THEN
    RETURN false;
  END IF;

  -- Ensure user has a credit record
  INSERT INTO public.user_credits (user_id, credits_remaining, credits_used, last_reset_at)
  VALUES (uid, 50, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current credits and last reset
  SELECT credits_remaining, last_reset_at INTO current_credits, last_reset
  FROM public.user_credits
  WHERE user_id = uid;

  -- Check if a month has passed since last reset
  IF last_reset IS NULL OR (now() - last_reset) >= interval '30 days' THEN
    UPDATE public.user_credits
    SET credits_remaining = 50, credits_used = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = uid;
    current_credits := 50;
  END IF;

  -- Check if enough credits
  IF current_credits < amount THEN
    RETURN false;
  END IF;

  -- Consume credits atomically
  UPDATE public.user_credits
  SET credits_remaining = credits_remaining - amount, credits_used = credits_used + amount, updated_at = now()
  WHERE user_id = uid;

  RETURN true;
END;
$$;
