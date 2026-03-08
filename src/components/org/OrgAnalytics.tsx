import { useState, useEffect } from "react";
import { BarChart3, Users, BookOpen, Trophy, Clock, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface OrgAnalyticsProps {
  org: {
    id: string;
    name: string;
  } | null;
}

interface AnalyticsData {
  totalMembers: number;
  students: number;
  teachers: number;
  admins: number;
  totalQuizzes: number;
  avgScore: number;
  totalBattles: number;
  topPerformer: string;
  totalChannelMessages: number;
  pendingJoinRequests: number;
  recentJoins: number;
  totalClassrooms: number;
}

export default function OrgAnalytics({ org }: OrgAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!org?.id) return;
    setLoading(true);
    try {
      const [
        membersRes,
        quizzesRes,
        battlesRes,
        messagesRes,
        requestsRes,
        classroomsRes,
        topRes,
      ] = await Promise.all([
        // Members by role
        supabase.from("profiles").select("role").eq("org_id", org.id),
        // Quiz results from org members
        supabase.from("profiles").select("user_id").eq("org_id", org.id),
        // Battles
        supabase.from("battles").select("id", { count: "exact", head: true }).eq("org_id", org.id),
        // Channel messages count
        (supabase as any).from("channels").select("id").eq("org_id", org.id),
        // Pending join requests
        supabase.from("org_join_requests").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "pending"),
        // Classrooms
        (supabase as any).from("classrooms").select("id", { count: "exact", head: true }).eq("org_id", org.id),
        // Top performer via leaderboard
        supabase.from("profiles").select("name, total_xp").eq("org_id", org.id).order("total_xp", { ascending: false }).limit(1),
      ]);

      const members = membersRes.data || [];
      const students = members.filter((m: any) => m.role === "student").length;
      const teachers = members.filter((m: any) => m.role === "teacher").length;
      const admins = members.filter((m: any) => ["admin", "super_admin"].includes(m.role)).length;

      // Get quiz stats for org members
      const memberUserIds = (quizzesRes.data || []).map((p: any) => p.user_id);
      let totalQuizzes = 0;
      let avgScore = 0;
      if (memberUserIds.length > 0) {
        const { data: quizData } = await supabase
          .from("leaderboard_stats")
          .select("total_quizzes, average_score")
          .in("user_id", memberUserIds.slice(0, 100));
        if (quizData && quizData.length > 0) {
          totalQuizzes = quizData.reduce((sum: number, q: any) => sum + (q.total_quizzes || 0), 0);
          avgScore = quizData.reduce((sum: number, q: any) => sum + (Number(q.average_score) || 0), 0) / quizData.length;
        }
      }

      // Count messages across org channels
      let totalMessages = 0;
      if (messagesRes.data && messagesRes.data.length > 0) {
        const channelIds = messagesRes.data.map((c: any) => c.id);
        const { count } = await (supabase as any)
          .from("channel_messages")
          .select("id", { count: "exact", head: true })
          .in("channel_id", channelIds);
        totalMessages = count || 0;
      }

      // Recent joins (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: recentCount } = await supabase
        .from("org_join_requests")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("status", "approved")
        .gte("created_at", weekAgo.toISOString());

      setData({
        totalMembers: members.length,
        students,
        teachers,
        admins,
        totalQuizzes,
        avgScore: Math.round(avgScore * 10) / 10,
        totalBattles: battlesRes.count || 0,
        topPerformer: (topRes.data?.[0] as any)?.name || "—",
        totalChannelMessages: totalMessages,
        pendingJoinRequests: requestsRes.count || 0,
        recentJoins: recentCount || 0,
        totalClassrooms: classroomsRes.count || 0,
      });
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [org?.id]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    { label: "Total Members", value: data.totalMembers, icon: Users, detail: `${data.students}S · ${data.teachers}T · ${data.admins}A` },
    { label: "Quizzes Taken", value: data.totalQuizzes, icon: BookOpen, detail: `Avg score: ${data.avgScore}%` },
    { label: "Battles Played", value: data.totalBattles, icon: Trophy, detail: "Org battles" },
    { label: "Avg Score", value: `${data.avgScore}%`, icon: TrendingUp, detail: "Across all members" },
    { label: "Top Performer", value: data.topPerformer, icon: Trophy, detail: "Highest XP" },
    { label: "Channel Messages", value: data.totalChannelMessages, icon: BarChart3, detail: "Total messages sent" },
    { label: "Classrooms", value: data.totalClassrooms, icon: BookOpen, detail: "Active classrooms" },
    { label: "Pending Requests", value: data.pendingJoinRequests, icon: Clock, detail: `${data.recentJoins} joined this week` },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Organization Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Real-time insights for {org?.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(stat => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{stat.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role distribution */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Member Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {[
              { label: "Students", count: data.students, pct: data.totalMembers ? Math.round((data.students / data.totalMembers) * 100) : 0 },
              { label: "Teachers", count: data.teachers, pct: data.totalMembers ? Math.round((data.teachers / data.totalMembers) * 100) : 0 },
              { label: "Admins", count: data.admins, pct: data.totalMembers ? Math.round((data.admins / data.totalMembers) * 100) : 0 },
            ].map(role => (
              <div key={role.label} className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{role.label}</span>
                  <Badge variant="outline" className="text-[10px]">{role.count}</Badge>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${role.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{role.pct}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
