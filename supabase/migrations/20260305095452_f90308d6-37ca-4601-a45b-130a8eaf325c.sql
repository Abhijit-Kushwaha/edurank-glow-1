
-- Fix any remaining functions with mutable search_path
-- Re-create get_rate_limit_status if it exists with proper search_path
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_rate_limit_status') THEN
    EXECUTE 'ALTER FUNCTION public.get_rate_limit_status SET search_path = ''''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_event') THEN
    EXECUTE 'ALTER FUNCTION public.log_audit_event SET search_path = ''''';
  END IF;
END;
$$;

-- Also fix update_updated_at_column which has no search_path set
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
