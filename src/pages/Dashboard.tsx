import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  CheckCircle2,
  Circle,
  Play,
  BookOpen,
  Trophy,
  Sparkles,
  TrendingUp,
  Loader2,
  Trash2,
  Search,
  Star,
  Sun,
  Moon,
  Sunset,
  Flame,
  Brain,
  FileText,
  CalendarDays,
  Clock,
  Zap,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useFilters } from "@/contexts/FilterContext";
import { supabase } from "@/integrations/supabase/client";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import WeakTopicCards from "@/components/WeakTopicCards";
import { DailyChallengesCard } from "@/components/dashboard/DailyChallengesCard";
import { FilterBar } from "@/components/dashboard/FilterBar";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  video_id: string | null;
  video_url: string | null;
  description: string | null;
}

interface QuizResult {
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
}

interface PlannerSession {
  id: string;
  subject: string;
  topic: string;
  time: string;
  duration: number;
  priority: string;
  completed: boolean;
}

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good Morning", icon: Sun };
  if (hour < 17) return { text: "Good Afternoon", icon: Sunset };
  return { text: "Good Evening", icon: Moon };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { filters } = useFilters();
  const { canMakeRequest } = useRateLimiter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recentQuizzes, setRecentQuizzes] = useState<QuizResult[]>([]);
  const [plannerSessions, setPlannerSessions] = useState<PlannerSession[]>([]);
  const [recentNotes, setRecentNotes] = useState<{ id: string; todo_id: string; title: string }[]>([]);

  const completedCount = todos.filter((t) => t.completed).length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const displayName =
    profile?.name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Student";

  const streak = profile?.streak || 0;
  const totalXp = profile?.total_xp || 0;
  const level = profile?.level || 1;

  useEffect(() => {
    if (user) {
      fetchTodos();
      fetchRecentQuizzes();
      fetchRecentNotes();
      loadPlannerSessions();
    }
  }, [user]);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error("Error fetching todos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentQuizzes = async () => {
    try {
      const { data } = await supabase
        .from("quiz_results")
        .select("score, total_questions, correct_answers, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setRecentQuizzes(data);
    } catch {}
  };

  const fetchRecentNotes = async () => {
    try {
      const { data } = await supabase
        .from("notes")
        .select("id, todo_id, created_at")
        .eq("user_id", user!.id)
        .eq("is_ai_generated", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (data) {
        const withTitles = await Promise.all(
          data.map(async (n) => {
            const { data: todo } = await supabase
              .from("todos")
              .select("title")
              .eq("id", n.todo_id)
              .maybeSingle();
            return { id: n.id, todo_id: n.todo_id, title: todo?.title || "Untitled" };
          })
        );
        setRecentNotes(withTitles);
      }
    } catch {}
  };

  const loadPlannerSessions = () => {
    try {
      const stored = localStorage.getItem("brainbuddy_study_sessions");
      if (stored) {
        const all: PlannerSession[] = JSON.parse(stored);
        const today = new Date().toISOString().split("T")[0];
        const todaySessions = all.filter(
          (s) => !s.completed && s.time >= today
        ).slice(0, 3);
        setPlannerSessions(todaySessions);
      }
    } catch {}
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || !user) return;
    const canProceed = await canMakeRequest();
    if (!canProceed) return;
    setAdding(true);
    try {
      toast.info("Finding the best video for your topic...", {
        icon: <Search className="h-4 w-4 text-primary animate-pulse" />,
      });
      let videoId: string | null = null;
      let videoDescription: string | null = null;
      let subtasksData: any[] = [];
      try {
        const { data: videoData, error: videoError } =
          await supabase.functions.invoke("find-video", {
            body: { topic: newTodoTitle.trim(), filters: { class: filters.class, subject: filters.subject, board: filters.board, language: filters.language } },
          });
        if (!videoError && videoData && !videoData.error) {
          videoId = videoData.videoId;
          const qualityLabel = videoData.quality_score ? ` (Quality: ${videoData.quality_score}/100)` : "";
          videoDescription = `${videoData.title} by ${videoData.channel}${qualityLabel}`;
          subtasksData = videoData.subtasks || [];
        }
      } catch {}
      const { data, error } = await supabase
        .from("todos")
        .insert({ title: newTodoTitle.trim(), video_id: videoId, description: videoDescription, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      if (data && subtasksData.length > 0) {
        for (let i = 0; i < subtasksData.length; i++) {
          const subtask = subtasksData[i];
          const { data: subtaskRow, error: subtaskError } = await supabase.from("subtasks").insert({ todo_id: data.id, user_id: user.id, title: subtask.title, order_index: i }).select().single();
          if (subtaskError) continue;
          if (subtaskRow && subtask.videos?.length > 0) {
            const videosToInsert = subtask.videos.map((video: any, idx: number) => ({ subtask_id: subtaskRow.id, user_id: user.id, video_id: video.videoId, title: video.title, channel: video.channel, engagement_score: video.engagementScore, reason: video.reason, order_index: idx }));
            await supabase.from("subtask_videos").insert(videosToInsert);
          }
        }
      }
      setTodos([data, ...todos]);
      setNewTodoTitle("");
      setShowInput(false);
      toast.success(videoId ? "Task added with AI-recommended video!" : "Task added!");
    } catch {
      toast.error("Failed to add task");
    } finally {
      setAdding(false);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    try {
      const { error } = await supabase.from("todos").update({ completed: !todo.completed }).eq("id", id);
      if (error) throw error;
      setTodos(todos.map((t) => {
        if (t.id === id) {
          const completed = !t.completed;
          if (completed) toast.success("Great job! Quiz unlocked!", { icon: <Trophy className="h-4 w-4 text-primary" /> });
          return { ...t, completed };
        }
        return t;
      }));
    } catch {
      toast.error("Failed to update task");
    }
  };

  const deleteTodo = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
      setTodos(todos.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeletingId(null);
    }
  };

  const avgQuizScore = recentQuizzes.length > 0
    ? Math.round(recentQuizzes.reduce((s, q) => s + q.score, 0) / recentQuizzes.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Greeting + Stats */}
        <section className="animate-fade-in">
          <div className="flex items-center gap-3 mb-1">
            <GreetingIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting.text},{" "}
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
          </div>
        </section>

        {/* Quick Stats Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{streak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalXp.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP · Lv {level}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgQuizScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(progress)}%</p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Daily Challenges */}
        <DailyChallengesCard />

        {/* 2-Column Layout: Recent Notes + Quiz Performance */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {/* Recent Notes */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Recent Notes
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/ai-notes")}>
                  View All
                </Button>
              </div>
              {recentNotes.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/ai-notes")}>
                    Generate Notes
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentNotes.map((note) => (
                    <button
                      key={note.id}
                      className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => navigate(`/notes/${note.todo_id}`)}
                    >
                      <p className="text-sm font-medium truncate">{note.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Sparkles className="h-3 w-3" /> AI Generated
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiz Performance */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  Quiz Performance
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/quiz-history")}>
                  History
                </Button>
              </div>
              {recentQuizzes.length === 0 ? (
                <div className="text-center py-6">
                  <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No quizzes taken yet</p>
                  <p className="text-xs text-muted-foreground">Complete a task to unlock quizzes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentQuizzes.map((q, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${q.score >= 80 ? "bg-green-500" : q.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`} />
                        <span className="text-sm">{q.correct_answers}/{q.total_questions} correct</span>
                      </div>
                      <Badge variant={q.score >= 80 ? "default" : "outline"} className="text-xs">
                        {q.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Upcoming Planner Sessions */}
        {plannerSessions.length > 0 && (
          <Card className="animate-fade-in">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Upcoming Study Sessions
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/study-planner")}>
                  Open Planner
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {plannerSessions.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-sm font-medium truncate">{s.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.topic}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{s.duration} min</span>
                      <Badge variant="outline" className={`text-[10px] ml-auto ${s.priority === "high" ? "border-red-500/50 text-red-400" : s.priority === "medium" ? "border-yellow-500/50 text-yellow-400" : "border-green-500/50 text-green-400"}`}>
                        {s.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weak Topic Recommendations */}
        <WeakTopicCards />

        {/* Todo List */}
        <section className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Study Tasks
            </h2>
          </div>

          <FilterBar />

          <div className="space-y-3">
            {todos.length === 0 && !showInput && (
              <div className="glass-card rounded-xl p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No study tasks yet.</p>
                <p className="text-sm text-muted-foreground">
                  Add a topic and AI will find the best video for you!
                </p>
              </div>
            )}

            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`glass-card rounded-xl p-4 transition-all duration-300 ${
                  todo.completed ? "opacity-70" : "hover:neon-glow"
                }`}
              >
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleTodo(todo.id)} className="flex-shrink-0 transition-transform hover:scale-110 mt-1">
                    {todo.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`block font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                      {todo.title}
                    </span>
                    {todo.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{todo.description}</p>
                    )}
                    {todo.video_id && (
                      <span className="text-xs text-primary flex items-center gap-1 mt-2">
                        <Star className="h-3 w-3" /> AI quality-scored video attached
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    {todo.video_id && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/video/${todo.id}`)}>
                        <Play className="h-4 w-4 mr-1" /> Watch
                      </Button>
                    )}
                    {todo.completed && (
                      <Button variant="success" size="sm" onClick={() => navigate(`/quiz/${todo.id}`)}>
                        <Trophy className="h-4 w-4 mr-1" /> Quiz
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTodo(todo.id)}
                      disabled={deletingId === todo.id}
                    >
                      {deletingId === todo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {showInput && (
              <form onSubmit={handleAddTodo} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI will find the best video for your topic
                </div>
                <Input
                  placeholder="What do you want to learn? (e.g., Machine Learning basics)"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="neon" disabled={adding || !newTodoTitle.trim()}>
                    {adding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Finding video...
                      </>
                    ) : (
                      "Add Task"
                    )}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowInput(false)} disabled={adding}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>

      {/* FAB */}
      {!showInput && (
        <Button
          variant="neon"
          size="fab"
          className="fixed bottom-6 right-6 animate-pulse-glow"
          onClick={() => setShowInput(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default Dashboard;
