import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Calendar,
  Target,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface QuizResult {
  id: string;
  todo_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  created_at: string;
  todo_title?: string;
}

const QuizHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchQuizHistory();
    }
  }, [user]);

  const fetchQuizHistory = async () => {
    try {
      // Fetch quiz results
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (quizError) throw quizError;

      // Fetch todo titles for each result
      if (quizData && quizData.length > 0) {
        const todoIds = [...new Set(quizData.map(r => r.todo_id))];
        const { data: todosData } = await supabase
          .from('todos')
          .select('id, title')
          .in('id', todoIds);

        const todoMap = new Map(todosData?.map(t => [t.id, t.title]) || []);
        
        const resultsWithTitles = quizData.map(r => ({
          ...r,
          todo_title: todoMap.get(r.todo_id) || 'Unknown Topic',
        }));

        setResults(resultsWithTitles);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error fetching quiz history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (results.length === 0) return { average: 0, best: 0, total: 0, trend: 0 };
    
    const scores = results.map(r => r.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const best = Math.max(...scores);
    
    // Calculate trend (compare recent 5 vs previous 5)
    let trend = 0;
    if (results.length >= 4) {
      const recent = scores.slice(0, Math.min(5, Math.floor(scores.length / 2)));
      const previous = scores.slice(Math.min(5, Math.floor(scores.length / 2)), Math.min(10, scores.length));
      if (previous.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
        trend = recentAvg - previousAvg;
      }
    }

    return { average, best, total: results.length, trend };
  };

  const stats = calculateStats();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    return 'text-destructive';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <h1 className="text-lg font-semibold">Quiz History</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Total Quizzes</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Target className="h-4 w-4" />
              <span className="text-sm">Average Score</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(stats.average)}`}>
              {Math.round(stats.average)}%
            </p>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Trophy className="h-4 w-4" />
              <span className="text-sm">Best Score</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(stats.best)}`}>
              {Math.round(stats.best)}%
            </p>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {stats.trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : stats.trend < 0 ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              <span className="text-sm">Trend</span>
            </div>
            <p className={`text-2xl font-bold ${stats.trend > 0 ? 'text-success' : stats.trend < 0 ? 'text-destructive' : ''}`}>
              {stats.trend > 0 ? '+' : ''}{Math.round(stats.trend)}%
            </p>
          </div>
        </section>

        {/* Quiz Results Table */}
        <section className="glass-card rounded-xl p-4 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Past Attempts
          </h2>

          {results.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No quiz attempts yet</p>
              <p className="text-sm text-muted-foreground mb-4">Complete a study task and take a quiz to see your history</p>
              <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Correct</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow 
                      key={result.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/quiz/${result.todo_id}`)}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {result.todo_title}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${getScoreColor(result.score)}`}>
                          {Math.round(result.score)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {result.correct_answers}/{result.total_questions}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(result.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Improvement Tips */}
        {results.length > 0 && stats.average < 70 && (
          <section className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/5">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tips to Improve
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Review the video explanations before taking quizzes</li>
              <li>• Take notes while watching to reinforce learning</li>
              <li>• Try the adaptive quiz mode for personalized questions</li>
              <li>• Retake quizzes on topics where you scored below 60%</li>
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default QuizHistory;
