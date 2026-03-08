-- Make user_id nullable on rate_limit_logs for unauthenticated operations (e.g. forgot-password)
-- Also drop the FK constraint to auth.users so nil/null UUIDs don't cause silent failures

-- First drop the FK constraint if it exists
ALTER TABLE public.rate_limit_logs ALTER COLUMN user_id DROP NOT NULL;

-- Drop FK to auth.users if present (the constraint name may vary, so use a DO block)
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'rate_limit_logs'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.rate_limit_logs DROP CONSTRAINT %I', fk_name);
  END IF;
END$$;