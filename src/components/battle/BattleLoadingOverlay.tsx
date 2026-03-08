import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BattleLoadingOverlayProps {
  show: boolean;
  message: string;
  subMessage?: string;
}

export default function BattleLoadingOverlay({ show, message, subMessage }: BattleLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center gap-4 p-8 rounded-2xl glass-card border border-primary/20 max-w-sm mx-4 text-center"
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-full gradient-bg flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            <div>
              <p className="font-bold text-lg">{message}</p>
              {subMessage && (
                <p className="text-sm text-muted-foreground mt-1">{subMessage}</p>
              )}
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
