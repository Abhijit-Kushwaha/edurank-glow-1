import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

interface JoinBattleDialogProps {
  onJoinBattle: (code: string) => Promise<any>;
  loading: boolean;
}

export default function JoinBattleDialog({ onJoinBattle, loading }: JoinBattleDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  const handleJoin = async () => {
    if (!code.trim()) return;
    const result = await onJoinBattle(code.trim());
    if (result) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button size="lg" variant="outline" className="gap-2 font-bold text-lg px-8 py-6 rounded-xl border-2 border-primary/50">
            <UserPlus className="h-5 w-5" />
            Join Battle
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Join Battle
          </DialogTitle>
          <DialogDescription asChild>
            <VisuallyHidden>
              Enter the battle code provided by your friend to join the arena.
            </VisuallyHidden>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Enter Battle Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono text-center text-lg tracking-[0.3em]"
            maxLength={6}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <Button
            onClick={handleJoin}
            disabled={loading || !code.trim()}
            className="w-full gradient-bg text-primary-foreground font-bold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Joining..." : "Join Arena"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
