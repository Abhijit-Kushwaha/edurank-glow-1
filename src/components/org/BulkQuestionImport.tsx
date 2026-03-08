import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ManualQuestion } from "./QuestionEditor";

interface BulkQuestionImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: ManualQuestion[]) => void;
}

const SAMPLE_FORMAT = `Q: What is the capital of France?
A) London
B) Paris *
C) Berlin
D) Madrid
E: Paris is the capital and largest city of France.

Q: The Earth revolves around the Sun.
Type: true_false
Answer: True
E: The Earth orbits the Sun in approximately 365.25 days.

Q: The chemical symbol for water is ___.
Type: fill_blank
Answer: H2O

Q: Explain the process of photosynthesis.
Type: short_answer
Answer: Photosynthesis is the process by which plants convert light energy into chemical energy.`;

export default function BulkQuestionImport({ open, onOpenChange, onImport }: BulkQuestionImportProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ManualQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const parseQuestions = () => {
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    const questions: ManualQuestion[] = [];
    const errs: string[] = [];

    blocks.forEach((block, bi) => {
      const lines = block.trim().split("\n").map(l => l.trim());
      if (lines.length === 0) return;

      // Extract question text
      const qLine = lines.find(l => l.startsWith("Q:") || l.startsWith("Q."));
      if (!qLine) {
        errs.push(`Block ${bi + 1}: Missing question (start with "Q:")`);
        return;
      }
      const questionText = qLine.replace(/^Q[:.]\s*/, "").trim();

      // Detect type
      const typeLine = lines.find(l => l.toLowerCase().startsWith("type:"));
      const qType = typeLine ? typeLine.replace(/^type:\s*/i, "").trim().toLowerCase() : "mcq";

      // Extract explanation
      const explLine = lines.find(l => l.startsWith("E:") || l.startsWith("Explanation:"));
      const explanation = explLine ? explLine.replace(/^(E|Explanation)[:.]\s*/i, "").trim() : "";

      if (qType === "true_false") {
        const ansLine = lines.find(l => l.toLowerCase().startsWith("answer:"));
        const ans = ansLine ? ansLine.replace(/^answer:\s*/i, "").trim().toLowerCase() : "true";
        questions.push({
          question_text: questionText,
          question_type: "true_false",
          options: ["True", "False"],
          correct_answer: ans === "true" ? 0 : 1,
          explanation,
          difficulty: "medium",
          points: 1,
        });
      } else if (qType === "fill_blank") {
        const ansLine = lines.find(l => l.toLowerCase().startsWith("answer:"));
        const ans = ansLine ? ansLine.replace(/^answer:\s*/i, "").trim() : "";
        questions.push({
          question_text: questionText,
          question_type: "fill_blank",
          options: [],
          correct_answer: ans,
          explanation,
          difficulty: "medium",
          points: 1,
        });
      } else if (qType === "short_answer") {
        const ansLine = lines.find(l => l.toLowerCase().startsWith("answer:"));
        const ans = ansLine ? ansLine.replace(/^answer:\s*/i, "").trim() : "";
        questions.push({
          question_text: questionText,
          question_type: "short_answer",
          options: [],
          correct_answer: ans,
          explanation,
          difficulty: "medium",
          points: 2,
        });
      } else {
        // MCQ
        const optionLines = lines.filter(l => /^[A-F][).]\s/.test(l));
        if (optionLines.length < 2) {
          errs.push(`Block ${bi + 1}: MCQ needs at least 2 options (A), B), etc.)`);
          return;
        }
        let correctIdx = 0;
        const options = optionLines.map((ol, oi) => {
          const isCorrect = ol.includes("*");
          if (isCorrect) correctIdx = oi;
          return ol.replace(/^[A-F][).]\s*/, "").replace(/\s*\*\s*$/, "").trim();
        });
        questions.push({
          question_text: questionText,
          question_type: "mcq",
          options,
          correct_answer: correctIdx,
          explanation,
          difficulty: "medium",
          points: 1,
        });
      }
    });

    setParsed(questions);
    setErrors(errs);

    if (questions.length > 0) {
      toast.success(`Parsed ${questions.length} question(s)`);
    } else {
      toast.error("Could not parse any questions");
    }
  };

  const handleImport = () => {
    onImport(parsed);
    setText("");
    setParsed([]);
    setErrors([]);
    onOpenChange(false);
    toast.success(`Imported ${parsed.length} questions`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Import Questions
          </DialogTitle>
          <DialogDescription>
            Paste multiple questions at once using the format below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Paste Questions</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your questions here..."
              rows={10}
              className="text-sm font-mono mt-1"
            />
          </div>

          <details className="text-xs border border-border/50 rounded-lg p-3">
            <summary className="cursor-pointer font-medium flex items-center gap-1">
              <FileText className="h-3 w-3" /> Format Guide
            </summary>
            <pre className="mt-2 text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded">{SAMPLE_FORMAT}</pre>
            <p className="mt-2 text-muted-foreground">
              • Mark correct MCQ option with * at the end<br />
              • Separate questions with a blank line<br />
              • Add "Type:" line for non-MCQ questions<br />
              • Add "E:" for explanations
            </p>
          </details>

          <Button onClick={parseQuestions} disabled={!text.trim()} variant="outline" className="w-full">
            Parse Questions
          </Button>

          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}

          {parsed.length > 0 && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <p className="text-sm font-medium text-green-600 mb-2">
                ✅ {parsed.length} questions parsed successfully
              </p>
              <div className="space-y-1 max-h-32 overflow-auto">
                {parsed.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[9px] shrink-0">{q.question_type}</Badge>
                    <span className="truncate">{q.question_text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={parsed.length === 0}>
            Import {parsed.length} Question{parsed.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
