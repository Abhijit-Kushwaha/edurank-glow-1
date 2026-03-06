import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Brain } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
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

export default function BattleLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("battle_leaderboard")
        .select("*")
        .order("brain_points", { ascending: false })
        .limit(10);
      if (data) setEntries(data as unknown as LeaderboardEntry[]);
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Brain Warriors Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">Global</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <LeaderboardList entries={entries} loading={loading} sortKey="brain_points" />
          </TabsContent>
          <TabsContent value="weekly">
            <LeaderboardList entries={entries} loading={loading} sortKey="brain_points" />
          </TabsContent>
          <TabsContent value="daily">
            <LeaderboardList entries={entries} loading={loading} sortKey="brain_points" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function LeaderboardList({ entries, loading, sortKey }: { entries: LeaderboardEntry[]; loading: boolean; sortKey: string }) {
  if (loading) return <p className="text-center text-muted-foreground text-sm py-4">Loading...</p>;
  if (entries.length === 0) return <p className="text-center text-muted-foreground text-sm py-4">No battles yet. Be the first!</p>;

  return (
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
  );
}
