-- Add video_id column to recommendation_queue for AI-curated videos
ALTER TABLE public.recommendation_queue 
ADD COLUMN video_id text;

-- Add video_title column for display
ALTER TABLE public.recommendation_queue 
ADD COLUMN video_title text;

-- Add video_channel column for display
ALTER TABLE public.recommendation_queue 
ADD COLUMN video_channel text;