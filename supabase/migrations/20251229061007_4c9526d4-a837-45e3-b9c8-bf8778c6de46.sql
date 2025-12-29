-- Create todos table
CREATE TABLE public.todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_id TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on todos
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- RLS policies for todos
CREATE POLICY "Users can view their own todos" ON public.todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own todos" ON public.todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own todos" ON public.todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own todos" ON public.todos FOR DELETE USING (auth.uid() = user_id);

-- Create video_progress table
CREATE TABLE public.video_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  progress_percent NUMERIC NOT NULL DEFAULT 0,
  last_position_seconds NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, todo_id)
);

-- Enable RLS on video_progress
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_progress
CREATE POLICY "Users can view their own video progress" ON public.video_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own video progress" ON public.video_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own video progress" ON public.video_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own video progress" ON public.video_progress FOR DELETE USING (auth.uid() = user_id);

-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for notes
CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- Create quiz_results table
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quiz_results
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_results
CREATE POLICY "Users can view their own quiz results" ON public.quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own quiz results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quiz results" ON public.quiz_results FOR DELETE USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_video_progress_updated_at BEFORE UPDATE ON public.video_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();