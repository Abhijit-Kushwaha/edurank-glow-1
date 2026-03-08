import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, GripVertical, Plus, CheckCircle, XCircle } from "lucide-react";

export type QuestionType = "mcq" | "true_false" | "fill_blank" | "short_answer";

export interface ManualQuestion {
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: any; // number for mcq/tf, string for fill_blank/short_answer
  explanation: string;
  difficulty: string;
  points: number;
}

export const EMPTY_QUESTION: ManualQuestion = {
  question_text: "",
  question_type: "mcq",
  options: ["", "", "", ""],
  correct_answer: 0,
  explanation: "",
  difficulty: "medium",
  points: 1,
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  true_false: "True / False",
  fill_blank: "Fill in the Blank",
  short_answer: "Short Answer",
};

interface QuestionEditorProps {
  question: ManualQuestion;
  index: number;
  onChange: (index: number, question: ManualQuestion) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export default function QuestionEditor({ question, index, onChange, onRemove, canRemove }: QuestionEditorProps) {
  const update = (field: keyof ManualQuestion, value: any) => {
    onChange(index, { ...question, [field]: value });
  };

  const updateOption = (optIndex: number, value: string) => {
    const opts = [...question.options];
    opts[optIndex] = value;
    onChange(index, { ...question, options: opts });
  };

  const addOption = () => {
    if (question.options.length < 6) {
      onChange(index, { ...question, options: [...question.options, ""] });
    }
  };

  const removeOption = (optIndex: number) => {
    if (question.options.length <= 2) return;
    const opts = question.options.filter((_, i) => i !== optIndex);
    const newCorrect = question.correct_answer >= opts.length ? 0 : question.correct_answer;
    onChange(index, { ...question, options: opts, correct_answer: newCorrect });
  };

  const handleTypeChange = (type: QuestionType) => {
    let newQ = { ...question, question_type: type };
    if (type === "true_false") {
      newQ.options = ["True", "False"];
      newQ.correct_answer = 0;
    } else if (type === "mcq") {
      if (question.options.length < 2) newQ.options = ["", "", "", ""];
      newQ.correct_answer = 0;
    } else if (type === "fill_blank") {
      newQ.options = [];
      newQ.correct_answer = "";
    } else if (type === "short_answer") {
      newQ.options = [];
      newQ.correct_answer = "";
    }
    onChange(index, newQ);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3 relative group">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
        <Badge variant="secondary" className="text-[10px] font-mono">Q{index + 1}</Badge>

        <Select value={question.question_type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
          <SelectTrigger className="w-[140px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={question.difficulty} onValueChange={(v) => update("difficulty", v)}>
          <SelectTrigger className="w-[90px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">🟢 Easy</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="hard">🔴 Hard</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <Label className="text-[10px] text-muted-foreground">Pts</Label>
          <Input
            type="number"
            value={question.points}
            onChange={(e) => update("points", Math.max(1, Number(e.target.value)))}
            className="w-14 h-7 text-xs"
            min={1}
            max={100}
          />
        </div>

        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onRemove(index)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {/* Question Text */}
      <Textarea
        value={question.question_text}
        onChange={(e) => update("question_text", e.target.value)}
        placeholder={question.question_type === "fill_blank"
          ? "Enter question with ___ for the blank (e.g., The capital of France is ___)"
          : "Enter your question..."}
        rows={2}
        className="text-sm"
      />

      {/* Options - MCQ */}
      {question.question_type === "mcq" && (
        <div className="space-y-2">
          {question.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update("correct_answer", oi)}
                className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-bold transition-all ${
                  question.correct_answer === oi
                    ? "border-green-500 bg-green-500/20 text-green-600"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                }`}
                title="Mark as correct"
              >
                {question.correct_answer === oi ? <CheckCircle className="h-4 w-4" /> : String.fromCharCode(65 + oi)}
              </button>
              <Input
                value={opt}
                onChange={(e) => updateOption(oi, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                className="h-8 text-xs flex-1"
              />
              {question.options.length > 2 && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => removeOption(oi)}>
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          {question.options.length < 6 && (
            <Button variant="ghost" size="sm" onClick={addOption} className="text-xs h-7">
              <Plus className="h-3 w-3 mr-1" /> Add Option
            </Button>
          )}
        </div>
      )}

      {/* Options - True/False */}
      {question.question_type === "true_false" && (
        <div className="flex gap-3">
          {["True", "False"].map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => update("correct_answer", i)}
              className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                question.correct_answer === i
                  ? "border-green-500 bg-green-500/10 text-green-600"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Fill in the Blank */}
      {question.question_type === "fill_blank" && (
        <div>
          <Label className="text-xs text-muted-foreground">Correct Answer</Label>
          <Input
            value={question.correct_answer || ""}
            onChange={(e) => update("correct_answer", e.target.value)}
            placeholder="Type the correct answer..."
            className="h-8 text-sm mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Case-insensitive matching will be used</p>
        </div>
      )}

      {/* Short Answer */}
      {question.question_type === "short_answer" && (
        <div>
          <Label className="text-xs text-muted-foreground">Model Answer (for teacher reference during grading)</Label>
          <Textarea
            value={question.correct_answer || ""}
            onChange={(e) => update("correct_answer", e.target.value)}
            placeholder="Type the expected answer..."
            rows={2}
            className="text-sm mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Short answers require manual grading by the teacher</p>
        </div>
      )}

      {/* Explanation */}
      <div>
        <Label className="text-xs text-muted-foreground">Explanation (shown after answering)</Label>
        <Input
          value={question.explanation}
          onChange={(e) => update("explanation", e.target.value)}
          placeholder="Why is this the correct answer?"
          className="h-8 text-xs mt-1"
        />
      </div>
    </div>
  );
}
