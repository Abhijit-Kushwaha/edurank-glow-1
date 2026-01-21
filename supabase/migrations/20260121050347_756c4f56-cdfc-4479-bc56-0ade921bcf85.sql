-- Create table for daily challenge templates
CREATE TABLE public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'quiz_score', 'quiz_count', 'questions_answered', 'perfect_quiz', 'speed_quiz'
  target_value INTEGER NOT NULL,
  base_xp_reward INTEGER NOT NULL DEFAULT 50,
  bonus_multiplier NUMERIC NOT NULL DEFAULT 1.5, -- Multiplier for exceeding target
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user daily challenge progress
CREATE TABLE public.user_daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_value INTEGER NOT NULL DEFAULT 0,
  target_value INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  xp_earned INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id, challenge_date)
);

-- Enable RLS
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for daily_challenges (read-only for authenticated users)
CREATE POLICY "Authenticated users can view active challenges"
ON public.daily_challenges
FOR SELECT
USING (is_active = true);

-- Policies for user_daily_challenges
CREATE POLICY "Users can view their own daily challenges"
ON public.user_daily_challenges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily challenges"
ON public.user_daily_challenges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily challenges"
ON public.user_daily_challenges
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updating timestamps
CREATE TRIGGER update_user_daily_challenges_updated_at
BEFORE UPDATE ON public.user_daily_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default daily challenge templates
INSERT INTO public.daily_challenges (title, description, challenge_type, target_value, base_xp_reward, bonus_multiplier, difficulty) VALUES
('Quiz Champion', 'Complete 3 quizzes today', 'quiz_count', 3, 75, 1.5, 'easy'),
('Knowledge Seeker', 'Answer 20 questions correctly', 'questions_answered', 20, 100, 1.5, 'medium'),
('Perfectionist', 'Score 100% on any quiz', 'perfect_quiz', 1, 150, 2.0, 'hard'),
('Speed Demon', 'Complete a quiz in under 2 minutes', 'speed_quiz', 120, 100, 1.5, 'medium'),
('High Achiever', 'Score at least 80% on 2 quizzes', 'quiz_score', 2, 125, 1.5, 'medium'),
('Study Marathon', 'Answer 50 questions total', 'questions_answered', 50, 200, 2.0, 'hard');

-- Function to assign daily challenges to a user
CREATE OR REPLACE FUNCTION public.assign_daily_challenges(p_user_id UUID)
RETURNS SETOF public.user_daily_challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_expires TIMESTAMP WITH TIME ZONE := (v_today + 1)::TIMESTAMP WITH TIME ZONE;
  v_challenge RECORD;
BEGIN
  -- Check if user already has challenges for today
  IF EXISTS (SELECT 1 FROM user_daily_challenges WHERE user_id = p_user_id AND challenge_date = v_today) THEN
    -- Return existing challenges
    RETURN QUERY SELECT * FROM user_daily_challenges WHERE user_id = p_user_id AND challenge_date = v_today;
    RETURN;
  END IF;

  -- Assign 3 random challenges for today
  FOR v_challenge IN 
    SELECT * FROM daily_challenges 
    WHERE is_active = true 
    ORDER BY random() 
    LIMIT 3
  LOOP
    INSERT INTO user_daily_challenges (user_id, challenge_id, challenge_date, target_value, expires_at)
    VALUES (p_user_id, v_challenge.id, v_today, v_challenge.target_value, v_expires);
  END LOOP;

  RETURN QUERY SELECT * FROM user_daily_challenges WHERE user_id = p_user_id AND challenge_date = v_today;
END;
$$;

-- Function to update challenge progress after quiz completion
CREATE OR REPLACE FUNCTION public.update_daily_challenge_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_challenge RECORD;
  v_user_challenge RECORD;
  v_new_value INTEGER;
  v_xp_earned INTEGER;
  v_base_xp INTEGER;
  v_bonus_mult NUMERIC;
BEGIN
  -- Get all active user challenges for today
  FOR v_user_challenge IN 
    SELECT udc.*, dc.challenge_type, dc.base_xp_reward, dc.bonus_multiplier
    FROM user_daily_challenges udc
    JOIN daily_challenges dc ON dc.id = udc.challenge_id
    WHERE udc.user_id = NEW.user_id 
      AND udc.challenge_date = v_today 
      AND udc.is_completed = false
      AND udc.expires_at > now()
  LOOP
    v_new_value := v_user_challenge.current_value;
    v_base_xp := v_user_challenge.base_xp_reward;
    v_bonus_mult := v_user_challenge.bonus_multiplier;

    -- Update based on challenge type
    CASE v_user_challenge.challenge_type
      WHEN 'quiz_count' THEN
        v_new_value := v_new_value + 1;
      WHEN 'questions_answered' THEN
        v_new_value := v_new_value + NEW.correct_answers;
      WHEN 'perfect_quiz' THEN
        IF NEW.score = 100 THEN
          v_new_value := v_new_value + 1;
        END IF;
      WHEN 'speed_quiz' THEN
        IF NEW.time_taken_seconds IS NOT NULL AND NEW.time_taken_seconds <= v_user_challenge.target_value THEN
          v_new_value := v_new_value + 1;
        END IF;
      WHEN 'quiz_score' THEN
        IF NEW.score >= 80 THEN
          v_new_value := v_new_value + 1;
        END IF;
      ELSE
        v_new_value := v_new_value;
    END CASE;

    -- Check if challenge is now completed
    IF v_new_value >= v_user_challenge.target_value AND NOT v_user_challenge.is_completed THEN
      -- Calculate XP earned (base + bonus based on quiz score)
      v_xp_earned := FLOOR(v_base_xp * (1 + (NEW.score / 100) * (v_bonus_mult - 1)));
      
      UPDATE user_daily_challenges
      SET current_value = v_new_value,
          is_completed = true,
          completed_at = now(),
          xp_earned = v_xp_earned,
          updated_at = now()
      WHERE id = v_user_challenge.id;

      -- Award XP to user profile
      UPDATE profiles
      SET total_xp = total_xp + v_xp_earned,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE user_daily_challenges
      SET current_value = v_new_value,
          updated_at = now()
      WHERE id = v_user_challenge.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on quiz_results to update daily challenges
CREATE TRIGGER update_daily_challenges_on_quiz
AFTER INSERT ON public.quiz_results
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_challenge_progress();