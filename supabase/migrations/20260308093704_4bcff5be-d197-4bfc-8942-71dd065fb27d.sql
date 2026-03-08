
-- FIX 1: Profiles - restrict anonymous access
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can search profiles by name" ON public.profiles;

-- Recreate with proper authenticated-only access
CREATE POLICY "Authenticated users can search profiles by name"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- FIX 2: Invites - restrict anonymous enumeration of tokens/emails
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.invites;

-- Replace with a server-side lookup approach - only allow authenticated users to read their own invites by email
CREATE POLICY "Authenticated users can read invites for their email"
ON public.invites FOR SELECT TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- FIX 3: User achievements - remove direct INSERT, force through server function
DROP POLICY IF EXISTS "Users can unlock achievements" ON public.user_achievements;

-- FIX 4: Battle leaderboard - remove user-facing UPDATE
DROP POLICY IF EXISTS "Users can update own leaderboard" ON public.battle_leaderboard;

-- FIX 5: Brain points log - remove user-facing INSERT
DROP POLICY IF EXISTS "Users can insert own brain points" ON public.brain_points_log;
