import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface StreakFreezeStatus {
  streakProtections: number;
  canUseFreeze: boolean;
  lastMissedDate: string | null;
}

export const useStreakFreeze = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [streakProtections, setStreakProtections] = useState(0);

  const fetchProtections = useCallback(async () => {
    if (!user) return 0;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("streak_protections")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setStreakProtections(profile?.streak_protections || 0);
      return profile?.streak_protections || 0;
    } catch (error) {
      console.error("Error fetching streak protections:", error);
      return 0;
    }
  }, [user]);

  const useStreakFreezeAction = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("streak_protections")
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      if (!profile || profile.streak_protections <= 0) {
        toast.error("No streak protections available!");
        return false;
      }

      const { data: result, error: rpcError } = await supabase
        .rpc("use_streak_protection", { p_user_id: user.id });

      if (rpcError) throw rpcError;
      if (!result) {
        toast.error("Failed to use streak protection");
        return false;
      }

      setStreakProtections(profile.streak_protections - 1);
      toast.success("Streak freeze activated! Your streak is protected.");
      return true;
    } catch (error) {
      console.error("Error using streak freeze:", error);
      toast.error("Failed to use streak freeze");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addStreakProtection = useCallback(
    async (amount: number = 1): Promise<boolean> => {
      if (!user) return false;

      try {
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("streak_protections")
          .eq("user_id", user.id)
          .single();

        if (fetchError) throw fetchError;

        const newAmount = (profile?.streak_protections || 0) + amount;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            streak_protections: newAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        setStreakProtections(newAmount);
        toast.success(
          `+${amount} streak protection${amount > 1 ? "s" : ""} earned!`,
        );
        return true;
      } catch (error) {
        console.error("Error adding streak protection:", error);
        return false;
      }
    },
    [user],
  );

  const checkYesterdayProgress = useCallback(async (): Promise<{
    missedDay: boolean;
    completedChallenges: number;
    totalChallenges: number;
  }> => {
    if (!user)
      return { missedDay: false, completedChallenges: 0, totalChallenges: 0 };

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const { data: challenges, error } = await supabase
        .from("user_daily_challenges")
        .select("is_completed")
        .eq("user_id", user.id)
        .eq("challenge_date", yesterdayStr);

      if (error) throw error;

      if (!challenges || challenges.length === 0) {
        return { missedDay: false, completedChallenges: 0, totalChallenges: 0 };
      }

      const completed = challenges.filter((c) => c.is_completed).length;
      const total = challenges.length;
      const missedDay = completed < total;

      return {
        missedDay,
        completedChallenges: completed,
        totalChallenges: total,
      };
    } catch (error) {
      console.error("Error checking yesterday progress:", error);
      return { missedDay: false, completedChallenges: 0, totalChallenges: 0 };
    }
  }, [user]);

  return {
    streakProtections,
    loading,
    fetchProtections,
    useStreakFreeze: useStreakFreezeAction,
    addStreakProtection,
    checkYesterdayProgress,
  };
};
