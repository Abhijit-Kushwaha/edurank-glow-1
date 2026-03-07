import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import BattleTimer from "./BattleTimer";

interface BattleQuestionProps {
  questionText: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (selectedAnswer: number, timeTaken: number) => void;
  isPaused?: boolean;
  disabled?: boolean;
}

const optionLabels = ["A", "B", "C", "D"];

export default function BattleQuestion({
  questionText,
  options,
  correctAnswer,
  timeLimit,
  questionIndex,
  totalQuestions,
  onAnswer,
  isPaused = false,
  disabled = false,
}: BattleQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [startTime] = useState(Date.now());

  const handleSelect = (index: number) => {
    if (selected !== null || disabled) return;
    const timeTaken = (Date.now() - startTime) / 1000;
    setSelected(index);
    setShowResult(true);

    setTimeout(() => {
      onAnswer(index, timeTaken);
    }, 1500);
  };

  const handleTimeUp = () => {
    if (selected !== null || disabled) return;
    setSelected(-1);
    setShowResult(true);
    setTimeout(() => {
      onAnswer(-1, timeLimit);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-semibold">
          Question {questionIndex + 1} / {totalQuestions}
        </span>
        <BattleTimer
          duration={timeLimit}
          onTimeUp={handleTimeUp}
          isPaused={isPaused || showResult}
        />
      </div>

      {/* Question */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold leading-relaxed">{questionText}</h3>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence>
          {options.map((option, i) => {
            const isCorrect = i === correctAnswer;
            const isSelected = i === selected;
            let variant: "default" | "outline" | "destructive" | "secondary" = "outline";
            let extraClass = "hover:border-primary/50";

            if (showResult) {
              if (isCorrect) {
                extraClass = "border-green-500 bg-green-500/10 text-green-400";
              } else if (isSelected && !isCorrect) {
                extraClass = "border-destructive bg-destructive/10 text-destructive";
              } else {
                extraClass = "opacity-50";
              }
            }

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Button
                  variant="outline"
                  className={`w-full h-auto py-4 px-4 text-left justify-start gap-3 text-sm font-medium transition-all ${extraClass}`}
                  onClick={() => handleSelect(i)}
                  disabled={selected !== null}
                >
                  <span className="h-7 w-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
                    {showResult && isCorrect ? <Check className="h-4 w-4" /> :
                     showResult && isSelected && !isCorrect ? <X className="h-4 w-4" /> :
                     optionLabels[i]}
                  </span>
                  <span className="flex-1">{option}</span>
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
