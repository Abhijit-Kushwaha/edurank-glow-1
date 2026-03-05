import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, School, BarChart3 } from "lucide-react";
import { getRoleBadgeClass } from "@/hooks/usePermissions";

export default function SuperAdminOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ teachers: 0, students: 0, classrooms: 0, activeToday: 0 });
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!profile?.org_id) return;

    const load = async () => {
      const { data: org } = await supabase
        .from("organisations")
        .select("name, plan, status")
        .eq("id", profile.org_id)
        .single();
      
      if (org) setOrgName(org.name);

      const { count: teacherCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", profile.org_id)
        .eq("role", "teacher");

      const { count: studentCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", profile.org_id)
        .eq("role", "student");

      const { count: classroomCount } = await supabase
        .from("classrooms")
        .select("id", { count: "exact", head: true })
        .eq("org_id", profile.org_id)
        .eq("status", "active");

      setStats({
        teachers: teacherCount || 0,
        students: studentCount || 0,
        classrooms: classroomCount || 0,
        activeToday: 0,
      });
    };

    load();
  }, [profile]);

  const statCards = [
    { label: "Teachers", value: stats.teachers, icon: GraduationCap, color: "text-secondary" },
    { label: "Students", value: stats.students, icon: Users, color: "text-success" },
    { label: "Classrooms", value: stats.classrooms, icon: School, color: "text-primary" },
    { label: "Active Today", value: stats.activeToday, icon: BarChart3, color: "text-accent" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">
          {orgName && <>{orgName} · </>}
          <Badge variant="outline" className={getRoleBadgeClass("super_admin")}>Super Admin</Badge>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity yet. Start by inviting teachers and creating classrooms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Invite teachers to get started<br />
              • Create departments to organise your staff<br />
              • Set up org policies for content approval and AI usage
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
