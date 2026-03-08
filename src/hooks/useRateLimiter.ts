import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

const rateLimitCache = new Map<string, RateLimitState>();

export const useRateLimiter = () => {
  const { user } = useAuth();
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  // Fetch credits on mount / user change
  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      const { data } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .single();
      if (data) setCreditsRemaining(data.credits_remaining);
    };
    fetchCredits();
  }, [user]);

  const refreshCredits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();
    if (data) setCreditsRemaining(data.credits_remaining);
  }, [user]);

  const checkRateLimit = useCallback((): boolean => {
    if (!user) return false;

    const now = Date.now();
    const key = user.id;
    const state = rateLimitCache.get(key);

    if (!state || now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitCache.set(key, { requestCount: 1, windowStart: now });
      setIsRateLimited(false);
      return true;
    }

    if (state.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      setIsRateLimited(true);
      const remainingTime = Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (now - state.windowStart)) / 1000,
      );
      toast.error(
        `Rate limit exceeded. Please wait ${remainingTime}s before trying again.`,
      );
      return false;
    }

    state.requestCount++;
    rateLimitCache.set(key, state);
    setIsRateLimited(false);
    return true;
  }, [user]);

  const canMakeRequest = useCallback(async (): Promise<boolean> => {
    return checkRateLimit();
  }, [checkRateLimit]);

  /**
   * Handle edge function errors — call after invoking an edge function.
   * Returns true if an error was handled (caller should abort).
   */
  const handleApiError = useCallback((error: any, data: any): boolean => {
    // Check for 402 insufficient credits from edge function response
    if (data?.error && typeof data.error === "string" && data.error.includes("Insufficient credits")) {
      toast.error(data.error);
      refreshCredits();
      return true;
    }
    if (error?.message?.includes("402")) {
      toast.error("Insufficient credits. Check your profile for details.");
      refreshCredits();
      return true;
    }
    return false;
  }, [refreshCredits]);

  return {
    isRateLimited,
    checkRateLimit,
    canMakeRequest,
    creditsRemaining,
    refreshCredits,
    handleApiError,
  };
};
