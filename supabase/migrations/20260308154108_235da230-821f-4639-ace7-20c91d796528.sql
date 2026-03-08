
-- Add org_id to battles table for org-scoped battles
ALTER TABLE public.battles ADD COLUMN org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL;

-- Create org battle leaderboard table
CREATE TABLE public.org_battle_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT 'Player',
  total_wins integer NOT NULL DEFAULT 0,
  total_losses integer NOT NULL DEFAULT 0,
  total_battles integer NOT NULL DEFAULT 0,
  win_streak integer NOT NULL DEFAULT 0,
  best_win_streak integer NOT NULL DEFAULT 0,
  brain_points integer NOT NULL DEFAULT 0,
  weekly_points integer NOT NULL DEFAULT 0,
  last_battle_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Enable RLS
ALTER TABLE public.org_battle_leaderboard ENABLE ROW LEVEL SECURITY;

-- Org members can view their org leaderboard
CREATE POLICY "Org members can view org battle leaderboard"
  ON public.org_battle_leaderboard FOR SELECT
  TO authenticated
  USING (org_id = get_user_org_id(auth.uid()));

-- Users can insert own leaderboard entry
CREATE POLICY "Users can insert own org battle leaderboard"
  ON public.org_battle_leaderboard FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id(auth.uid()));

-- Index for fast org queries
CREATE INDEX idx_battles_org_id ON public.battles(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_org_battle_leaderboard_org_points ON public.org_battle_leaderboard(org_id, brain_points DESC);

-- Enable realtime for org battle leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_battle_leaderboard;
