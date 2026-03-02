import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TopicPerformance {
  id: string;
  topicId: string;
  topicName: string;
  weaknessScore: number;
  strengthStatus: "strong" | "moderate" | "weak";
  correctAnswers: number;
  totalQuestions: number;
  avgTime: number;
  wrongOnEasy: number;
  wrongOnMedium: number;
  wrongOnHard: number;
}

const StrengthsWeaknesses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<TopicPerformance[]>([]);

  useEffect(() => {
    if (user) {
      fetchTopicPerformance();
    }
  }, [user]);

  const fetchTopicPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from("user_topic_performance")
        .select(
          `
          id,
          topic_id,
          weakness_score,
          strength_status,
          correct_answers,
          total_questions,
          avg_time_seconds,
          wrong_on_easy,
          wrong_on_medium,
          wrong_on_hard,
          topics (name)
        `,
        )
        .eq("user_id", user?.id)
        .order("weakness_score", { ascending: false });

      if (error) throw error;

      const formattedTopics: TopicPerformance[] = (data || []).map(
        (t: any) => ({
          id: t.id,
          topicId: t.topic_id,
          topicName: t.topics?.name || "Unknown Topic",
          weaknessScore: t.weakness_score,
          strengthStatus: t.strength_status as "strong" | "moderate" | "weak",
          correctAnswers: t.correct_answers,
          totalQuestions: t.total_questions,
          avgTime: t.avg_time_seconds,
          wrongOnEasy: t.wrong_on_easy,
          wrongOnMedium: t.wrong_on_medium,
          wrongOnHard: t.wrong_on_hard,
        }),
      );

      setTopics(formattedTopics);
    } catch (error) {
      console.error("Error fetching topic performance:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAccuracy = (correct: number, total: number) => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const strongTopics = topics.filter((t) => t.strengthStatus === "strong");
  const moderateTopics = topics.filter((t) => t.strengthStatus === "moderate");
  const weakTopics = topics.filter((t) => t.strengthStatus === "weak");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No Topic Data Yet</h3>
          <p className="text-muted-foreground text-sm">
            Complete some quizzes to see your strengths and weaknesses analysis
          </p>
          <Button
            variant="neon"
            className="mt-4"
            onClick={() => navigate("/dashboard")}
          >
            Start Learning
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-success" />
              <span className="font-medium">Strong</span>
            </div>
            <p className="text-3xl font-bold text-success">
              {strongTopics.length}
            </p>
            <p className="text-xs text-muted-foreground">topics mastered</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              <span className="font-medium">Moderate</span>
            </div>
            <p className="text-3xl font-bold text-warning">
              {moderateTopics.length}
            </p>
            <p className="text-xs text-muted-foreground">topics improving</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium">Weak</span>
            </div>
            <p className="text-3xl font-bold text-destructive">
              {weakTopics.length}
            </p>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Weak Topics Section */}
      {weakTopics.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Areas Needing Improvement
            </CardTitle>
            <Button
              variant="neon"
              size="sm"
              onClick={() => navigate("/fix-weak-areas")}
            >
              <Zap className="h-4 w-4 mr-1" />
              Fix All
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} type="weak" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Moderate Topics Section */}
      {moderateTopics.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              Topics to Keep Practicing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {moderateTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} type="moderate" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Strong Topics Section */}
      {strongTopics.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-success" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {strongTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} type="strong" />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface TopicCardProps {
  topic: TopicPerformance;
  type: "strong" | "moderate" | "weak";
}

const TopicCard = ({ topic, type }: TopicCardProps) => {
  const accuracy =
    topic.totalQuestions > 0
      ? Math.round((topic.correctAnswers / topic.totalQuestions) * 100)
      : 0;

  const statusColors = {
    strong: "bg-success/10 border-success/20",
    moderate: "bg-warning/10 border-warning/20",
    weak: "bg-destructive/10 border-destructive/20",
  };

  const progressColors = {
    strong: "bg-success",
    moderate: "bg-warning",
    weak: "bg-destructive",
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[type]}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium">{topic.topicName}</h4>
          <p className="text-sm text-muted-foreground">
            {topic.correctAnswers}/{topic.totalQuestions} correct answers
          </p>
        </div>
        <Badge
          variant={
            type === "strong"
              ? "success"
              : type === "moderate"
                ? "warning"
                : "destructive"
          }
        >
          {accuracy}% accuracy
        </Badge>
      </div>

      <Progress value={100 - topic.weaknessScore} className="h-2 mb-3" />

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Avg: {topic.avgTime}s per question
        </div>
        {topic.wrongOnEasy > 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <XCircle className="h-3 w-3" />
            {topic.wrongOnEasy} wrong on easy
          </div>
        )}
        {topic.wrongOnMedium > 0 && (
          <div className="flex items-center gap-1 text-warning">
            <XCircle className="h-3 w-3" />
            {topic.wrongOnMedium} wrong on medium
          </div>
        )}
      </div>
    </div>
  );
};

export default StrengthsWeaknesses;
