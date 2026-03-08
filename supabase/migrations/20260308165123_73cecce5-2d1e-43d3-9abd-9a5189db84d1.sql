
-- Add more achievements for students
INSERT INTO public.achievements (name, description, category, tier, icon, requirement_type, requirement_value, reward_type, reward_value, sort_order, is_hidden)
VALUES
  -- Progress achievements
  ('First Steps', 'Complete your first quiz', 'progress', 'bronze', 'rocket', 'quizzes_completed', 1, 'xp_bonus', '{"amount": 50}', 1, false),
  ('Quiz Enthusiast', 'Complete 25 quizzes', 'progress', 'silver', 'flame', 'quizzes_completed', 25, 'xp_bonus', '{"amount": 200}', 5, false),
  ('Quiz Champion', 'Complete 100 quizzes', 'progress', 'gold', 'crown', 'quizzes_completed', 100, 'xp_bonus', '{"amount": 500}', 8, false),
  ('Quiz Legend', 'Complete 500 quizzes', 'progress', 'diamond', 'gem', 'quizzes_completed', 500, 'xp_bonus', '{"amount": 2000}', 12, false),
  
  -- Consistency achievements
  ('Getting Started', 'Maintain a 3-day streak', 'consistency', 'bronze', 'zap', 'streak_days', 3, 'xp_bonus', '{"amount": 30}', 2, false),
  ('Week Warrior', 'Maintain a 7-day streak', 'consistency', 'silver', 'calendar', 'streak_days', 7, 'xp_bonus', '{"amount": 100}', 6, false),
  ('Monthly Master', 'Maintain a 30-day streak', 'consistency', 'gold', 'trophy', 'streak_days', 30, 'xp_bonus', '{"amount": 500}', 9, false),
  ('Unstoppable', 'Maintain a 100-day streak', 'consistency', 'diamond', 'star', 'streak_days', 100, 'xp_bonus', '{"amount": 2500}', 13, false),
  ('Year of Learning', 'Maintain a 365-day streak', 'consistency', 'diamond', 'award', 'streak_days', 365, 'xp_bonus', '{"amount": 10000}', 20, true),
  
  -- Accuracy achievements
  ('Sharpshooter', 'Score 100% on a quiz', 'accuracy', 'bronze', 'target', 'perfect_score', 100, 'xp_bonus', '{"amount": 75}', 3, false),
  ('Triple Perfect', 'Get 3 perfect scores', 'accuracy', 'silver', 'award', 'perfect_count', 3, 'xp_bonus', '{"amount": 200}', 7, false),
  ('Perfectionist', 'Get 10 perfect scores', 'accuracy', 'gold', 'medal', 'perfect_count', 10, 'xp_bonus', '{"amount": 750}', 10, false),
  ('Flawless Machine', 'Get 50 perfect scores', 'accuracy', 'diamond', 'sparkles', 'perfect_count', 50, 'xp_bonus', '{"amount": 3000}', 14, false),
  ('Brain Surgeon', 'Maintain 90%+ average over 20 quizzes', 'accuracy', 'gold', 'brain', 'sustained_accuracy', 90, 'xp_bonus', '{"amount": 1000}', 11, false),
  
  -- Mastery achievements
  ('Note Taker', 'Create 5 AI notes', 'mastery', 'bronze', 'book-open', 'notes_created', 5, 'xp_bonus', '{"amount": 50}', 4, false),
  ('Scholar', 'Create 25 AI notes', 'mastery', 'silver', 'graduation-cap', 'notes_created', 25, 'xp_bonus', '{"amount": 250}', 15, false),
  ('Knowledge Seeker', 'Create 100 AI notes', 'mastery', 'gold', 'library', 'notes_created', 100, 'xp_bonus', '{"amount": 1000}', 16, false),
  
  -- Special / Hidden achievements
  ('Night Owl', 'Complete a quiz after midnight', 'special', 'silver', 'moon', 'quizzes_completed', 1, 'xp_bonus', '{"amount": 150}', 17, true),
  ('Early Bird', 'Complete a quiz before 6 AM', 'special', 'silver', 'sunrise', 'quizzes_completed', 1, 'xp_bonus', '{"amount": 150}', 18, true),
  ('Achievement Hunter', 'Unlock 10 achievements', 'special', 'gold', 'trophy', 'achievements_unlocked', 10, 'xp_bonus', '{"amount": 500}', 19, false),
  ('Collector', 'Unlock 20 achievements', 'special', 'diamond', 'gem', 'achievements_unlocked', 20, 'xp_bonus', '{"amount": 2000}', 21, true)
ON CONFLICT DO NOTHING;

-- Add anti-cheat columns to student_quiz_attempts
ALTER TABLE public.student_quiz_attempts
  ADD COLUMN IF NOT EXISTS tab_switches integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copy_events integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimize_events integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anti_cheat_log jsonb DEFAULT '[]'::jsonb;

-- Add lock_screen option to org_quizzes
ALTER TABLE public.org_quizzes
  ADD COLUMN IF NOT EXISTS lock_screen boolean DEFAULT false;
