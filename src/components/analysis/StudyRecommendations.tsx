import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Play,
  BookOpen,
  Target,
  Clock,
  Zap,
  ArrowRight,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

interface Recommendation {
  id: string;
  type: "watch_video" | "practice_quiz" | "review_topic" | "master_weak";
  title: string;
  description: string;
  topicName: string;
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  videoId?: string;
  todoId?: string;
  topicId?: string;
}

const StudyRecommendations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{
    videoId: string;
    title?: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      generateRecommendations();
    }
  }, [user]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const recs: Recommendation[] = [];

      // Fetch weak topics
      const { data: weakTopics } = await supabase
        .from("user_topic_performance")
        .select(
          `
          id,
          topic_id,
          weakness_score,
          strength_status,
          topics (name)
        `,
        )
        .eq("user_id", user?.id)
        .eq("strength_status", "weak")
        .order("weakness_score", { ascending: false })
        .limit(3);

      // Add recommendations for weak topics
      weakTopics?.forEach((topic: any) => {
        recs.push({
          id: `weak-${topic.topic_id}`,
          type: "master_weak",
          title: `Master: ${topic.topics?.name}`,
          description: `Your weakness score is ${topic.weakness_score}. Focused practice can improve this significantly.`,
          topicName: topic.topics?.name || "Unknown",
          priority: "high",
          estimatedTime: "10-15 mins",
          topicId: topic.topic_id,
        });
      });

      // Fetch recent videos not watched
      const { data: recentTodos } = await supabase
        .from("todos")
        .select(
          `
          id,
          title,
          video_id,
          video_progress (progress_percent)
        `,
        )
        .eq("user_id", user?.id)
        .not("video_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      // Find unwatched videos
      recentTodos?.forEach((todo: any) => {
        const progress = todo.video_progress?.[0]?.progress_percent || 0;
        if (progress < 80 && todo.video_id) {
          recs.push({
            id: `video-${todo.id}`,
            type: "watch_video",
            title: `Continue: ${todo.title}`,
            description: `You've watched ${progress}% of this video. Complete it to unlock the quiz!`,
            topicName: todo.title,
            priority: progress > 30 ? "high" : "medium",
            estimatedTime: "5-10 mins",
            videoId: todo.video_id,
            todoId: todo.id,
          });
        }
      });

      // Fetch topics needing review (moderate status)
      const { data: moderateTopics } = await supabase
        .from("user_topic_performance")
        .select(
          `
          id,
          topic_id,
          weakness_score,
          last_updated,
          topics (name)
        `,
        )
        .eq("user_id", user?.id)
        .eq("strength_status", "moderate")
        .order("last_updated", { ascending: true })
        .limit(2);

      moderateTopics?.forEach((topic: any) => {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(topic.last_updated).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysSinceUpdate > 3) {
          recs.push({
            id: `review-${topic.topic_id}`,
            type: "review_topic",
            title: `Review: ${topic.topics?.name}`,
            description: `It's been ${daysSinceUpdate} days since you last practiced this. A quick review will help retention.`,
            topicName: topic.topics?.name || "Unknown",
            priority: daysSinceUpdate > 7 ? "high" : "medium",
            estimatedTime: "5-10 mins",
            topicId: topic.topic_id,
          });
        }
      });

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recs.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      );

      setRecommendations(recs.slice(0, 6));
    } catch (error) {
      console.error("Error generating recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (rec: Recommendation) => {
    switch (rec.type) {
      case "watch_video":
        if (rec.videoId) {
          setSelectedVideo({ videoId: rec.videoId, title: rec.topicName });
        } else if (rec.todoId) {
          navigate(`/video/${rec.todoId}`);
        }
        break;
      case "practice_quiz":
        if (rec.todoId) navigate(`/quiz/${rec.todoId}`);
        break;
      case "master_weak":
      case "review_topic":
        navigate("/fix-weak-areas");
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "watch_video":
        return Play;
      case "practice_quiz":
        return BookOpen;
      case "master_weak":
        return AlertTriangle;
      case "review_topic":
        return RefreshCw;
      default:
        return Lightbulb;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High Priority</Badge>;
      case "medium":
        return <Badge variant="warning">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground text-sm">
            You're doing great! Start a new topic to keep learning.
          </p>
          <Button
            variant="neon"
            className="mt-4"
            onClick={() => navigate("/dashboard")}
          >
            Add New Topic
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <Card className="glass-card bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Personalized Study Plan</h3>
              <p className="text-sm text-muted-foreground">
                Based on your performance, here's what we recommend focusing on
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const Icon = getIcon(rec.type);
          return (
            <Card
              key={rec.id}
              className="glass-card hover:neon-glow transition-all duration-300"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      rec.priority === "high"
                        ? "bg-destructive/10"
                        : rec.priority === "medium"
                          ? "bg-warning/10"
                          : "bg-muted"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        rec.priority === "high"
                          ? "text-destructive"
                          : rec.priority === "medium"
                            ? "text-warning"
                            : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{rec.title}</h4>
                      {getPriorityBadge(rec.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {rec.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {rec.estimatedTime}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(rec)}
                      >
                        Start
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/fix-weak-areas")}
            >
              <Target className="h-5 w-5" />
              <span className="text-xs">Fix Weaknesses</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/quiz-history")}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Quiz History</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/leaderboard")}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">Leaderboard</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/dashboard")}
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-xs">New Topic</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Player Dialog */}
      <VideoPlayerDialog
        open={!!selectedVideo}
        onOpenChange={(open) => !open && setSelectedVideo(null)}
        videoId={selectedVideo?.videoId || ""}
        videoTitle={selectedVideo?.title}
      />
    </div>
  );
};

export default StudyRecommendations;
