-- Add unique constraint for upsert operations on video_progress
ALTER TABLE public.video_progress 
ADD CONSTRAINT video_progress_todo_user_unique UNIQUE (todo_id, user_id);

-- Add unique constraint for upsert operations on notes
ALTER TABLE public.notes 
ADD CONSTRAINT notes_todo_user_unique UNIQUE (todo_id, user_id);