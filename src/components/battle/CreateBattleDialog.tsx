import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Swords, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { motion } from "framer-motion";
import BattleSourceSelector, { type BattleSource } from "./BattleSourceSelector";

const difficulties = [
  { value: "easy", label: "Easy", emoji: "🟢" },
  { value: "medium", label: "Medium", emoji: "🟡" },
  { value: "hard", label: "Hard", emoji: "🔴" },
  { value: "adaptive", label: "Adaptive AI", emoji: "🤖" },
];
const questionCounts = [5, 7, 10];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 50;

interface CreateBattleDialogProps {
  onCreateBattle: (config: {
    subject: string;
    difficulty: string;
    numQuestions: number;
    source: BattleSource;
    maxPlayers: number;
  }) => Promise<any>;
  loading: boolean;
}

export default function CreateBattleDialog({ onCreateBattle, loading }: CreateBattleDialogProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<BattleSource>({ type: "custom_topic" });
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(2);

  const getSubjectLabel = () => {
    switch (source.type) {
      case "custom_topic": return source.customTopic || "Custom Topic";
      case "my_notes": return "Notes Battle";
      case "my_videos": return "Video Battle";
      case "ai_mixed": return "AI Mixed";
    }
  };

  const isValid = () => {
    if (source.type === "custom_topic" && !source.customTopic?.trim()) return false;
    if (source.type === "my_notes" && !source.noteId) return false;
    if (source.type === "my_videos" && !source.videoId) return false;
    return true;
  };

  const handleCreate = async () => {
    if (loading) return;
    const result = await onCreateBattle({
      subject: getSubjectLabel(),
      difficulty,
      numQuestions,
      source,
      maxPlayers,
    });
    if (result) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button size="lg" className="gap-2 gradient-bg text-primary-foreground font-bold text-lg px-8 py-6 rounded-xl shadow-lg">
            <Swords className="h-5 w-5" />
            Create Battle
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-5 w-5 text-primary" />
            Create Battle Arena
          </DialogTitle>
          <DialogDescription>
            Configure your battle settings including source, difficulty level, and number of questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Battle Source */}
          <BattleSourceSelector value={source} onChange={setSource} />

          {/* Number of Players */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Number of Players (2–50)</Label>
            <Input
              type="number"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={maxPlayers}
              onChange={(e) => {
                const v = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Number(e.target.value) || MIN_PLAYERS));
                setMaxPlayers(v);
              }}
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Difficulty</Label>
            <RadioGroup value={difficulty} onValueChange={setDifficulty} className="grid grid-cols-2 gap-2">
              {difficulties.map((d) => (
                <div key={d.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={d.value} id={d.value} />
                  <Label htmlFor={d.value} className="cursor-pointer text-sm">
                    {d.emoji} {d.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Questions */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Questions</Label>
            <div className="flex gap-2">
              {questionCounts.map((n) => (
                <Button
                  key={n}
                  variant={numQuestions === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNumQuestions(n)}
                  className="flex-1"
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={loading || !isValid()}
            className="w-full gradient-bg text-primary-foreground font-bold py-3"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Swords className="h-4 w-4 mr-2" />}
            {loading ? "Creating Arena..." : "Launch Battle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
