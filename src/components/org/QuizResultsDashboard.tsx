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
import { BarChart3, Users, CheckCircle, Clock, Eye, MessageSquare, Award, ShieldAlert, Copy, Monitor, AlertTriangle } from "lucide-react";
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
  tab_switches: number;
  copy_events: number;
  minimize_events: number;
  anti_cheat_log: any[];
}

export default function QuizResultsDashboard({ orgId, quizId, quizTitle, questions, onClose }: QuizResultsDashboardProps) {
  const { profile } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [feedback, setFeedback] = useState("");
  const [grading, setGrading] = useState(false);
  const [manualScores, setManualScores] = useState<Record<number, number>>({});
  const [showAntiCheatLog, setShowAntiCheatLog] = useState<Attempt | null>(null);

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
        tab_switches: a.tab_switches || 0,
        copy_events: a.copy_events || 0,
        minimize_events: a.minimize_events || 0,
        anti_cheat_log: a.anti_cheat_log || [],
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
  const flaggedStudents = attempts.filter(a => a.tab_switches > 0 || a.copy_events > 0 || a.minimize_events > 2);

  const handleGrade = async (attempt: Attempt) => {
    setGrading(true);
    try {
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

  const getThreatLevel = (a: Attempt) => {
    const total = a.tab_switches + a.copy_events + a.minimize_events;
    if (total === 0) return null;
    if (total >= 5 || a.tab_switches >= 3) return "high";
    if (total >= 2) return "medium";
    return "low";
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
        <Card><CardContent className="pt-4 text-center">
          <ShieldAlert className={`h-5 w-5 mx-auto mb-1 ${flaggedStudents.length > 0 ? "text-destructive" : "text-green-500"}`} />
          <p className="text-2xl font-bold">{flaggedStudents.length}</p>
          <p className="text-[10px] text-muted-foreground">Flagged</p>
        </CardContent></Card>
      </div>

      {/* Flagged students alert */}
      {flaggedStudents.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Suspicious Activity Detected
          </p>
          <div className="flex flex-wrap gap-2">
            {flaggedStudents.map(a => (
              <button key={a.id} onClick={() => setShowAntiCheatLog(a)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs hover:bg-destructive/20 transition-colors"
              >
                <span className="font-medium">{a.student_name}</span>
                <span>•</span>
                {a.tab_switches > 0 && <span>{a.tab_switches} tab</span>}
                {a.copy_events > 0 && <span>{a.copy_events} copy</span>}
                {a.minimize_events > 0 && <span>{a.minimize_events} blur</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Student list */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : attempts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No submissions yet</p>
      ) : (
        <div className="space-y-2">
          {attempts.map(a => {
            const threat = getThreatLevel(a);
            return (
              <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                threat === "high" ? "border-destructive/30 bg-destructive/5" :
                threat === "medium" ? "border-amber-500/30 bg-amber-500/5" :
                "border-border/50 hover:bg-muted/30"
              }`}>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {a.student_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.student_name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={a.status === "graded" ? "default" : a.status === "submitted" ? "secondary" : "outline"} className="text-[9px]">
                      {a.status}
                    </Badge>
                    {a.score !== null && <span className="text-xs text-muted-foreground">{a.score}%</span>}
                    {a.time_taken_seconds && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {Math.floor(a.time_taken_seconds / 60)}m {a.time_taken_seconds % 60}s
                      </span>
                    )}
                    {/* Anti-cheat indicators */}
                    {a.tab_switches > 0 && (
                      <span className="text-[10px] text-destructive flex items-center gap-0.5">
                        <Monitor className="h-2.5 w-2.5" /> {a.tab_switches} tab switch{a.tab_switches > 1 ? "es" : ""}
                      </span>
                    )}
                    {a.copy_events > 0 && (
                      <span className="text-[10px] text-destructive flex items-center gap-0.5">
                        <Copy className="h-2.5 w-2.5" /> {a.copy_events} copy
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(a.tab_switches > 0 || a.copy_events > 0 || a.minimize_events > 0) && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setShowAntiCheatLog(a)}>
                      <ShieldAlert className="h-3 w-3 mr-1" /> Log
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedAttempt(a); setFeedback(a.teacher_feedback || ""); setManualScores({}); }}>
                    <Eye className="h-3 w-3 mr-1" /> {a.status === "submitted" ? "Grade" : "View"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Anti-cheat Log Dialog */}
      <Dialog open={!!showAntiCheatLog} onOpenChange={(o) => { if (!o) setShowAntiCheatLog(null); }}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Anti-Cheat Log: {showAntiCheatLog?.student_name}
            </DialogTitle>
            <DialogDescription>Detailed activity log during the quiz.</DialogDescription>
          </DialogHeader>
          {showAntiCheatLog && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Monitor className="h-4 w-4 mx-auto mb-1 text-destructive" />
                  <p className="text-lg font-bold">{showAntiCheatLog.tab_switches}</p>
                  <p className="text-[9px] text-muted-foreground">Tab Switches</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Copy className="h-4 w-4 mx-auto mb-1 text-destructive" />
                  <p className="text-lg font-bold">{showAntiCheatLog.copy_events}</p>
                  <p className="text-[9px] text-muted-foreground">Copy/Cut</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Monitor className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                  <p className="text-lg font-bold">{showAntiCheatLog.minimize_events}</p>
                  <p className="text-[9px] text-muted-foreground">Window Blur</p>
                </div>
              </div>

              {/* Timeline */}
              {Array.isArray(showAntiCheatLog.anti_cheat_log) && showAntiCheatLog.anti_cheat_log.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Event Timeline</p>
                  <div className="max-h-48 overflow-auto space-y-1 border border-border/50 rounded-lg p-2">
                    {showAntiCheatLog.anti_cheat_log.map((event: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/20 last:border-0">
                        <Badge variant={event.type === "tab_switch" ? "destructive" : event.type === "copy" || event.type === "cut" ? "destructive" : "secondary"} className="text-[8px] px-1.5">
                          {event.type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "Unknown time"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">No detailed log entries</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAntiCheatLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {/* Anti-cheat summary in grading view */}
              {(selectedAttempt.tab_switches > 0 || selectedAttempt.copy_events > 0 || selectedAttempt.minimize_events > 0) && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-medium text-destructive">Suspicious activity during quiz:</p>
                    <p className="text-muted-foreground">
                      {selectedAttempt.tab_switches > 0 && `${selectedAttempt.tab_switches} tab switches `}
                      {selectedAttempt.copy_events > 0 && `• ${selectedAttempt.copy_events} copy/cut attempts `}
                      {selectedAttempt.minimize_events > 0 && `• ${selectedAttempt.minimize_events} window blurs`}
                    </p>
                  </div>
                </div>
              )}

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
