import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Battle {
  id: string;
  creator_id: string;
  subject: string;
  difficulty: string;
  num_questions: number;
  status: string;
  battle_code: string;
  current_question: number;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

interface BattlePlayer {
  id: string;
  battle_id: string;
  user_id: string;
  display_name: string;
  score: number;
  is_ready: boolean;
  power_ups: Record<string, number>;
  joined_at: string;
}

interface BattleAnswer {
  id: string;
  battle_id: string;
  question_id: string;
  user_id: string;
  selected_answer: number | null;
  is_correct: boolean;
  time_taken_seconds: number;
  points_earned: number;
  streak_count: number;
}

export function useBattleRealtime(battleId: string | null) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [players, setPlayers] = useState<BattlePlayer[]>([]);
  const [answers, setAnswers] = useState<BattleAnswer[]>([]);

  // Initial fetch
  useEffect(() => {
    if (!battleId) return;

    const fetchData = async () => {
      const [battleRes, playersRes, answersRes] = await Promise.all([
        supabase.from("battles").select("*").eq("id", battleId).single(),
        supabase.from("battle_players").select("*").eq("battle_id", battleId),
        supabase.from("battle_answers").select("*").eq("battle_id", battleId),
      ]);

      if (battleRes.data) setBattle(battleRes.data as unknown as Battle);
      if (playersRes.data) setPlayers(playersRes.data as unknown as BattlePlayer[]);
      if (answersRes.data) setAnswers(answersRes.data as unknown as BattleAnswer[]);
    };

    fetchData();
  }, [battleId]);

  // Realtime subscriptions
  useEffect(() => {
    if (!battleId) return;

    const channel = supabase
      .channel(`battle-${battleId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "battles",
        filter: `id=eq.${battleId}`,
      }, (payload) => {
        if (payload.new) setBattle(payload.new as unknown as Battle);
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "battle_players",
        filter: `battle_id=eq.${battleId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setPlayers((prev) => [...prev, payload.new as unknown as BattlePlayer]);
        } else if (payload.eventType === "UPDATE") {
          setPlayers((prev) =>
            prev.map((p) => (p.id === (payload.new as any).id ? payload.new as unknown as BattlePlayer : p))
          );
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "battle_answers",
        filter: `battle_id=eq.${battleId}`,
      }, (payload) => {
        setAnswers((prev) => [...prev, payload.new as unknown as BattleAnswer]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId]);

  return { battle, players, answers };
}
