CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits_remaining, credits_used)
  VALUES (NEW.id, 100, 0);
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create credits for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_reset_credits(uid uuid)
 RETURNS TABLE(credits_remaining integer, credits_used integer, was_reset boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_last_reset timestamp with time zone;
  v_was_reset boolean := false;
BEGIN
  SELECT uc.last_reset_at INTO v_last_reset
  FROM public.user_credits uc
  WHERE uc.user_id = uid;
  
  IF v_last_reset IS NOT NULL AND v_last_reset < now() - interval '1 month' THEN
    UPDATE public.user_credits uc
    SET credits_remaining = 100,
        credits_used = 0,
        last_reset_at = now(),
        updated_at = now()
    WHERE uc.user_id = uid;
    v_was_reset := true;
  END IF;
  
  RETURN QUERY
  SELECT uc.credits_remaining, uc.credits_used, v_was_reset
  FROM public.user_credits uc
  WHERE uc.user_id = uid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_credits(uid uuid, amount integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_credits integer;
  last_reset timestamp with time zone;
BEGIN
  IF uid IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  IF amount < 1 OR amount > 100 THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_credits (user_id, credits_remaining, credits_used, last_reset_at)
  VALUES (uid, 100, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT uc.credits_remaining, uc.last_reset_at INTO current_credits, last_reset
  FROM public.user_credits uc
  WHERE uc.user_id = uid;

  IF last_reset IS NULL OR (now() - last_reset) >= interval '30 days' THEN
    UPDATE public.user_credits
    SET credits_remaining = 100, credits_used = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = uid;
    current_credits := 100;
  END IF;

  IF current_credits < amount THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET credits_remaining = credits_remaining - amount, credits_used = credits_used + amount, updated_at = now()
  WHERE user_id = uid;

  RETURN true;
END;
$function$;