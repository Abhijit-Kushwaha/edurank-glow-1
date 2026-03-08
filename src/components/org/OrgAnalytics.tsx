import { BarChart3, Users, BookOpen, Trophy, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrgAnalyticsProps {
  org: {
    id: string;
    name: string;
  } | null;
}

const statCards = [
  { label: "Active Students", value: "—", icon: Users, color: "text-primary" },
  { label: "Study Hours", value: "—", icon: Clock, color: "text-secondary" },
  { label: "Quizzes Completed", value: "—", icon: BookOpen, color: "text-accent" },
  { label: "Avg. Score", value: "—", icon: TrendingUp, color: "text-success" },
  { label: "Top Performer", value: "—", icon: Trophy, color: "text-primary" },
  { label: "Engagement Rate", value: "—", icon: BarChart3, color: "text-secondary" },
];

export default function OrgAnalytics({ org }: OrgAnalyticsProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Organization Analytics
        </h2>
        <p className="text-sm text-muted-foreground">Track engagement, performance, and learning insights</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(stat => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">AI Learning Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect your organization's classroom data to see AI-powered insights about student performance,
            weak topics, and personalized learning recommendations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
