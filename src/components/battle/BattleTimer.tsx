import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface BattleTimerProps {
  duration: number;
  onTimeUp: () => void;
  isPaused?: boolean;
  key?: string;
}

export default function BattleTimer({ duration, onTimeUp, isPaused = false }: BattleTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (isPaused) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(intervalRef.current);
          onTimeUp();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [duration, isPaused, onTimeUp]);

  const percentage = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 3;

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center">
        <span className={`font-mono text-sm font-bold ${isUrgent ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
          {timeLeft.toFixed(1)}s
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${isUrgent ? "bg-destructive" : "gradient-bg"}`}
          initial={{ width: "100%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
}
