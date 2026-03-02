import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Trophy, Target, Zap, Star } from "lucide-react";

interface PerformanceOverviewProps {
  overallStats: {
    totalQuizzes: number;
    totalQuestions: number;
    correctAnswers: number;
    averageScore: number;
    bestScore: number;
    totalStudyTime: number;
    topicsStudied: number;
    strongTopics: number;
    weakTopics: number;
  };
}

const PerformanceOverview = ({ overallStats }: PerformanceOverviewProps) => {
  const accuracy =
    overallStats.totalQuestions > 0
      ? Math.round(
          (overallStats.correctAnswers / overallStats.totalQuestions) * 100,
        )
      : 0;

  const pieData = [
    {
      name: "Correct",
      value: overallStats.correctAnswers,
      color: "hsl(var(--success))",
    },
    {
      name: "Incorrect",
      value: overallStats.totalQuestions - overallStats.correctAnswers,
      color: "hsl(var(--destructive))",
    },
  ];

  const topicData = [
    {
      name: "Strong",
      value: overallStats.strongTopics,
      fill: "hsl(var(--success))",
    },
    {
      name: "Moderate",
      value:
        overallStats.topicsStudied -
        overallStats.strongTopics -
        overallStats.weakTopics,
      fill: "hsl(var(--warning))",
    },
    {
      name: "Weak",
      value: overallStats.weakTopics,
      fill: "hsl(var(--destructive))",
    },
  ];

  const getPerformanceLevel = () => {
    if (accuracy >= 80)
      return { label: "Excellent", color: "text-success", icon: Trophy };
    if (accuracy >= 60)
      return { label: "Good", color: "text-primary", icon: Star };
    if (accuracy >= 40)
      return { label: "Average", color: "text-warning", icon: Target };
    return { label: "Needs Work", color: "text-destructive", icon: Zap };
  };

  const performance = getPerformanceLevel();
  const PerformanceIcon = performance.icon;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Accuracy Breakdown */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Answer Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Correct</span>
                </div>
                <span className="font-bold text-success">
                  {overallStats.correctAnswers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Incorrect</span>
                </div>
                <span className="font-bold text-destructive">
                  {overallStats.totalQuestions - overallStats.correctAnswers}
                </span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Accuracy
                  </span>
                  <span className="text-xl font-bold neon-text">
                    {accuracy}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Level */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PerformanceIcon className={`h-5 w-5 ${performance.color}`} />
            Performance Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className={`text-4xl font-bold ${performance.color}`}>
              {performance.label}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Based on your overall accuracy of {accuracy}%
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to next level</span>
              <span className="text-muted-foreground">
                {accuracy < 40
                  ? "40%"
                  : accuracy < 60
                    ? "60%"
                    : accuracy < 80
                      ? "80%"
                      : "100%"}{" "}
                needed
              </span>
            </div>
            <Progress value={accuracy} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{overallStats.bestScore}%</p>
              <p className="text-xs text-muted-foreground">Best Score</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {overallStats.totalQuestions}
              </p>
              <p className="text-xs text-muted-foreground">Total Questions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topic Distribution */}
      <Card className="glass-card md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Topic Mastery Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm">
                Strong ({overallStats.strongTopics})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-sm">
                Moderate (
                {overallStats.topicsStudied -
                  overallStats.strongTopics -
                  overallStats.weakTopics}
                )
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-sm">Weak ({overallStats.weakTopics})</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceOverview;
