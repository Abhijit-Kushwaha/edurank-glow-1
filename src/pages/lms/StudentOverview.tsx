import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { School, Brain, TrendingUp, Flame } from "lucide-react";

export default function StudentOverview() {
  const { profile } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile?.name || profile?.full_name || "Student"}</h1>
        <p className="text-muted-foreground">Your learning dashboard</p>
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
            <CardTitle className="text-sm text-muted-foreground">Classrooms</CardTitle>
            <School className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">0</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Today's Plan</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Join a classroom to see your learning plan here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
