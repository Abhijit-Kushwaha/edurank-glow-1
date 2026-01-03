import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

const rateLimitCache = new Map<string, RateLimitState>();

export const useRateLimiter = () => {
  const { user } = useAuth();
  const [isRateLimited, setIsRateLimited] = useState(false);

  const checkRateLimit = useCallback((): boolean => {
    if (!user) return false;

    const now = Date.now();
    const key = user.id;
    const state = rateLimitCache.get(key);

    if (!state || now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
      // New window
      rateLimitCache.set(key, { requestCount: 1, windowStart: now });
      setIsRateLimited(false);
      return true;
    }

    if (state.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      setIsRateLimited(true);
      const remainingTime = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - state.windowStart)) / 1000);
      toast.error(`Rate limit exceeded. Please wait ${remainingTime}s before trying again.`);
      return false;
    }

    state.requestCount++;
    rateLimitCache.set(key, state);
    setIsRateLimited(false);
    return true;
  }, [user]);

  const consumeCredit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // First check current credits
      const { data: credits, error: fetchError } = await supabase
        .from('user_credits')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // Credits might not exist yet for existing users, create them
        if (fetchError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('user_credits')
            .insert({ user_id: user.id, credits_remaining: 100, credits_used: 0 });
          
          if (insertError) {
            console.error('Failed to create credits:', insertError);
            return true; // Allow the request anyway
          }
          return true;
        }
        console.error('Failed to fetch credits:', fetchError);
        return true; // Allow the request on error
      }

      if (credits.credits_remaining <= 0) {
        toast.error('No credits remaining. Please wait for your credits to reset.');
        return false;
      }

      // Consume a credit
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          credits_remaining: credits.credits_remaining - 1,
          credits_used: (await supabase
            .from('user_credits')
            .select('credits_used')
            .eq('user_id', user.id)
            .single()
            .then(r => r.data?.credits_used || 0)) + 1
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to consume credit:', updateError);
      }

      return true;
    } catch (error) {
      console.error('Credit consumption error:', error);
      return true; // Allow the request on error
    }
  }, [user]);

  const canMakeRequest = useCallback(async (): Promise<boolean> => {
    if (!checkRateLimit()) return false;
    return await consumeCredit();
  }, [checkRateLimit, consumeCredit]);

  return {
    isRateLimited,
    checkRateLimit,
    consumeCredit,
    canMakeRequest,
  };
};
