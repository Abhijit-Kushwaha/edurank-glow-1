import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, Play, CheckCircle, AlertCircle } from "lucide-react";

interface AssignedQuiz {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  time_limit_mins: number;
  description: string | null;
  due_date: string | null;
  questions: any[];
  creator_name?: string;
  my_attempts: number;
  max_attempts: number;
  best_score: number | null;
}

interface StudentAssignedQuizzesProps {
  orgId: string;
}

export default function StudentAssignedQuizzes({ orgId }: StudentAssignedQuizzesProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [quizzes, setQuizzes] = useState<AssignedQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssigned = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      // Get published quizzes for this org
      const { data: orgQuizzes, error } = await (supabase as any)
        .from("org_quizzes")
        .select("*, profiles!org_quizzes_created_by_fkey(name)")
        .eq("org_id", orgId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get my attempts
      const { data: myAttempts } = await (supabase as any)
        .from("student_quiz_attempts")
        .select("quiz_id, score, status")
        .eq("student_id", profile.id);

      const attemptMap: Record<string, { count: number; best: number | null }> = {};
      (myAttempts || []).forEach((a: any) => {
        if (!attemptMap[a.quiz_id]) attemptMap[a.quiz_id] = { count: 0, best: null };
        attemptMap[a.quiz_id].count++;
        if (a.score !== null) {
          attemptMap[a.quiz_id].best = Math.max(attemptMap[a.quiz_id].best ?? 0, a.score);
        }
      });

      setQuizzes((orgQuizzes || []).map((q: any) => ({
        ...q,
        creator_name: q.profiles?.name,
        my_attempts: attemptMap[q.id]?.count || 0,
        max_attempts: q.max_attempts || 1,
        best_score: attemptMap[q.id]?.best ?? null,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgId, profile?.id]);

  useEffect(() => { fetchAssigned(); }, [fetchAssigned]);

  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>;
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No quizzes assigned yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" /> Assigned Quizzes
      </h3>
      {quizzes.map(q => {
        const canAttempt = q.my_attempts < q.max_attempts;
        const isOverdue = q.due_date && new Date(q.due_date) < new Date();

        return (
          <Card key={q.id} className="border-border/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{q.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="secondary" className="text-[9px]">{q.subject}</Badge>
                    <Badge variant="secondary" className="text-[9px]">{q.difficulty}</Badge>
                    <span className="text-[10px] text-muted-foreground">{q.questions?.length || 0}Q • {q.time_limit_mins}min</span>
                    {q.due_date && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        <Clock className="h-2.5 w-2.5" />
                        Due {new Date(q.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {q.best_score !== null && (
                    <span className="text-[10px] text-muted-foreground">Best: {q.best_score}% • {q.my_attempts}/{q.max_attempts} attempts</span>
                  )}
                </div>
                <div className="shrink-0">
                  {!canAttempt ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <CheckCircle className="h-3 w-3" /> Done
                    </Badge>
                  ) : isOverdue ? (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertCircle className="h-3 w-3" /> Overdue
                    </Badge>
                  ) : (
                    <Button size="sm" className="h-8 text-xs" onClick={() => navigate(`/org/quiz/${q.id}`)}>
                      <Play className="h-3 w-3 mr-1" /> Take Quiz
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
