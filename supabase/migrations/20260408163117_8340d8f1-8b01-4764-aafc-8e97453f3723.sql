
-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON public.friendships;

-- Recreate with proper WITH CHECK constraint
CREATE POLICY "Users can update friendships they're part of"
  ON public.friendships FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR (auth.uid() = friend_id))
  WITH CHECK (
    -- Only the recipient (friend_id) can accept/reject
    (status IN ('accepted', 'rejected') AND auth.uid() = friend_id)
    OR
    -- Only sender can cancel
    (status = 'pending' AND auth.uid() = user_id)
  );
