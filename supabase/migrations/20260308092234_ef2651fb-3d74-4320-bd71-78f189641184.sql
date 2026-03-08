-- Add max_players column to battles table (default 2 for backward compatibility)
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS max_players integer NOT NULL DEFAULT 2;

-- Allow battle creator to delete their completed battles
CREATE POLICY "Creator can delete completed battles"
ON public.battles FOR DELETE TO authenticated
USING (auth.uid() = creator_id AND status = 'completed');