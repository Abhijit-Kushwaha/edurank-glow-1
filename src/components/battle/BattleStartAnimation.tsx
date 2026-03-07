import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Swords } from "lucide-react";

interface BattleStartAnimationProps {
  player1Name: string;
  player2Name: string;
  onComplete: () => void;
}

export default function BattleStartAnimation({ player1Name, player2Name, onComplete }: BattleStartAnimationProps) {
  const [phase, setPhase] = useState<"players" | "countdown" | "start">("players");
  const [count, setCount] = useState(3);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("countdown"), 1800);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      setPhase("start");
      setTimeout(onComplete, 1200);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />

      <div className="relative z-10 text-center space-y-6">
        <AnimatePresence mode="wait">
          {phase === "players" && (
            <motion.div
              key="players"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-6"
            >
              {/* Player 1 */}
              <motion.div
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <Avatar className="h-20 w-20 border-4 border-primary shadow-[0_0_25px_hsl(var(--primary)/0.5)]">
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                    {player1Name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-lg font-bold">{player1Name}</span>
              </motion.div>

              {/* VS */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.5 }}
                className="flex flex-col items-center"
              >
                <div className="h-14 w-14 rounded-full bg-destructive/20 flex items-center justify-center shadow-[0_0_30px_hsl(var(--destructive)/0.4)]">
                  <Swords className="h-7 w-7 text-destructive" />
                </div>
                <span className="text-xs font-bold text-muted-foreground mt-1">VS</span>
              </motion.div>

              {/* Player 2 */}
              <motion.div
                initial={{ x: 200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <Avatar className="h-20 w-20 border-4 border-secondary shadow-[0_0_25px_hsl(var(--secondary)/0.5)]">
                  <AvatarFallback className="bg-secondary/20 text-secondary text-2xl font-bold">
                    {player2Name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-lg font-bold">{player2Name}</span>
              </motion.div>
            </motion.div>
          )}

          {phase === "countdown" && (
            <motion.div
              key={`count-${count}`}
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="text-8xl font-bold bg-gradient-to-b from-primary to-secondary bg-clip-text text-transparent"
              style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.5)" }}
            >
              {count}
            </motion.div>
          )}

          {phase === "start" && (
            <motion.div
              key="start"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="space-y-2"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: 2, duration: 0.3 }}
                className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent"
              >
                🔥 QUIZ START 🔥
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
