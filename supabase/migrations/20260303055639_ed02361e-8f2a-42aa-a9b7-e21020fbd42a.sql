
-- Create video_cache table for storing AI-evaluated video results
CREATE TABLE public.video_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_key TEXT NOT NULL,
  topic TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  video_id TEXT NOT NULL,
  quality_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  thumbnail TEXT,
  duration TEXT,
  summary TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  recommended_grade TEXT,
  subtasks_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Index on search_key for fast cache lookups
CREATE INDEX idx_video_cache_search_key ON public.video_cache (search_key);

-- Index for cache expiry cleanup
CREATE INDEX idx_video_cache_expires_at ON public.video_cache (expires_at);

-- Enable RLS
ALTER TABLE public.video_cache ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read cache
CREATE POLICY "Authenticated users can read video cache"
ON public.video_cache
FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert (edge function uses service role)
-- No INSERT policy for authenticated users since edge function uses service_role
