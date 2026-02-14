-- Update consume_credits to auto-initialize credits if missing and check for 7-day reset
CREATE OR REPLACE FUNCTION public.consume_credits(uid uuid, amount integer DEFAULT 2)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_credits integer;
  last_reset timestamp with time zone;
BEGIN
  -- First, ensure user has a credit record (auto-create if missing)
  INSERT INTO public.user_credits (user_id, credits_remaining, credits_used, last_reset_at)
  VALUES (uid, 50, 0, now())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current credits and last reset
  SELECT credits_remaining, last_reset_at INTO current_credits, last_reset
  FROM public.user_credits
  WHERE user_id = uid;
  
  -- Check if 7 days have passed since last reset - if so, reset credits
  IF last_reset IS NULL OR (now() - last_reset) >= interval '7 days' THEN
    UPDATE public.user_credits
    SET 
      credits_remaining = 50,
      credits_used = 0,
      last_reset_at = now(),
      updated_at = now()
    WHERE user_id = uid;
    
    current_credits := 50;
  END IF;
  
  -- Check if enough credits
  IF current_credits < amount THEN
    RETURN false;
  END IF;
  
  -- Consume credits atomically
  UPDATE public.user_credits
  SET 
    credits_remaining = credits_remaining - amount,
    credits_used = credits_used + amount,
    updated_at = now()
  WHERE user_id = uid;
  
  RETURN true;
END;
$$;