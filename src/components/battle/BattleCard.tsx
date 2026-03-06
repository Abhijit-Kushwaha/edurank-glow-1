import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swords, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface BattleCardProps {
  id: string;
  subject: string;
  difficulty: string;
  status: string;
  battleCode: string;
  playerCount: number;
  onJoin: (id: string) => void;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
  adaptive: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const statusColors: Record<string, string> = {
  waiting: "bg-primary/20 text-primary border-primary/30",
  active: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-muted text-muted-foreground border-border",
};

export default function BattleCard({ id, subject, difficulty, status, battleCode, playerCount, onJoin }: BattleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="border-border/50 hover:border-primary/30 transition-all">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center">
              <Swords className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">{subject}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-[10px] ${difficultyColors[difficulty] || ""}`}>
                  {difficulty}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${statusColors[status] || ""}`}>
                  {status}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {playerCount}/2
                </span>
              </div>
            </div>
          </div>
          {status === "waiting" && (
            <Button size="sm" variant="outline" onClick={() => onJoin(id)} className="gap-1">
              Join <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          {status === "active" && (
            <Badge className="bg-orange-500/20 text-orange-400 animate-pulse">LIVE</Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
