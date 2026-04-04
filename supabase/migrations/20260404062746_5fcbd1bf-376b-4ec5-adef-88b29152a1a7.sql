
-- 1. Revoke SELECT on correct_answer column from battle_questions for authenticated users
-- The submit-battle-answer edge function uses service_role_key so it's unaffected
REVOKE SELECT (correct_answer) ON public.battle_questions FROM authenticated;
REVOKE SELECT (correct_answer) ON public.battle_questions FROM anon;

-- 2. Revoke SELECT on token column from invites for authenticated users
-- Tokens should only be compared server-side
REVOKE SELECT (token) ON public.invites FROM authenticated;
REVOKE SELECT (token) ON public.invites FROM anon;

-- 3. Add RLS policies for the video storage bucket
-- Read: authenticated users can view videos
CREATE POLICY "Authenticated users can read videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'video');

-- Upload: authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'video' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Update: users can update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'video' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Delete: users can delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'video' AND (auth.uid())::text = (storage.foldername(name))[1]);
