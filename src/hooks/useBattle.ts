import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function generateBattleCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export interface BattleConfig {
  subject: string;
  difficulty: string;
  numQuestions: number;
}

export function useBattle() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const createBattle = useCallback(async (config: BattleConfig) => {
    if (!user) return null;
    setLoading(true);
    try {
      const battleCode = generateBattleCode();
      const { data: battle, error } = await supabase
        .from("battles")
        .insert({
          creator_id: user.id,
          subject: config.subject,
          difficulty: config.difficulty,
          num_questions: config.numQuestions,
          battle_code: battleCode,
        })
        .select()
        .single();

      if (error) throw error;

      // Join as player
      await supabase.from("battle_players").insert({
        battle_id: battle.id,
        user_id: user.id,
        display_name: profile?.name || "Player",
      });

      // Generate questions via edge function
      const { error: fnError } = await supabase.functions.invoke("generate-battle-questions", {
        body: {
          subject: config.subject,
          difficulty: config.difficulty,
          numQuestions: config.numQuestions,
          battleId: battle.id,
        },
      });

      if (fnError) {
        console.error("Question generation error:", fnError);
        toast.error("Failed to generate questions");
      }

      return battle;
    } catch (e: any) {
      toast.error(e.message || "Failed to create battle");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const joinBattle = useCallback(async (battleCode: string) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data: battle, error: findError } = await supabase
        .from("battles")
        .select("*")
        .eq("battle_code", battleCode.toUpperCase())
        .eq("status", "waiting")
        .single();

      if (findError || !battle) {
        toast.error("Battle not found or already started");
        return null;
      }

      // Check if already joined
      const { data: existing } = await supabase
        .from("battle_players")
        .select("id")
        .eq("battle_id", battle.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        const { error: joinError } = await supabase.from("battle_players").insert({
          battle_id: battle.id,
          user_id: user.id,
          display_name: profile?.name || "Player",
        });
        if (joinError) throw joinError;
      }

      return battle;
    } catch (e: any) {
      toast.error(e.message || "Failed to join battle");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const submitAnswer = useCallback(async (
    battleId: string,
    questionId: string,
    selectedAnswer: number,
    _isCorrect: boolean,
    timeTaken: number,
    streakCount: number,
    _pointsEarned: number,
  ) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.functions.invoke("submit-battle-answer", {
        body: { battleId, questionId, selectedAnswer, timeTaken, streakCount },
      });
      if (error) {
        console.error("Submit answer error:", error);
        toast.error("Failed to submit answer");
        return null;
      }
      return data;
    } catch (e: any) {
      console.error("Submit answer error:", e);
      return null;
    }
  }, [user]);

  const startBattle = useCallback(async (battleId: string) => {
    await supabase
      .from("battles")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", battleId);
  }, []);

  const advanceQuestion = useCallback(async (battleId: string, questionIndex: number) => {
    await supabase
      .from("battles")
      .update({ current_question: questionIndex })
      .eq("id", battleId);
  }, []);

  const endBattle = useCallback(async (battleId: string, winnerId?: string) => {
    await supabase
      .from("battles")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        winner_id: winnerId || null,
      })
      .eq("id", battleId);
  }, []);

  const awardBrainPoints = useCallback(async (amount: number, reason: string, battleId?: string) => {
    if (!user) return;
    // Brain points are now awarded server-side via submit-battle-answer
    // This function is kept for API compatibility but is a no-op
    console.log("Brain points award requested (handled server-side):", { amount, reason, battleId });
  }, [user]);

  return {
    loading,
    createBattle,
    joinBattle,
    submitAnswer,
    startBattle,
    advanceQuestion,
    endBattle,
    awardBrainPoints,
  };
}
