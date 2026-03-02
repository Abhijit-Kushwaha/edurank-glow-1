
-- Fix 1: Drop overly permissive invite code policy
DROP POLICY IF EXISTS "Authenticated users can read invite codes by code" ON public.friend_invite_codes;

-- Fix 2: Create rate_limit_logs table for rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  operation text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT NULL,
  ip_address text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_operation_created 
  ON public.rate_limit_logs (user_id, operation, created_at DESC);

-- Auto-cleanup old logs (keep 7 days)
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at 
  ON public.rate_limit_logs (created_at);

-- Enable RLS
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own logs
CREATE POLICY "Users can insert their own rate limit logs"
  ON public.rate_limit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own logs
CREATE POLICY "Users can view their own rate limit logs"
  ON public.rate_limit_logs FOR SELECT
  USING (auth.uid() = user_id);
