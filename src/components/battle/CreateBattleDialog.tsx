import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Swords, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";

const subjects = ["Math", "Physics", "Chemistry", "Biology", "Mixed"];
const difficulties = [
  { value: "easy", label: "Easy", emoji: "🟢" },
  { value: "medium", label: "Medium", emoji: "🟡" },
  { value: "hard", label: "Hard", emoji: "🔴" },
  { value: "adaptive", label: "Adaptive AI", emoji: "🤖" },
];
const questionCounts = [5, 7, 10];

interface CreateBattleDialogProps {
  onCreateBattle: (config: { subject: string; difficulty: string; numQuestions: number }) => Promise<any>;
  loading: boolean;
}

export default function CreateBattleDialog({ onCreateBattle, loading }: CreateBattleDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("Math");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);

  const handleCreate = async () => {
    const result = await onCreateBattle({ subject, difficulty, numQuestions });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-5 w-5 text-primary" />
            Create Battle Arena
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Subject</Label>
            <div className="grid grid-cols-3 gap-2">
              {subjects.map((s) => (
                <Button
                  key={s}
                  variant={subject === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSubject(s)}
                  className="text-xs"
                >
                  {s}
                </Button>
              ))}
            </div>
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
            disabled={loading}
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
