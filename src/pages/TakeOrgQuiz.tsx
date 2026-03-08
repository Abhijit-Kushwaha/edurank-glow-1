import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, ArrowRight, Trophy, BookOpen, AlertCircle, ShieldAlert, Lock } from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: any;
  explanation?: string;
  points: number;
}

export default function TakeOrgQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [existingAttempts, setExistingAttempts] = useState(0);

  // Anti-cheat tracking
  const [tabSwitches, setTabSwitches] = useState(0);
  const [copyEvents, setCopyEvents] = useState(0);
  const [minimizeEvents, setMinimizeEvents] = useState(0);
  const [antiCheatLog, setAntiCheatLog] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const lockOverlayRef = useRef<HTMLDivElement>(null);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("org_quizzes")
        .select("*")
        .eq("id", quizId)
        .eq("is_published", true)
        .single();

      if (error || !data) {
        toast.error("Quiz not found or not available");
        navigate("/org");
        return;
      }
      setQuiz(data);
      setTimeLeft((data.time_limit_mins || 30) * 60);
      setAnswers(new Array(data.questions?.length || 0).fill(null));

      if (profile?.id) {
        const { data: attempts } = await (supabase as any)
          .from("student_quiz_attempts")
          .select("id, status")
          .eq("quiz_id", quizId)
          .eq("student_id", profile.id);
        setExistingAttempts(attempts?.length || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [quizId, profile?.id, navigate]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  // Anti-cheat: Track visibility changes (tab switch / minimize)
  useEffect(() => {
    if (!started || isCompleted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const event = { type: "tab_switch", timestamp: new Date().toISOString() };
        setTabSwitches(prev => prev + 1);
        setAntiCheatLog(prev => [...prev, event]);

        if (quiz?.lock_screen) {
          setIsLocked(true);
        }
      }
    };

    const handleBlur = () => {
      if (!started || isCompleted) return;
      const event = { type: "window_blur", timestamp: new Date().toISOString() };
      setMinimizeEvents(prev => prev + 1);
      setAntiCheatLog(prev => [...prev, event]);
    };

    const handleCopy = (e: ClipboardEvent) => {
      const event = { type: "copy", timestamp: new Date().toISOString() };
      setCopyEvents(prev => prev + 1);
      setAntiCheatLog(prev => [...prev, event]);

      if (quiz?.lock_screen) {
        e.preventDefault();
        toast.error("Copying is disabled during this quiz");
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      const event = { type: "cut", timestamp: new Date().toISOString() };
      setCopyEvents(prev => prev + 1);
      setAntiCheatLog(prev => [...prev, event]);

      if (quiz?.lock_screen) {
        e.preventDefault();
        toast.error("Cutting is disabled during this quiz");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (quiz?.lock_screen) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [started, isCompleted, quiz?.lock_screen]);

  // Request fullscreen when lock_screen is enabled
  useEffect(() => {
    if (started && quiz?.lock_screen && !isCompleted) {
      try {
        document.documentElement.requestFullscreen?.();
      } catch { /* ignore */ }
    }
    if (isCompleted) {
      try {
        if (document.fullscreenElement) document.exitFullscreen?.();
      } catch { /* ignore */ }
    }
  }, [started, quiz?.lock_screen, isCompleted]);

  // Timer
  useEffect(() => {
    if (!started || isCompleted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, isCompleted]);

  const startQuiz = async () => {
    if (!profile?.id || !quiz) return;
    try {
      const totalPoints = quiz.questions.reduce((s: number, q: any) => s + (q.points || 1), 0);
      const { data, error } = await (supabase as any)
        .from("student_quiz_attempts")
        .insert({
          org_id: quiz.org_id,
          quiz_id: quiz.id,
          student_id: profile.id,
          total_points: totalPoints,
          status: "in_progress",
        })
        .select("id")
        .single();

      if (error) throw error;
      setAttemptId(data.id);
      setStarted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to start quiz");
    }
  };

  const handleAnswer = (value: any) => {
    if (showResult) return;
    const newAnswers = [...answers];
    const q = quiz.questions[currentIndex];

    let isCorrect = false;
    let autoPoints = 0;

    if (q.question_type === "mcq" || q.question_type === "true_false") {
      isCorrect = value === q.correct_answer;
      autoPoints = isCorrect ? (q.points || 1) : 0;
    } else if (q.question_type === "fill_blank") {
      isCorrect = String(value).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
      autoPoints = isCorrect ? (q.points || 1) : 0;
    }

    newAnswers[currentIndex] = {
      question_index: currentIndex,
      student_answer: q.question_type === "mcq" || q.question_type === "true_false"
        ? q.options?.[value] ?? value
        : value,
      selected_index: typeof value === "number" ? value : null,
      is_correct: q.question_type === "short_answer" ? null : isCorrect,
      auto_points: q.question_type === "short_answer" ? 0 : autoPoints,
    };

    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowResult(false);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    setIsCompleted(true);

    const earnedPoints = answers.reduce((sum: number, a: any) => sum + (a?.auto_points || 0), 0);
    const totalPoints = quiz.questions.reduce((s: number, q: any) => s + (q.points || 1), 0);
    const hasShortAnswer = quiz.questions.some((q: any) => q.question_type === "short_answer");
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100 * 100) / 100 : 0;

    try {
      const elapsed = (quiz.time_limit_mins * 60) - timeLeft;
      await (supabase as any)
        .from("student_quiz_attempts")
        .update({
          answers,
          score: hasShortAnswer ? null : score,
          earned_points: earnedPoints,
          time_taken_seconds: elapsed,
          status: hasShortAnswer ? "submitted" : "graded",
          submitted_at: new Date().toISOString(),
          tab_switches: tabSwitches,
          copy_events: copyEvents,
          minimize_events: minimizeEvents,
          anti_cheat_log: antiCheatLog,
        })
        .eq("id", attemptId);

      toast.success("Quiz submitted!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit quiz");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="p-6 max-w-2xl mx-auto space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48" /></div>;
  }

  if (!quiz) return null;

  const questions: QuizQuestion[] = quiz.questions || [];
  const currentQuestion = questions[currentIndex];
  const maxAttempts = quiz.max_attempts || 1;
  const canAttempt = existingAttempts < maxAttempts;

  // Lock overlay when student switches tab during locked quiz
  if (isLocked && !isCompleted) {
    return (
      <div ref={lockOverlayRef} className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Tab Switch Detected!</h2>
            <p className="text-sm text-muted-foreground">
              You left the quiz window. This has been recorded. Your teacher will be notified.
            </p>
            <p className="text-xs text-muted-foreground">
              Tab switches so far: <span className="font-bold text-destructive">{tabSwitches}</span>
            </p>
            <Button onClick={() => setIsLocked(false)} className="w-full">
              Return to Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-6 space-y-4 text-center">
            <BookOpen className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">{quiz.title}</h2>
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge variant="secondary">{quiz.subject}</Badge>
              <Badge variant="secondary">{quiz.difficulty}</Badge>
              <Badge variant="outline">{questions.length} questions</Badge>
              <Badge variant="outline">{quiz.time_limit_mins} min</Badge>
            </div>
            {quiz.lock_screen && (
              <div className="flex items-center gap-2 justify-center text-amber-600 text-sm bg-amber-500/10 rounded-lg p-2">
                <Lock className="h-4 w-4" />
                <span>Screen lock enabled — switching tabs will be recorded & blocked</span>
              </div>
            )}
            {quiz.description && <p className="text-sm text-muted-foreground">{quiz.description}</p>}
            <p className="text-xs text-muted-foreground">
              Attempt {existingAttempts + 1} of {maxAttempts}
            </p>
            {!canAttempt ? (
              <div className="flex items-center gap-2 justify-center text-destructive text-sm">
                <AlertCircle className="h-4 w-4" /> Maximum attempts reached
              </div>
            ) : (
              <Button size="lg" className="w-full" onClick={startQuiz}>
                Start Quiz
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/org")}>Back to Organization</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed screen
  if (isCompleted) {
    const earnedPoints = answers.reduce((sum: number, a: any) => sum + (a?.auto_points || 0), 0);
    const totalPoints = questions.reduce((s, q) => s + (q.points || 1), 0);
    const hasShortAnswer = questions.some(q => q.question_type === "short_answer");
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Trophy className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Quiz Complete!</h2>
            {hasShortAnswer ? (
              <p className="text-muted-foreground">Your quiz has been submitted. Short-answer questions will be graded by your teacher.</p>
            ) : (
              <>
                <p className="text-3xl font-bold text-primary">{score}%</p>
                <p className="text-sm text-muted-foreground">{earnedPoints}/{totalPoints} points earned</p>
              </>
            )}
            {(tabSwitches > 0 || copyEvents > 0) && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 space-y-1">
                <p className="font-medium">Activity recorded:</p>
                {tabSwitches > 0 && <p>Tab switches: {tabSwitches}</p>}
                {copyEvents > 0 && <p>Copy/cut attempts: {copyEvents}</p>}
                {minimizeEvents > 0 && <p>Window blur events: {minimizeEvents}</p>}
              </div>
            )}
            <Button onClick={() => navigate("/org")} className="w-full">Back to Organization</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz in progress
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4" style={quiz?.lock_screen ? { userSelect: "none" } : {}}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm truncate">{quiz.title}</h2>
        <div className="flex items-center gap-2">
          {quiz.lock_screen && (
            <Badge variant="outline" className="gap-1 text-[10px] text-amber-600 border-amber-500/30">
              <Lock className="h-2.5 w-2.5" /> Locked
            </Badge>
          )}
          {tabSwitches > 0 && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <ShieldAlert className="h-2.5 w-2.5" /> {tabSwitches} switch{tabSwitches > 1 ? "es" : ""}
            </Badge>
          )}
          <Badge variant={timeLeft < 60 ? "destructive" : "outline"} className="gap-1 font-mono">
            <Clock className="h-3 w-3" /> {formatTime(timeLeft)}
          </Badge>
        </div>
      </div>

      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground text-center">Question {currentIndex + 1} of {questions.length}</p>

      {/* Question */}
      {currentQuestion && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{currentQuestion.question_type}</Badge>
              <Badge variant="outline" className="text-[10px]">{currentQuestion.points || 1} pt</Badge>
            </div>
            <p className="text-base font-medium">{currentQuestion.question_text}</p>

            {/* MCQ */}
            {currentQuestion.question_type === "mcq" && (
              <div className="space-y-2">
                {currentQuestion.options?.map((opt: string, oi: number) => {
                  const isCorrect = oi === currentQuestion.correct_answer;
                  const isSelected = answers[currentIndex]?.selected_index === oi;
                  let cls = "border-border hover:border-primary/50";
                  if (showResult) {
                    if (isCorrect) cls = "border-green-500 bg-green-500/10";
                    else if (isSelected) cls = "border-destructive bg-destructive/10";
                  }
                  return (
                    <button key={oi} onClick={() => handleAnswer(oi)} disabled={showResult}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${cls}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{String.fromCharCode(65 + oi)}. {opt}</span>
                        {showResult && isCorrect && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* True/False */}
            {currentQuestion.question_type === "true_false" && (
              <div className="flex gap-3">
                {["True", "False"].map((label, i) => {
                  const isCorrect = i === currentQuestion.correct_answer;
                  const isSelected = answers[currentIndex]?.selected_index === i;
                  let cls = "border-border hover:border-primary/50";
                  if (showResult) {
                    if (isCorrect) cls = "border-green-500 bg-green-500/10";
                    else if (isSelected) cls = "border-destructive bg-destructive/10";
                  }
                  return (
                    <button key={i} onClick={() => handleAnswer(i)} disabled={showResult}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${cls}`}
                    >{label}</button>
                  );
                })}
              </div>
            )}

            {/* Fill in the blank */}
            {currentQuestion.question_type === "fill_blank" && !showResult && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAnswer(formData.get("answer") as string);
              }}>
                <div className="flex gap-2">
                  <Input name="answer" placeholder="Type your answer..." className="flex-1" autoFocus />
                  <Button type="submit">Submit</Button>
                </div>
              </form>
            )}

            {/* Short answer */}
            {currentQuestion.question_type === "short_answer" && !showResult && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAnswer(formData.get("answer") as string);
              }}>
                <Textarea name="answer" placeholder="Write your answer..." rows={3} />
                <Button type="submit" className="mt-2 w-full">Submit Answer</Button>
              </form>
            )}

            {/* Result feedback */}
            {showResult && currentQuestion.question_type !== "short_answer" && (
              <div className={`p-3 rounded-xl ${
                answers[currentIndex]?.is_correct
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-destructive/10 border border-destructive/30"
              }`}>
                <p className="text-sm font-medium mb-1">
                  {answers[currentIndex]?.is_correct ? "✅ Correct!" : "❌ Incorrect"}
                </p>
                {currentQuestion.explanation && <p className="text-xs text-muted-foreground">{currentQuestion.explanation}</p>}
              </div>
            )}

            {showResult && currentQuestion.question_type === "short_answer" && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm">Your answer has been recorded. It will be graded by your teacher.</p>
              </div>
            )}

            {showResult && (
              <Button onClick={handleNext} className="w-full">
                {currentIndex < questions.length - 1 ? (
                  <>Next <ArrowRight className="h-4 w-4 ml-1" /></>
                ) : "Submit Quiz"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
