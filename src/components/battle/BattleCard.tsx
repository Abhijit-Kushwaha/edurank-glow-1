import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swords, Users, ArrowRight, Copy, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface BattleCardProps {
  id: string;
  subject: string;
  difficulty: string;
  status: string;
  battleCode: string;
  playerCount: number;
  maxPlayers?: number;
  onJoin: (id: string) => void;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
  adaptive: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const statusConfig: Record<string, { class: string; label: string }> = {
  waiting: { class: "bg-primary/20 text-primary border-primary/30", label: "Waiting" },
  active: { class: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "In Progress" },
  completed: { class: "bg-muted text-muted-foreground border-border", label: "Completed" },
};

export default function BattleCard({ id, subject, difficulty, status, battleCode, playerCount, maxPlayers = 2, onJoin }: BattleCardProps) {
  const fillPercent = Math.min((playerCount / maxPlayers) * 100, 100);
  const isFull = playerCount >= maxPlayers;

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(battleCode);
    toast.success("Battle code copied!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="border-border/50 hover:border-primary/30 transition-all">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                <Swords className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{subject}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${difficultyColors[difficulty] || ""}`}>
                    {difficulty}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${statusConfig[status]?.class || ""}`}>
                    {statusConfig[status]?.label || status}
                  </Badge>
                  <button onClick={copyCode} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                    <Copy className="h-2.5 w-2.5" /> {battleCode}
                  </button>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {status === "waiting" && !isFull && (
                <Button size="sm" variant="outline" onClick={() => onJoin(id)} className="gap-1">
                  Join <ArrowRight className="h-3 w-3" />
                </Button>
              )}
              {status === "waiting" && isFull && (
                <Badge variant="outline" className="text-muted-foreground">Full</Badge>
              )}
              {status === "active" && (
                <Badge className="bg-orange-500/20 text-orange-400 animate-pulse">LIVE</Badge>
              )}
            </div>
          </div>

          {/* Player fill bar */}
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
            <Progress value={fillPercent} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {playerCount}/{maxPlayers}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
