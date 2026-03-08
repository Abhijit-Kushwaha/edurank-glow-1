import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface OrgLeaderboardEntry {
  id: string;
  user_id: string;
  display_name: string;
  total_wins: number;
  brain_points: number;
  win_streak: number;
  best_win_streak: number;
  total_battles: number;
}

const rankIcons = [Crown, Medal, Trophy];
const rankColors = ["text-yellow-400", "text-gray-400", "text-amber-600"];

interface Props {
  orgId: string;
}

export default function OrgBattleLeaderboard({ orgId }: Props) {
  const [entries, setEntries] = useState<OrgLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("org_battle_leaderboard")
        .select("*")
        .eq("org_id", orgId)
        .order("brain_points", { ascending: false })
        .limit(20);
      if (data) setEntries(data as unknown as OrgLeaderboardEntry[]);
      setLoading(false);
    };
    fetchLeaderboard();

    const channel = supabase
      .channel("org-battle-lb")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "org_battle_leaderboard",
      }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  if (loading) {
    return <p className="text-center text-muted-foreground text-sm py-8">Loading leaderboard...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No org battles completed yet. Be the first to compete!
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Organization Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const RankIcon = rankIcons[i] || Trophy;
            const rankColor = rankColors[i] || "text-muted-foreground";

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg w-6 text-center ${rankColor}`}>
                    {i < 3 ? <RankIcon className="h-5 w-5" /> : i + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {entry.display_name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{entry.display_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.total_wins}W · {entry.total_battles}B · 🔥{entry.best_win_streak}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{entry.brain_points}</p>
                  <p className="text-[10px] text-muted-foreground">Brain Pts</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
