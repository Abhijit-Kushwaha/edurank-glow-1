import { motion, AnimatePresence } from "framer-motion";

interface ScoreAnimationProps {
  show: boolean;
  isCorrect: boolean;
  points: number;
  streakCount: number;
}

export default function ScoreAnimation({ show, isCorrect, points, streakCount }: ScoreAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none"
        >
          {isCorrect ? (
            <div className="space-y-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.4 }}
                className="text-lg font-bold text-green-400"
              >
                ✔ Correct!
              </motion.div>
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                style={{ textShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
              >
                +{points} Points
              </motion.div>
              {streakCount >= 3 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", bounce: 0.6 }}
                  className="text-sm font-bold text-orange-400"
                >
                  🔥 STREAK x{streakCount}
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div
              animate={{ x: [-5, 5, -5, 5, 0] }}
              transition={{ duration: 0.4 }}
              className="text-lg font-bold text-destructive"
            >
              ✗ Wrong Answer
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
