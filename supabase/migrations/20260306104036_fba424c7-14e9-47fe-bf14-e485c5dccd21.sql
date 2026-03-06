
-- Battles table
CREATE TABLE public.battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  subject text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  num_questions integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'waiting',
  battle_code text UNIQUE NOT NULL,
  current_question integer NOT NULL DEFAULT 0,
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- Battle players
CREATE TABLE public.battle_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT 'Player',
  score integer NOT NULL DEFAULT 0,
  is_ready boolean NOT NULL DEFAULT false,
  power_ups jsonb NOT NULL DEFAULT '{"time_freeze": 1, "hint_vision": 1, "double_points": 1}'::jsonb,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id)
);

-- Battle questions
CREATE TABLE public.battle_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer integer NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  order_index integer NOT NULL DEFAULT 0,
  time_limit integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Battle answers
CREATE TABLE public.battle_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.battle_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  selected_answer integer,
  is_correct boolean NOT NULL DEFAULT false,
  time_taken_seconds numeric NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  streak_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(battle_id, question_id, user_id)
);

-- Battle leaderboard
CREATE TABLE public.battle_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT 'Player',
  total_wins integer NOT NULL DEFAULT 0,
  total_losses integer NOT NULL DEFAULT 0,
  total_battles integer NOT NULL DEFAULT 0,
  win_streak integer NOT NULL DEFAULT 0,
  best_win_streak integer NOT NULL DEFAULT 0,
  brain_points integer NOT NULL DEFAULT 0,
  weekly_points integer NOT NULL DEFAULT 0,
  daily_points integer NOT NULL DEFAULT 0,
  last_battle_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Brain points log
CREATE TABLE public.brain_points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  battle_id uuid REFERENCES public.battles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_points_log ENABLE ROW LEVEL SECURITY;

-- Battles policies
CREATE POLICY "Authenticated can view battles" ON public.battles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create battles" ON public.battles FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator can update battle" ON public.battles FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

-- Battle players policies
CREATE POLICY "Participants can view battle players" ON public.battle_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join battles" ON public.battle_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update own record" ON public.battle_players FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Battle questions policies
CREATE POLICY "Battle participants can view questions" ON public.battle_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.battle_players bp WHERE bp.battle_id = battle_questions.battle_id AND bp.user_id = auth.uid()));
CREATE POLICY "Creator can insert questions" ON public.battle_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.battles b WHERE b.id = battle_id AND b.creator_id = auth.uid()));

-- Battle answers policies
CREATE POLICY "Participants can view answers" ON public.battle_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.battle_players bp WHERE bp.battle_id = battle_answers.battle_id AND bp.user_id = auth.uid()));
CREATE POLICY "Users can submit answers" ON public.battle_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Battle leaderboard policies
CREATE POLICY "Authenticated can view battle leaderboard" ON public.battle_leaderboard FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own leaderboard" ON public.battle_leaderboard FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leaderboard" ON public.battle_leaderboard FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Brain points log policies
CREATE POLICY "Users can view own brain points" ON public.brain_points_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brain points" ON public.brain_points_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_answers;
