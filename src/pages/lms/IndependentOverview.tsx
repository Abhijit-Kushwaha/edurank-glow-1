import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Flame, TrendingUp, Brain, BookOpen, ArrowRight } from "lucide-react";

export default function IndependentOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile?.name || profile?.full_name || "Student"}</h1>
        <p className="text-muted-foreground">Your personal learning workspace</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{profile?.streak || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">XP</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{profile?.xp || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Rank</CardTitle>
            <Brain className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent><div className="text-xl font-bold">{profile?.rank || "Novice"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Level</CardTitle>
            <BookOpen className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{profile?.level || 1}</div></CardContent>
        </Card>
      </div>

      {/* Legacy study tools CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <h3 className="font-semibold">Study Dashboard</h3>
            <p className="text-sm text-muted-foreground">Access AI Chat, Video Search, Quizzes, and more</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Open <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Getting Started</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create notes, take quizzes, and track your progress. 
            If you've been invited to a school, check your email for the invite link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
