import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBattle } from "@/hooks/useBattle";
import CreateBattleDialog from "@/components/battle/CreateBattleDialog";
import JoinBattleDialog from "@/components/battle/JoinBattleDialog";
import BattleCard from "@/components/battle/BattleCard";
import BattleLeaderboard from "@/components/battle/BattleLeaderboard";
import { Swords, Zap, Trophy, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function BattleArena() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, createBattle, joinBattle } = useBattle();
  const [activeBattles, setActiveBattles] = useState<any[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBattles = async () => {
      const { data } = await supabase
        .from("battles")
        .select("*")
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setActiveBattles(data);
        // Fetch player counts
        const counts: Record<string, number> = {};
        for (const b of data) {
          const { count } = await supabase
            .from("battle_players")
            .select("*", { count: "exact", head: true })
            .eq("battle_id", b.id);
          counts[b.id] = count || 0;
        }
        setPlayerCounts(counts);
      }
    };

    fetchBattles();

    // Realtime for new battles
    const channel = supabase
      .channel("arena-battles")
      .on("postgres_changes", { event: "*", schema: "public", table: "battles" }, () => {
        fetchBattles();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreateBattle = async (config: any) => {
    const battle = await createBattle({
      subject: config.subject,
      difficulty: config.difficulty,
      numQuestions: config.numQuestions,
      source: config.source,
      maxPlayers: config.maxPlayers,
    });
    if (battle) {
      navigate(`/battle/${battle.id}`);
    }
    return battle;
  };

  const handleJoinBattle = async (code: string) => {
    const battle = await joinBattle(code);
    if (battle) {
      navigate(`/battle/${battle.id}`);
    }
    return battle;
  };

  const handleJoinById = async (battleId: string) => {
    const battle = activeBattles.find((b) => b.id === battleId);
    if (battle) {
      const result = await joinBattle(battle.battle_code);
      if (result) navigate(`/battle/${battleId}`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl gradient-bg mx-auto">
          <Swords className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Battle <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Arena</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Challenge friends, battle strangers, earn Brain Points. Who's the smartest?
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <CreateBattleDialog onCreateBattle={handleCreateBattle} loading={loading} />
        <JoinBattleDialog onJoinBattle={handleJoinBattle} loading={loading} />
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Battles */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Active Battles
          </h2>
          {activeBattles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No active battles. Create one!
            </div>
          ) : (
            <div className="space-y-2">
              {activeBattles.map((b) => (
                <BattleCard
                  key={b.id}
                  id={b.id}
                  subject={b.subject}
                  difficulty={b.difficulty}
                  status={b.status}
                  battleCode={b.battle_code}
                  playerCount={playerCounts[b.id] || 0}
                  onJoin={handleJoinById}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <BattleLeaderboard />
        </motion.div>
      </div>
    </div>
  );
}
