import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { BarChart3, Users, CheckCircle, Clock, Eye, MessageSquare, Award } from "lucide-react";
import { toast } from "sonner";

interface QuizResultsDashboardProps {
  orgId: string;
  quizId: string;
  quizTitle: string;
  questions: any[];
  onClose: () => void;
}

interface Attempt {
  id: string;
  student_id: string;
  student_name?: string;
  answers: any[];
  score: number | null;
  total_points: number;
  earned_points: number;
  time_taken_seconds: number | null;
  status: string;
  submitted_at: string | null;
  teacher_feedback: string | null;
}

export default function QuizResultsDashboard({ orgId, quizId, quizTitle, questions, onClose }: QuizResultsDashboardProps) {
  const { profile } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [feedback, setFeedback] = useState("");
  const [grading, setGrading] = useState(false);
  const [manualScores, setManualScores] = useState<Record<number, number>>({});

  const fetchAttempts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("student_quiz_attempts")
        .select("*, profiles!student_quiz_attempts_student_id_fkey(name)")
        .eq("quiz_id", quizId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setAttempts((data || []).map((a: any) => ({
        ...a,
        student_name: a.profiles?.name || "Unknown",
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => { fetchAttempts(); }, [fetchAttempts]);

  const submitted = attempts.filter(a => a.status !== "in_progress");
  const avgScore = submitted.length > 0 ? submitted.reduce((sum, a) => sum + (a.score || 0), 0) / submitted.length : 0;
  const needsGrading = attempts.filter(a => a.status === "submitted");

  const handleGrade = async (attempt: Attempt) => {
    setGrading(true);
    try {
      // Calculate total earned from manual scores + auto-graded
      const answers = Array.isArray(attempt.answers) ? attempt.answers : [];
      let totalEarned = 0;
      answers.forEach((ans: any, i: number) => {
        if (manualScores[i] !== undefined) {
          totalEarned += manualScores[i];
        } else if (ans.auto_points !== undefined) {
          totalEarned += ans.auto_points;
        }
      });

      const totalPts = attempt.total_points || 1;
      const finalScore = Math.round((totalEarned / totalPts) * 100 * 100) / 100;

      const { error } = await (supabase as any)
        .from("student_quiz_attempts")
        .update({
          status: "graded",
          earned_points: totalEarned,
          score: finalScore,
          teacher_feedback: feedback || null,
          graded_by: profile?.id,
          graded_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);

      if (error) throw error;
      toast.success("Quiz graded!");
      setSelectedAttempt(null);
      setFeedback("");
      setManualScores({});
      fetchAttempts();
    } catch (err: any) {
      toast.error(err.message || "Failed to grade");
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Results: {quizTitle}
          </h3>
          <p className="text-sm text-muted-foreground">{questions.length} questions • {submitted.length} submissions</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>Back</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{submitted.length}</p>
          <p className="text-[10px] text-muted-foreground">Submissions</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Award className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{avgScore.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Avg Score</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{attempts.filter(a => a.status === "graded").length}</p>
          <p className="text-[10px] text-muted-foreground">Graded</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{needsGrading.length}</p>
          <p className="text-[10px] text-muted-foreground">Needs Grading</p>
        </CardContent></Card>
      </div>

      {/* Student list */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : attempts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No submissions yet</p>
      ) : (
        <div className="space-y-2">
          {attempts.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                {a.student_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{a.student_name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "graded" ? "default" : a.status === "submitted" ? "secondary" : "outline"} className="text-[9px]">
                    {a.status}
                  </Badge>
                  {a.score !== null && <span className="text-xs text-muted-foreground">{a.score}%</span>}
                  {a.time_taken_seconds && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {Math.floor(a.time_taken_seconds / 60)}m {a.time_taken_seconds % 60}s
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedAttempt(a); setFeedback(a.teacher_feedback || ""); setManualScores({}); }}>
                  <Eye className="h-3 w-3 mr-1" /> {a.status === "submitted" ? "Grade" : "View"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grade/View Dialog */}
      <Dialog open={!!selectedAttempt} onOpenChange={(o) => { if (!o) setSelectedAttempt(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedAttempt?.student_name}'s Attempt</DialogTitle>
            <DialogDescription>
              Review answers and provide feedback.
            </DialogDescription>
          </DialogHeader>

          {selectedAttempt && (
            <div className="space-y-4">
              {/* Answers review */}
              {questions.map((q: any, qi: number) => {
                const answer = Array.isArray(selectedAttempt.answers) ? selectedAttempt.answers[qi] : null;
                const isAutoGraded = q.question_type !== "short_answer";
                const isCorrect = answer?.is_correct;

                return (
                  <div key={qi} className={`p-3 rounded-lg border ${isAutoGraded ? (isCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5") : "border-border/50"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px]">Q{qi + 1}</Badge>
                      <Badge variant="secondary" className="text-[9px]">{q.question_type}</Badge>
                      {isAutoGraded && (
                        <Badge variant={isCorrect ? "default" : "destructive"} className="text-[9px]">
                          {isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-2">{q.question_text}</p>

                    {/* Student's answer */}
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">Student's answer: <span className="font-medium text-foreground">{answer?.student_answer ?? "No answer"}</span></p>
                      {q.question_type !== "short_answer" && (
                        <p className="text-muted-foreground">Correct answer: <span className="font-medium text-green-600">
                          {q.question_type === "mcq" || q.question_type === "true_false"
                            ? (q.options?.[q.correct_answer] ?? q.correct_answer)
                            : q.correct_answer}
                        </span></p>
                      )}
                      {q.explanation && <p className="text-muted-foreground italic">💡 {q.explanation}</p>}
                    </div>

                    {/* Manual grading for short answer */}
                    {q.question_type === "short_answer" && selectedAttempt.status !== "graded" && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Points:</span>
                        <Input
                          type="number"
                          min={0}
                          max={q.points || 1}
                          value={manualScores[qi] ?? ""}
                          onChange={(e) => setManualScores(prev => ({ ...prev, [qi]: Number(e.target.value) }))}
                          className="w-16 h-7 text-xs"
                          placeholder={`/${q.points || 1}`}
                        />
                        <span className="text-[10px] text-muted-foreground">/ {q.points || 1}</span>
                        <p className="text-[10px] text-muted-foreground ml-2">Model answer: {q.correct_answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Feedback */}
              {selectedAttempt.status !== "graded" && (
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> Teacher Feedback
                  </p>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Write feedback for the student..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              )}

              {selectedAttempt.teacher_feedback && selectedAttempt.status === "graded" && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-xs font-medium mb-1">Teacher Feedback:</p>
                  <p className="text-sm">{selectedAttempt.teacher_feedback}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAttempt(null)}>Close</Button>
            {selectedAttempt?.status === "submitted" && (
              <Button onClick={() => selectedAttempt && handleGrade(selectedAttempt)} disabled={grading}>
                {grading ? "Grading..." : "Submit Grade"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
