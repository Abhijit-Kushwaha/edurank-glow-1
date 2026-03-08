import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings, Shield, Copy, Users, Trash2, AlertTriangle,
  Brain, Clock, FileText, Loader2, RefreshCw, Save,
  Megaphone, History, UserX, Ban, Send, Search,
  AlertCircle, CheckCircle, XCircle, Eye
} from "lucide-react";
import { toast } from "sonner";

interface OrgSettings {
  id: string;
  name: string;
  domain: string | null;
  invite_code: string;
  invite_mode: string;
  content_approval_required: boolean;
  ai_enabled: boolean;
  ai_kill_switch: boolean;
  max_ai_tokens_per_day_per_student: number;
  late_submission_policy: string;
  late_penalty_percent_per_day: number;
  max_quiz_retakes: number;
  score_counts_as: string;
  grading_lock_days: number;
  data_retention_days: number;
  status: string;
  plan: string;
}

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: any;
  ip_address: string | null;
  created_at: string;
  actor_name?: string;
}

interface OrgMember {
  user_id: string;
  profile_id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
}

export default function SuperAdminPanel({ orgId }: { orgId: string }) {
  const { profile } = useAuth();
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [activeTab, setActiveTab] = useState("general");

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Announcement
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Member management
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<OrgMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Danger zone
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);
  const [dangerAction, setDangerAction] = useState<"suspend" | "activate" | null>(null);
  const [dangerConfirmText, setDangerConfirmText] = useState("");

  const isAdmin = profile?.role && ["super_admin", "admin"].includes(profile.role);
  const isSuperAdmin = profile?.role === "super_admin";

  useEffect(() => {
    const fetchOrg = async () => {
      const [orgRes, memberRes, requestRes] = await Promise.all([
        supabase.from("organisations").select("*").eq("id", orgId).single(),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("org_join_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
      ]);
      if (orgRes.data) setOrg(orgRes.data as unknown as OrgSettings);
      setMemberCount(memberRes.count || 0);
      setPendingRequests(requestRes.count || 0);
      setLoading(false);
    };
    fetchOrg();
  }, [orgId]);

  const handleSave = async () => {
    if (!org || !isAdmin) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organisations")
        .update({
          name: org.name,
          domain: org.domain,
          invite_mode: org.invite_mode,
          content_approval_required: org.content_approval_required,
          ai_enabled: org.ai_enabled,
          ai_kill_switch: org.ai_kill_switch,
          max_ai_tokens_per_day_per_student: org.max_ai_tokens_per_day_per_student,
          late_submission_policy: org.late_submission_policy,
          late_penalty_percent_per_day: org.late_penalty_percent_per_day,
          max_quiz_retakes: org.max_quiz_retakes,
          score_counts_as: org.score_counts_as,
          grading_lock_days: org.grading_lock_days,
          data_retention_days: org.data_retention_days,
        } as any)
        .eq("id", orgId);

      if (error) throw error;
      toast.success("Organization settings saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const regenerateInviteCode = async () => {
    if (!isSuperAdmin) return;
    try {
      const newCode = Array.from({ length: 8 }, () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]
      ).join("");

      const { error } = await supabase
        .from("organisations")
        .update({ invite_code: newCode } as any)
        .eq("id", orgId);

      if (error) throw error;
      setOrg((prev) => prev ? { ...prev, invite_code: newCode } : prev);
      toast.success("Invite code regenerated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate code");
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const { data: logs } = await (supabase as any)
        .from("lms_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (logs && logs.length > 0) {
        const actorIds = [...new Set(logs.map((l: any) => l.actor_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", actorIds as string[]);

        const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));
        setAuditLogs(logs.map((l: any) => ({ ...l, actor_name: nameMap.get(l.actor_id) || "Unknown" })));
      } else {
        setAuditLogs([]);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Send announcement
  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim() || !profile) return;
    setSendingAnnouncement(true);
    try {
      const { error } = await (supabase as any).from("lms_announcements").insert({
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        org_id: orgId,
        created_by: profile.id,
      });
      if (error) throw error;
      toast.success("Announcement sent to all members!");
      setAnnouncementTitle("");
      setAnnouncementBody("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send announcement");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  // Fetch members for admin actions
  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const { data } = await supabase.rpc("get_org_members_with_stats", { p_org_id: orgId });
      setMembers((data as any[]) || []);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  // Remove member from org
  const handleRemoveMember = async () => {
    if (!confirmRemove) return;
    setRemovingMember(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ org_id: null, role: "student" } as any)
        .eq("user_id", confirmRemove.user_id);

      if (error) throw error;
      toast.success(`${confirmRemove.name || "Member"} removed from organization`);
      setConfirmRemove(null);
      fetchMembers();
      setMemberCount(prev => prev - 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    } finally {
      setRemovingMember(false);
    }
  };

  // Danger zone: suspend/activate org
  const handleDangerAction = async () => {
    if (!dangerAction || !org) return;
    const newStatus = dangerAction === "suspend" ? "suspended" : "active";
    try {
      const { error } = await supabase
        .from("organisations")
        .update({ status: newStatus } as any)
        .eq("id", orgId);
      if (error) throw error;
      setOrg(prev => prev ? { ...prev, status: newStatus } : prev);
      toast.success(`Organization ${newStatus === "suspended" ? "suspended" : "activated"}!`);
      setShowDangerConfirm(false);
      setDangerConfirmText("");
      setDangerAction(null);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) return null;

  const filteredMembers = members.filter(m => {
    if (!memberSearch) return true;
    const s = memberSearch.toLowerCase();
    return m.name?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s);
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Admin Settings</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={org.status === "active" ? "default" : "destructive"}>
            {org.status}
          </Badge>
          <Badge variant="outline">{org.plan}</Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{memberCount}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{pendingRequests}</p>
            <p className="text-xs text-muted-foreground">Pending Requests</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Brain className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{org.ai_enabled ? "On" : "Off"}</p>
            <p className="text-xs text-muted-foreground">AI Features</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold capitalize">{org.invite_mode}</p>
            <p className="text-xs text-muted-foreground">Invite Mode</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="general" className="text-xs"><Settings className="h-3 w-3 mr-1" />General</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs"><Brain className="h-3 w-3 mr-1" />AI</TabsTrigger>
          <TabsTrigger value="academic" className="text-xs"><FileText className="h-3 w-3 mr-1" />Academic</TabsTrigger>
          <TabsTrigger value="announce" className="text-xs"><Megaphone className="h-3 w-3 mr-1" />Announce</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs" onClick={() => { if (auditLogs.length === 0) fetchAuditLogs(); }}><History className="h-3 w-3 mr-1" />Audit</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" /> General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  value={org.name}
                  onChange={(e) => setOrg({ ...org, name: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label>Domain (optional)</Label>
                <Input
                  value={org.domain || ""}
                  onChange={(e) => setOrg({ ...org, domain: e.target.value || null })}
                  disabled={!isAdmin}
                  placeholder="e.g. academy.example.com"
                />
              </div>

              <div className="space-y-3">
                <Label>Role-Specific Invite Codes</Label>
                <p className="text-xs text-muted-foreground">Each code auto-assigns the corresponding role when a user joins.</p>
                {[
                  { key: "invite_code_student", label: "Student Code", color: "text-blue-500" },
                  { key: "invite_code_teacher", label: "Teacher Code", color: "text-amber-500" },
                  { key: "invite_code_admin", label: "Admin Code", color: "text-destructive" },
                ].map(({ key, label, color }) => (
                  <div key={key} className="space-y-1">
                    <Label className={`text-xs ${color}`}>{label}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={(org as any)[key] || ""}
                        readOnly
                        className="font-mono tracking-widest text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText((org as any)[key] || "");
                          toast.success(`${label} copied!`);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={async () => {
                            const newCode = Array.from({ length: 8 }, () =>
                              "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]
                            ).join("");
                            const { error } = await supabase
                              .from("organisations")
                              .update({ [key]: newCode } as any)
                              .eq("id", orgId);
                            if (error) { toast.error("Failed to regenerate"); return; }
                            setOrg(prev => prev ? { ...prev, [key]: newCode } : prev);
                            toast.success(`${label} regenerated!`);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Invite Mode</Label>
                <Select
                  value={org.invite_mode}
                  onValueChange={(v) => setOrg({ ...org, invite_mode: v })}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open (anyone with code)</SelectItem>
                    <SelectItem value="restricted">Restricted (approval required)</SelectItem>
                    <SelectItem value="closed">Closed (no new members)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Content Approval Required</Label>
                  <p className="text-xs text-muted-foreground">Teachers must get content approved before publishing</p>
                </div>
                <Switch
                  checked={org.content_approval_required}
                  onCheckedChange={(v) => setOrg({ ...org, content_approval_required: v })}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Member Management */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserX className="h-5 w-5" /> Quick Member Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.length === 0 && (
                <Button variant="outline" size="sm" onClick={fetchMembers} disabled={membersLoading}>
                  {membersLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Load Members
                </Button>
              )}
              {members.length > 0 && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members to remove..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="max-h-60">
                    <div className="space-y-1">
                      {filteredMembers.slice(0, 20).map(m => (
                        <div key={m.user_id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">{(m.name || "?")[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{m.name}</p>
                              <p className="text-[10px] text-muted-foreground">{m.email} · {m.role}</p>
                            </div>
                          </div>
                          {m.user_id !== profile?.user_id && isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => setConfirmRemove(m)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>

          {/* Save */}
          {isAdmin && (
            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving..." : "Save General Settings"}
            </Button>
          )}
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" /> AI Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>AI Features Enabled</Label>
                  <p className="text-xs text-muted-foreground">Enable AI-powered features for org members</p>
                </div>
                <Switch
                  checked={org.ai_enabled}
                  onCheckedChange={(v) => setOrg({ ...org, ai_enabled: v })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> AI Kill Switch
                  </Label>
                  <p className="text-xs text-muted-foreground">Emergency disable all AI features instantly</p>
                </div>
                <Switch
                  checked={org.ai_kill_switch}
                  onCheckedChange={(v) => setOrg({ ...org, ai_kill_switch: v })}
                  disabled={!isSuperAdmin}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Max AI Tokens/Day/Student</Label>
                <Input
                  type="number"
                  value={org.max_ai_tokens_per_day_per_student}
                  onChange={(e) => setOrg({ ...org, max_ai_tokens_per_day_per_student: Number(e.target.value) || 0 })}
                  disabled={!isAdmin}
                  min={0}
                  max={50000}
                />
                <p className="text-xs text-muted-foreground">Set to 0 to give unlimited tokens (not recommended)</p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">AI Feature Coverage:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>AI Chat (Doubt solving)</li>
                  <li>AI Notes Generation</li>
                  <li>AI Quiz Generation</li>
                  <li>AI Flashcard Generation</li>
                  <li>Weakness Analysis</li>
                  <li>Battle Question Generation</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving..." : "Save AI Settings"}
            </Button>
          )}
        </TabsContent>

        {/* Academic Settings */}
        <TabsContent value="academic" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" /> Academic Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Late Submission Policy</Label>
                <Select
                  value={org.late_submission_policy}
                  onValueChange={(v) => setOrg({ ...org, late_submission_policy: v })}
                  disabled={!isAdmin}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="penalty">Penalty (deduct per day)</SelectItem>
                    <SelectItem value="accept">Accept (no penalty)</SelectItem>
                    <SelectItem value="reject">Reject (no late submissions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Late Penalty (%/day)</Label>
                  <Input
                    type="number"
                    value={org.late_penalty_percent_per_day}
                    onChange={(e) => setOrg({ ...org, late_penalty_percent_per_day: Number(e.target.value) || 0 })}
                    disabled={!isAdmin}
                    min={0} max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Quiz Retakes</Label>
                  <Input
                    type="number"
                    value={org.max_quiz_retakes}
                    onChange={(e) => setOrg({ ...org, max_quiz_retakes: Number(e.target.value) || 1 })}
                    disabled={!isAdmin}
                    min={1} max={99}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Score Counts As</Label>
                <Select
                  value={org.score_counts_as}
                  onValueChange={(v) => setOrg({ ...org, score_counts_as: v })}
                  disabled={!isAdmin}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Best Score</SelectItem>
                    <SelectItem value="latest">Latest Score</SelectItem>
                    <SelectItem value="average">Average Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grading Lock (days)</Label>
                  <Input
                    type="number"
                    value={org.grading_lock_days}
                    onChange={(e) => setOrg({ ...org, grading_lock_days: Number(e.target.value) || 7 })}
                    disabled={!isAdmin}
                    min={1} max={365}
                  />
                  <p className="text-[10px] text-muted-foreground">Days after submission before grades lock</p>
                </div>
                <div className="space-y-2">
                  <Label>Data Retention (days)</Label>
                  <Input
                    type="number"
                    value={org.data_retention_days}
                    onChange={(e) => setOrg({ ...org, data_retention_days: Number(e.target.value) || 365 })}
                    disabled={!isAdmin}
                    min={30} max={3650}
                  />
                  <p className="text-[10px] text-muted-foreground">How long to keep student data</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving..." : "Save Academic Settings"}
            </Button>
          )}
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announce" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Megaphone className="h-5 w-5" /> Broadcast Announcement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send an important announcement to all organization members. This will appear in the announcements channel.
              </p>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g. Mid-term exam schedule released"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={announcementBody}
                  onChange={(e) => setAnnouncementBody(e.target.value)}
                  placeholder="Write your announcement here..."
                  rows={5}
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right">{announcementBody.length}/2000</p>
              </div>
              <Button
                onClick={handleSendAnnouncement}
                disabled={!announcementTitle.trim() || !announcementBody.trim() || sendingAnnouncement}
                className="w-full"
              >
                {sendingAnnouncement ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {sendingAnnouncement ? "Sending..." : "Send Announcement"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" /> Audit Log
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={auditLoading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${auditLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No audit logs yet</p>
                  <p className="text-xs">Actions like role changes, member removals, and settings updates will appear here.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {auditLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-3 p-2 rounded-md border border-border/30 text-sm">
                        <div className="mt-0.5">
                          {log.action.includes("delete") || log.action.includes("remove") ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : log.action.includes("create") || log.action.includes("approve") ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="font-medium">{log.actor_name}</span>
                            {" "}<span className="text-muted-foreground">{log.action}</span>
                            {" "}<Badge variant="outline" className="text-[9px]">{log.target_type}</Badge>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                            {log.ip_address && ` · ${log.ip_address}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone - Super Admin Only */}
      {isSuperAdmin && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20">
              <div>
                <p className="font-medium text-sm">
                  {org.status === "active" ? "Suspend Organization" : "Activate Organization"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {org.status === "active"
                    ? "Temporarily disable all org activities. Members won't be able to access org features."
                    : "Re-enable all org activities and member access."
                  }
                </p>
              </div>
              <Button
                variant={org.status === "active" ? "destructive" : "default"}
                size="sm"
                onClick={() => {
                  setDangerAction(org.status === "active" ? "suspend" : "activate");
                  setShowDangerConfirm(true);
                }}
              >
                {org.status === "active" ? <Ban className="h-4 w-4 mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                {org.status === "active" ? "Suspend" : "Activate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Remove Member Dialog */}
      <Dialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" /> Remove Member
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>{confirmRemove?.name}</strong> ({confirmRemove?.email}) from this organization?
            They will lose access to all org resources and their role will be reset to student.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={removingMember}>
              {removingMember ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Danger Zone Confirm Dialog */}
      <Dialog open={showDangerConfirm} onOpenChange={setShowDangerConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {dangerAction === "suspend" ? "Suspend Organization" : "Activate Organization"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {dangerAction === "suspend"
                ? "This will temporarily disable all organization activities. Type the organization name to confirm."
                : "This will re-enable all organization activities."
              }
            </p>
            {dangerAction === "suspend" && (
              <Input
                placeholder={`Type "${org.name}" to confirm`}
                value={dangerConfirmText}
                onChange={(e) => setDangerConfirmText(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDangerConfirm(false); setDangerConfirmText(""); }}>Cancel</Button>
            <Button
              variant={dangerAction === "suspend" ? "destructive" : "default"}
              onClick={handleDangerAction}
              disabled={dangerAction === "suspend" && dangerConfirmText !== org.name}
            >
              {dangerAction === "suspend" ? "Suspend" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
