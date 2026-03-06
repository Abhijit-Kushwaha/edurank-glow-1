import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";

interface Player {
  user_id: string;
  display_name: string;
  score: number;
}

interface BattleScoreboardProps {
  players: Player[];
  currentUserId?: string;
}

export default function BattleScoreboard({ players, currentUserId }: BattleScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const leader = sorted[0];

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        {sorted.map((p, i) => {
          const isYou = p.user_id === currentUserId;
          const isLeader = p.user_id === leader?.user_id && p.score > 0;

          return (
            <motion.div
              key={p.user_id}
              className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                isYou ? "bg-primary/10 border border-primary/20" : ""
              }`}
              layout
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={`text-xs font-bold ${isYou ? "bg-primary/20 text-primary" : "bg-muted"}`}>
                    {p.display_name[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1">
                    {p.display_name}
                    {isYou && <span className="text-[10px] text-muted-foreground">(You)</span>}
                    {isLeader && <Crown className="h-3 w-3 text-yellow-400" />}
                  </p>
                </div>
              </div>
              <motion.span
                key={p.score}
                className="font-mono font-bold text-lg"
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
              >
                {p.score}
              </motion.span>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
