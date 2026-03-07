-- Fix mutable search_path on get_week_start
CREATE OR REPLACE FUNCTION public.get_week_start(d date DEFAULT CURRENT_DATE)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT (d - EXTRACT(DOW FROM d)::INTEGER + 1)::DATE
$function$;

-- Fix mutable search_path on create_profile_on_signup
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, streak_protections)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;