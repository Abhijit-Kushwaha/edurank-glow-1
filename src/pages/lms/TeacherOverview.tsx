import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School, Users, ClipboardList, Plus } from "lucide-react";

interface Classroom {
  id: string;
  name: string;
  subject: string | null;
  status: string;
  cover_color: string;
}

export default function TeacherOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const { data } = await supabase
        .from("classrooms")
        .select("id, name, subject, status, cover_color")
        .eq("owner_id", profile.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });
      setClassrooms(data || []);
    };
    load();
  }, [profile]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.name || profile?.full_name || "Teacher"}</h1>
          <p className="text-muted-foreground">Manage your classrooms and content</p>
        </div>
        <Button onClick={() => navigate("/teacher/classrooms")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Classroom
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">My Classrooms</CardTitle>
            <School className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{classrooms.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">0</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ungraded</CardTitle>
            <ClipboardList className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">0</div></CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">My Classrooms</h2>
        {classrooms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <School className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-3">No classrooms yet</p>
              <Button onClick={() => navigate("/teacher/classrooms")}>Create your first classroom</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map(c => (
              <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/teacher/classrooms/${c.id}/overview`)}>
                <div className="h-2 rounded-t-lg" style={{ backgroundColor: c.cover_color }} />
                <CardHeader>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{c.subject || "No subject"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
