import { useState, useEffect, useCallback } from "react";
import { Users, Shield, GraduationCap, UserCog, Crown, Eye, Share2, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StudentProgressDialog from "./StudentProgressDialog";
import CreditManager from "./CreditManager";

interface OrgMember {
  user_id: string;
  profile_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  total_xp: number;
  level: number;
  streak: number;
  total_quizzes: number;
  average_score: number;
  last_activity: string | null;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string; badgeVariant: "default" | "secondary" | "outline" | "destructive" }> = {
  super_admin: { label: "Super Admin", icon: Crown, color: "text-yellow-500", badgeVariant: "default" },
  admin: { label: "Admin", icon: Shield, color: "text-primary", badgeVariant: "secondary" },
  teacher: { label: "Teacher", icon: UserCog, color: "text-green-500", badgeVariant: "outline" },
  student: { label: "Student", icon: GraduationCap, color: "text-muted-foreground", badgeVariant: "outline" },
};

interface MemberManagerProps {
  orgId: string;
}

export default function MemberManager({ orgId }: MemberManagerProps) {
  const { profile } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [newRole, setNewRole] = useState("");
  const [changingRole, setChangingRole] = useState(false);
  const [viewingProgress, setViewingProgress] = useState<string | null>(null);

  const callerRole = profile?.role as string || "student";
  const canManageRoles = ["super_admin", "admin"].includes(callerRole);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_org_members_with_stats", { p_org_id: orgId });
      if (error) throw error;
      setMembers((data as any[]) || []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleChangeRole = async () => {
    if (!selectedMember || !newRole) return;
    setChangingRole(true);
    try {
      const { data, error } = await supabase.rpc("set_member_role", {
        p_target_user_id: selectedMember.user_id,
        p_new_role: newRole,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        toast.success(`Role updated to ${ROLE_CONFIG[newRole]?.label || newRole}`);
        setShowRoleDialog(false);
        fetchMembers();
      } else {
        toast.error(result?.error || "Failed to change role");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change role");
    } finally {
      setChangingRole(false);
    }
  };

  const getAvailableRoles = () => {
    if (callerRole === "super_admin") return ["super_admin", "admin", "teacher", "student"];
    if (callerRole === "admin") return ["admin", "teacher", "student"];
    return [];
  };

  const filteredMembers = members.filter(m => {
    const matchSearch = !search || (m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()));
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: members.length,
    admins: members.filter(m => m.role === "admin" || m.role === "super_admin").length,
    teachers: members.filter(m => m.role === "teacher").length,
    students: members.filter(m => m.role === "student").length,
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Members
          </h2>
          <p className="text-sm text-muted-foreground">Manage organization members and their roles</p>
        </div>
        {canManageRoles && (
          <CreditManager
            members={members.map(m => ({ user_id: m.user_id, name: m.name, role: m.role }))}
            onCreditsChanged={() => fetchMembers()}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users },
          { label: "Admins", value: stats.admins, icon: Shield },
          { label: "Teachers", value: stats.teachers, icon: UserCog },
          { label: "Students", value: stats.students, icon: GraduationCap },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {filteredMembers.map(member => {
          const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.student;
          const Icon = rc.icon;
          return (
            <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback>{(member.name || "?")[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{member.name || "Unknown"}</p>
                  <Badge variant={rc.badgeVariant} className="text-[10px] gap-1">
                    <Icon className={`h-3 w-3 ${rc.color}`} />
                    {rc.label}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                <div className="text-center">
                  <p className="font-semibold text-foreground">{member.total_xp}</p>
                  <p className="text-[10px]">XP</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">{member.total_quizzes}</p>
                  <p className="text-[10px]">Quizzes</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">{Number(member.average_score).toFixed(0)}%</p>
                  <p className="text-[10px]">Avg</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">🔥{member.streak}</p>
                  <p className="text-[10px]">Streak</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {["super_admin", "admin", "teacher"].includes(callerRole) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingProgress(member.user_id)} title="View progress">
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {canManageRoles && member.user_id !== profile?.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedMember(member);
                      setNewRole(member.role);
                      setShowRoleDialog(true);
                    }}
                    title="Change role"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No members found</p>
        )}
      </div>

      {/* Role change dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role for {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Current role: <Badge variant="outline">{ROLE_CONFIG[selectedMember?.role || "student"]?.label}</Badge>
              </p>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map(r => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-2">
                        {ROLE_CONFIG[r]?.label || r}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Role Permissions:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {newRole === "super_admin" && <li>Full control over the organization, can manage all roles</li>}
                {newRole === "admin" && <li>Can manage teachers and students, view all progress</li>}
                {newRole === "teacher" && <li>Can view student progress, create content and classes</li>}
                {newRole === "student" && <li>Can take quizzes, view own progress, participate in channels</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            <Button onClick={handleChangeRole} disabled={changingRole || newRole === selectedMember?.role}>
              {changingRole ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student progress dialog */}
      {viewingProgress && (
        <StudentProgressDialog
          studentUserId={viewingProgress}
          open={!!viewingProgress}
          onOpenChange={() => setViewingProgress(null)}
        />
      )}
    </div>
  );
}
