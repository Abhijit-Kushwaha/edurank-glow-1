import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Users, UserPlus, TrendingUp, Megaphone, Calendar, Trophy, BookOpen, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface OrgDashboardHomeProps {
  org: any;
  onNavigate: (tab: string) => void;
}

export default function OrgDashboardHome({ org, onNavigate }: OrgDashboardHomeProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ members: 0, pendingRequests: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";
  const isTeacher = profile?.role === "teacher";

  useEffect(() => {
    if (!org?.id) return;
    const fetchDashboard = async () => {
      setLoading(true);
      const [membersRes, requestsRes, announcementsRes, leaderboardRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", org.id),
        isAdmin
          ? (supabase as any).from("org_join_requests").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "pending")
          : Promise.resolve({ count: 0 }),
        (supabase as any).from("lms_announcements").select("*").eq("org_id", org.id).order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("org_battle_leaderboard").select("display_name, brain_points, total_wins").eq("org_id", org.id).order("brain_points", { ascending: false }).limit(5),
      ]);

      setStats({
        members: membersRes.count || 0,
        pendingRequests: (requestsRes as any).count || 0,
      });
      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      if (leaderboardRes.data) setTopPerformers(leaderboardRes.data);
      setLoading(false);
    };
    fetchDashboard();
  }, [org?.id, isAdmin]);

  const orgTypeBadge: Record<string, string> = {
    school: "🏫 School",
    college: "🎓 College",
    coaching: "📚 Coaching",
    community: "🌐 Community",
    other: "🏢 Organization",
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto max-h-[calc(100vh-4rem)]">
      {/* Welcome Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/20 overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {org?.logo_url ? (
                    <img src={org.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold">{org?.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{orgTypeBadge[org?.org_type] || orgTypeBadge.other}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{profile?.role?.replace("_", " ")}</Badge>
                    </div>
                  </div>
                </div>
                {org?.description && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg">{org.description}</p>
                )}
              </div>
              <div className="hidden md:block">
                <div className="text-right text-xs text-muted-foreground">
                  <p>Plan: <span className="capitalize font-medium text-foreground">{org?.plan || "Free"}</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate("members")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.members}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate("join-requests")}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                  <p className="text-xs text-muted-foreground">Pending Requests</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate("batches")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quick Access</p>
                <p className="text-sm font-medium">Batches & Classes</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate("timetable")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quick Access</p>
                <p className="text-sm font-medium">Timetable</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No announcements yet</p>
              ) : (
                announcements.slice(0, 4).map((a: any) => (
                  <div key={a.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No battle data yet</p>
              ) : (
                topPerformers.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        #{i + 1}
                      </span>
                      <span className="text-sm font-medium">{p.display_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{p.total_wins}W</span>
                      <Badge variant="outline" className="text-xs">{p.brain_points} BP</Badge>
                    </div>
                  </div>
                ))
              )}
              {topPerformers.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => onNavigate("battles")}>
                  View Full Leaderboard
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions for Admin/Teacher */}
      {(isAdmin || isTeacher) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("members")}>
                    <Users className="h-3.5 w-3.5 mr-1.5" /> Manage Members
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("join-requests")}>
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Review Requests
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("analytics")}>
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> View Analytics
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("admin-settings")}>
                    <Building2 className="h-3.5 w-3.5 mr-1.5" /> Org Settings
                  </Button>
                </>
              )}
              {(isAdmin || isTeacher) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("teaching")}>
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Create Quiz
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("batches")}>
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Manage Batches
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
