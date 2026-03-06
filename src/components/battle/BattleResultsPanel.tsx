import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Swords, ArrowLeft, Star, Zap, Target, Flame } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface Player {
  user_id: string;
  display_name: string;
  score: number;
}

interface BattleResultsPanelProps {
  players: Player[];
  currentUserId: string;
  subject: string;
  brainPointsEarned: number;
  onGoBack: () => void;
}

export default function BattleResultsPanel({
  players,
  currentUserId,
  subject,
  brainPointsEarned,
  onGoBack,
}: BattleResultsPanelProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isWinner = winner?.user_id === currentUserId;
  const confettiFired = useRef(false);

  useEffect(() => {
    if (isWinner && !confettiFired.current) {
      confettiFired.current = true;
      const duration = 3000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [isWinner]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Victory / Defeat Banner */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="text-center space-y-2"
      >
        <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full mx-auto ${
          isWinner ? "bg-yellow-500/20" : "bg-muted"
        }`}>
          <Trophy className={`h-10 w-10 ${isWinner ? "text-yellow-400" : "text-muted-foreground"}`} />
        </div>
        <h2 className="text-3xl font-bold">
          {isWinner ? "🎉 Victory!" : "Good Fight!"}
        </h2>
        <p className="text-muted-foreground">{subject} Battle Complete</p>
      </motion.div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 gap-4">
        {sorted.map((p, i) => (
          <motion.div
            key={p.user_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.2 }}
          >
            <Card className={`text-center ${i === 0 ? "border-yellow-500/30 bg-yellow-500/5" : "border-border/50"}`}>
              <CardContent className="p-4 space-y-2">
                <Avatar className="h-12 w-12 mx-auto">
                  <AvatarFallback className={i === 0 ? "bg-yellow-500/20 text-yellow-400 font-bold" : "bg-muted"}>
                    {p.display_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">{p.display_name}</p>
                <p className="text-3xl font-bold font-mono">{p.score}</p>
                {i === 0 && <span className="text-xs text-yellow-400">👑 Winner</span>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Rewards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Rewards Earned
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="space-y-1">
                <Zap className="h-5 w-5 text-yellow-400 mx-auto" />
                <p className="font-bold text-sm">+{brainPointsEarned}</p>
                <p className="text-[10px] text-muted-foreground">Brain Points</p>
              </div>
              <div className="space-y-1">
                <Target className="h-5 w-5 text-green-400 mx-auto" />
                <p className="font-bold text-sm">{isWinner ? "+1" : "0"}</p>
                <p className="text-[10px] text-muted-foreground">Victory Badge</p>
              </div>
              <div className="space-y-1">
                <Flame className="h-5 w-5 text-orange-400 mx-auto" />
                <p className="font-bold text-sm">Updated</p>
                <p className="text-[10px] text-muted-foreground">Rank</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Button onClick={onGoBack} variant="outline" className="w-full gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Battle Arena
      </Button>
    </div>
  );
}
