import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const emojis = [
  { emoji: "🔥", label: "Nice" },
  { emoji: "😎", label: "Easy" },
  { emoji: "🤯", label: "Mind blown" },
  { emoji: "😂", label: "LOL" },
  { emoji: "💀", label: "Brutal" },
  { emoji: "⚡", label: "Too slow" },
  { emoji: "🏆", label: "Winning" },
];

const quickMessages = [
  "Too slow!",
  "Focus bro!",
  "That was easy 😎",
  "Lucky guess 😂",
  "You got this!",
  "I'm winning 🏆",
];

export interface FloatingReaction {
  id: string;
  content: string;
  isEmoji: boolean;
  senderName: string;
}

interface BattleReactionsProps {
  onSendReaction: (content: string, isEmoji: boolean) => void;
  floatingReactions: FloatingReaction[];
  disabled?: boolean;
}

export default function BattleReactions({ onSendReaction, floatingReactions, disabled }: BattleReactionsProps) {
  const [cooldown, setCooldown] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const handleSend = useCallback((content: string, isEmoji: boolean) => {
    if (cooldown || disabled) return;
    onSendReaction(content, isEmoji);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);
  }, [cooldown, disabled, onSendReaction]);

  return (
    <>
      {/* Floating Reactions Display */}
      <div className="fixed top-20 right-4 z-40 space-y-2 pointer-events-none">
        <AnimatePresence>
          {floatingReactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: 60, scale: 0.5 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.8 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="bg-card border border-border/50 rounded-2xl px-3 py-2 shadow-lg text-sm max-w-48"
            >
              <span className="text-[10px] font-semibold text-muted-foreground block">{r.senderName}</span>
              <span className={r.isEmoji ? "text-2xl" : "text-xs font-medium"}>{r.content}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction Panel */}
      <div className="space-y-2">
        {/* Emoji Row */}
        <div className="flex gap-1 flex-wrap justify-center">
          {emojis.map((e) => (
            <Button
              key={e.emoji}
              variant="outline"
              size="sm"
              onClick={() => handleSend(e.emoji, true)}
              disabled={cooldown || disabled}
              className="h-8 w-8 p-0 text-base hover:scale-110 transition-transform"
              title={e.label}
            >
              {e.emoji}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMessages(!showMessages)}
            className="h-8 w-8 p-0"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Quick Messages */}
        <AnimatePresence>
          {showMessages && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5 flex-wrap justify-center">
                {quickMessages.map((msg) => (
                  <Button
                    key={msg}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(msg, false)}
                    disabled={cooldown || disabled}
                    className="text-[10px] h-6 px-2"
                  >
                    {msg}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {cooldown && (
          <p className="text-[10px] text-center text-muted-foreground">Cooldown...</p>
        )}
      </div>
    </>
  );
}
