import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  base_xp_reward: number;
  bonus_multiplier: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface UserDailyChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  challenge_date: string;
  current_value: number;
  target_value: number;
  is_completed: boolean;
  completed_at: string | null;
  xp_earned: number;
  expires_at: string;
  challenge?: DailyChallenge;
}

export const useDailyChallenges = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<UserDailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // First, try to assign daily challenges (will return existing if already assigned)
      const { data: assignedData, error: assignError } = await supabase
        .rpc('assign_daily_challenges', { p_user_id: user.id });

      if (assignError) {
        console.error('Error assigning challenges:', assignError);
      }

      // Fetch user's daily challenges with challenge details
      const today = new Date().toISOString().split('T')[0];
      const { data: userChallenges, error: fetchError } = await supabase
        .from('user_daily_challenges')
        .select(`
          *,
          challenge:daily_challenges(*)
        `)
        .eq('user_id', user.id)
        .eq('challenge_date', today)
        .order('is_completed', { ascending: true });

      if (fetchError) throw fetchError;

      // Transform the data to match our interface
      const transformedChallenges = (userChallenges || []).map((uc: any) => ({
        ...uc,
        challenge: uc.challenge as DailyChallenge,
      }));

      setChallenges(transformedChallenges);
    } catch (error) {
      console.error('Error fetching daily challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getTimeRemaining = useCallback(() => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const diff = endOfDay.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, totalMs: diff };
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Subscribe to realtime updates for challenge progress
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('daily-challenges')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_daily_challenges',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchChallenges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChallenges]);

  const completedCount = challenges.filter(c => c.is_completed).length;
  const totalXpEarned = challenges.reduce((sum, c) => sum + (c.xp_earned || 0), 0);

  return {
    challenges,
    loading,
    completedCount,
    totalCount: challenges.length,
    totalXpEarned,
    getTimeRemaining,
    refetch: fetchChallenges,
  };
};

export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'text-green-500 bg-green-500/10 border-green-500/30';
    case 'medium':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    case 'hard':
      return 'text-red-500 bg-red-500/10 border-red-500/30';
    default:
      return 'text-muted-foreground bg-muted/10 border-border/30';
  }
};

export const getChallengeIcon = (challengeType: string) => {
  switch (challengeType) {
    case 'quiz_count':
      return 'FileQuestion';
    case 'questions_answered':
      return 'HelpCircle';
    case 'perfect_quiz':
      return 'Star';
    case 'speed_quiz':
      return 'Zap';
    case 'quiz_score':
      return 'Target';
    default:
      return 'Trophy';
  }
};
