/**
 * ===================================================================
 * SUPABASE COMPLETE SETUP - COPY & PASTE INTO SQL EDITOR
 * ===================================================================
 * Project: irlbqoxqgztgjezzwknm
 * This file contains ALL SQL needed to configure security
 * Execute each SECTION in order
 * ===================================================================
 */

-- ===================================================================
-- SECTION 1: CREATE TABLES
-- ===================================================================

-- Create user_unlocks table for game unlocking
CREATE TABLE IF NOT EXISTS public.user_unlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, game_id)
);

-- Create coin_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP DEFAULT now()
);

-- Add coins column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT IF NOT EXISTS coins_non_negative CHECK (coins >= 0);

-- ===================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY (RLS)
-- ===================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- SECTION 3: CREATE RLS POLICIES FOR PROFILES TABLE
-- ===================================================================

-- Allow users to view their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role to access all profiles
CREATE POLICY IF NOT EXISTS "Service role full access profiles" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================================================================
-- SECTION 4: CREATE RLS POLICIES FOR USER_UNLOCKS TABLE
-- ===================================================================

-- Allow users to view their own unlocks
CREATE POLICY IF NOT EXISTS "Users can view own unlocks" ON public.user_unlocks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to insert unlocks
CREATE POLICY IF NOT EXISTS "Service role can create unlocks" ON public.user_unlocks
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Allow service role to access all unlocks
CREATE POLICY IF NOT EXISTS "Service role full access unlocks" ON public.user_unlocks
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================================================================
-- SECTION 5: CREATE RLS POLICIES FOR COIN_TRANSACTIONS TABLE
-- ===================================================================

-- Allow users to view their own transactions
CREATE POLICY IF NOT EXISTS "Users can view own transactions" ON public.coin_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to insert transactions
CREATE POLICY IF NOT EXISTS "Service role can create transactions" ON public.coin_transactions
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Allow service role to access all transactions
CREATE POLICY IF NOT EXISTS "Service role full access transactions" ON public.coin_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================================================================
-- SECTION 6: CREATE PL/pgSQL FUNCTION - DEDUCT COINS
-- ===================================================================

CREATE OR REPLACE FUNCTION public.deduct_user_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'game_unlock',
  p_game_id TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_current_coins INTEGER;
  v_new_coins INTEGER;
BEGIN
  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Lock the user row to prevent race conditions
  SELECT coins INTO v_current_coins
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if user has sufficient coins
  IF v_current_coins < p_amount THEN
    RAISE EXCEPTION 'Insufficient coins. Have: %, Need: %', v_current_coins, p_amount;
  END IF;

  -- Deduct coins
  v_new_coins := v_current_coins - p_amount;
  UPDATE public.profiles SET coins = v_new_coins WHERE id = p_user_id;

  -- Log the transaction
  INSERT INTO public.coin_transactions (user_id, action, details)
  VALUES (
    p_user_id,
    'coin_deduction',
    jsonb_build_object(
      'amount', p_amount,
      'reason', p_reason,
      'game_id', p_game_id,
      'new_balance', v_new_coins
    )
  );

  RETURN v_new_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- SECTION 7: CREATE PL/pgSQL FUNCTION - ADD COINS
-- ===================================================================

CREATE OR REPLACE FUNCTION public.add_user_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'reward'
) RETURNS INTEGER AS $$
DECLARE
  v_new_coins INTEGER;
BEGIN
  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Lock and add coins
  UPDATE public.profiles
  SET coins = coins + p_amount
  WHERE id = p_user_id
  RETURNING coins INTO v_new_coins;

  -- Check if user exists
  IF v_new_coins IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Log the transaction
  INSERT INTO public.coin_transactions (user_id, action, details)
  VALUES (
    p_user_id,
    'coin_addition',
    jsonb_build_object(
      'amount', p_amount,
      'reason', p_reason,
      'new_balance', v_new_coins
    )
  );

  RETURN v_new_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- SECTION 8: GRANT FUNCTION PERMISSIONS
-- ===================================================================

GRANT EXECUTE ON FUNCTION public.deduct_user_coins(UUID, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_user_coins(UUID, INTEGER, TEXT) TO service_role;

-- ===================================================================
-- SECTION 9: GRANT TABLE PERMISSIONS
-- ===================================================================

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_unlocks TO service_role;
GRANT ALL ON public.coin_transactions TO service_role;

-- ===================================================================
-- SECTION 10: CREATE INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_user_unlocks_user_id ON public.user_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocks_game_id ON public.user_unlocks(game_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON public.coin_transactions(user_id);

-- ===================================================================
-- SECTION 11: VERIFICATION QUERIES (RUN THESE TO VERIFY)
-- ===================================================================

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_unlocks', 'coin_transactions')
ORDER BY tablename;

-- Verify all RLS policies
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_unlocks', 'coin_transactions')
ORDER BY tablename, policyname;

-- Verify functions exist
SELECT routine_name, routine_type FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('deduct_user_coins', 'add_user_coins')
ORDER BY routine_name;

-- Verify columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'coins';

-- Verify indexes
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('user_unlocks', 'coin_transactions')
ORDER BY tablename, indexname;

-- ===================================================================
-- SECTION 12: TEST QUERIES (OPTIONAL - VERIFY SETUP WORKS)
-- ===================================================================

-- Test 1: Get a user ID (replace with real UUID)
-- SELECT id, email, coins FROM public.profiles LIMIT 1;

-- Test 2: Try deducting coins (replace UUID with real user)
-- SELECT public.deduct_user_coins(
--   p_user_id => 'your-user-uuid-here'::uuid,
--   p_amount => 10,
--   p_reason => 'test_deduction'
-- );

-- Test 3: Check transaction was logged
-- SELECT * FROM public.coin_transactions ORDER BY timestamp DESC LIMIT 5;

-- Test 4: Check RLS works (should return only your row)
-- SELECT coins FROM public.profiles WHERE id = auth.uid();

-- ===================================================================
-- SETUP COMPLETE!
-- ===================================================================
-- 
-- All tables, RLS policies, and functions are now configured.
--
-- Next steps:
-- 1. Set SUPABASE_SERVICE_ROLE_KEY in backend .env
-- 2. Start backend: npx tsx server/index.ts
-- 3. Test API endpoints
--
-- ===================================================================
