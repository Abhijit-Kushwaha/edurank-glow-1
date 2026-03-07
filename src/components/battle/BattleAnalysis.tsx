import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface BattleAnalysisProps {
  battleId: string;
  userId: string;
  subject: string;
}

interface Analysis {
  strong_topics: string[];
  weak_topics: string[];
  suggestions: string[];
  overall_message: string;
}

export default function BattleAnalysis({ battleId, userId, subject }: BattleAnalysisProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        // Get user's answers for this battle
        const { data: answers } = await supabase
          .from("battle_answers")
          .select("*, battle_questions(question_text, difficulty)")
          .eq("battle_id", battleId)
          .eq("user_id", userId);

        if (!answers || answers.length === 0) {
          setLoading(false);
          return;
        }

        const correct = answers.filter((a) => a.is_correct);
        const wrong = answers.filter((a) => !a.is_correct);

        // Generate analysis via edge function
        const { data, error } = await supabase.functions.invoke("analyze-battle", {
          body: {
            subject,
            correctQuestions: correct.map((a: any) => a.battle_questions?.question_text || ""),
            wrongQuestions: wrong.map((a: any) => a.battle_questions?.question_text || ""),
            totalQuestions: answers.length,
            correctCount: correct.length,
          },
        });

        if (data && !error) {
          setAnalysis(data);
        } else {
          // Fallback local analysis
          setAnalysis({
            strong_topics: correct.length > 0 ? [`${subject} fundamentals`] : [],
            weak_topics: wrong.length > 0 ? [`Some ${subject} concepts`] : [],
            suggestions: wrong.length > 0
              ? [`Review ${wrong.length} missed question${wrong.length > 1 ? "s" : ""}`]
              : ["Great job! Keep practicing!"],
            overall_message: correct.length === answers.length
              ? "Perfect score! 🎉"
              : `You got ${correct.length}/${answers.length} correct.`,
          });
        }
      } catch {
        setAnalysis({
          strong_topics: ["General knowledge"],
          weak_topics: [],
          suggestions: ["Keep practicing!"],
          overall_message: "Battle complete!",
        });
      }
      setLoading(false);
    };

    fetchAnalysis();
  }, [battleId, userId, subject]);

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-4 text-center space-y-2">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground">AI is analyzing your battle...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
    >
      <Card className="border-primary/20 overflow-hidden">
        <div className="h-1 gradient-bg" />
        <CardContent className="p-4 space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> AI Battle Analysis
          </h3>

          <p className="text-xs text-muted-foreground">{analysis.overall_message}</p>

          {analysis.strong_topics.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Strong Topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.strong_topics.map((t) => (
                  <span key={t} className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20">
                    ✔ {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.weak_topics.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Needs Improvement
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.weak_topics.map((t) => (
                  <span key={t} className="bg-destructive/10 text-destructive text-[10px] px-2 py-0.5 rounded-full border border-destructive/20">
                    ❌ {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-primary" /> Suggested Practice
              </p>
              <ul className="space-y-1">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">💡 {s}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
