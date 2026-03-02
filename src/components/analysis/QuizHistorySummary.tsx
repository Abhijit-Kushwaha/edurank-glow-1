import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface QuizResult {
  id: string;
  todoId: string;
  todoTitle: string;
  score: number;
  previousScore: number | null;
  correctAnswers: number;
  totalQuestions: number;
  timeTaken: number;
  createdAt: string;
}

const QuizHistorySummary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentQuizzes, setRecentQuizzes] = useState<QuizResult[]>([]);

  useEffect(() => {
    if (user) {
      fetchRecentQuizzes();
    }
  }, [user]);

  const fetchRecentQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_results")
        .select(
          `
          id,
          todo_id,
          score,
          previous_score,
          correct_answers,
          total_questions,
          time_taken_seconds,
          created_at,
          todos (title)
        `,
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedResults: QuizResult[] = (data || []).map((r: any) => ({
        id: r.id,
        todoId: r.todo_id,
        todoTitle: r.todos?.title || "Unknown Quiz",
        score: r.score,
        previousScore: r.previous_score,
        correctAnswers: r.correct_answers,
        totalQuestions: r.total_questions,
        timeTaken: r.time_taken_seconds || 0,
        createdAt: r.created_at,
      }));

      setRecentQuizzes(formattedResults);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (current: number, previous: number | null) => {
    if (previous === null)
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous)
      return <TrendingUp className="h-4 w-4 text-success" />;
    if (current < previous)
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (recentQuizzes.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 text-center">
          <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No quiz history yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your first quiz to see your history here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Recent Quiz Activity
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/quiz-history")}
        >
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div
                  className={`text-2xl font-bold ${getScoreColor(quiz.score)}`}
                >
                  {quiz.score}%
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{quiz.todoTitle}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {quiz.correctAnswers}/{quiz.totalQuestions}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(quiz.timeTaken)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getTrendIcon(quiz.score, quiz.previousScore)}
                {quiz.previousScore !== null && (
                  <span className="text-xs text-muted-foreground">
                    vs {quiz.previousScore}%
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {format(new Date(quiz.createdAt), "MMM d")}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizHistorySummary;
