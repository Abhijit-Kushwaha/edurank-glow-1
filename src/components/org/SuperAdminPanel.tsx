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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, Shield, Copy, Users, Trash2, AlertTriangle, 
  Brain, Clock, FileText, Loader2, RefreshCw, Save
} from "lucide-react";
import { toast } from "sonner";

interface OrgSettings {
  id: string;
  name: string;
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

export default function SuperAdminPanel({ orgId }: { orgId: string }) {
  const { profile } = useAuth();
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

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
    if (!org || !isSuperAdmin) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organisations")
        .update({
          name: org.name,
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">Super Admin Controls</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
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
            <Badge variant={org.plan === "free" ? "secondary" : "default"} className="mb-1">
              {org.plan}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Current Plan</p>
          </CardContent>
        </Card>
      </div>

      {/* General Settings */}
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
              disabled={!isSuperAdmin}
            />
          </div>

          <div className="space-y-2">
            <Label>Invite Code</Label>
            <div className="flex gap-2">
              <Input
                value={org.invite_code}
                readOnly
                className="font-mono tracking-widest"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(org.invite_code);
                  toast.success("Code copied!");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              {isSuperAdmin && (
                <Button variant="outline" size="icon" onClick={regenerateInviteCode}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Invite Mode</Label>
            <Select
              value={org.invite_mode}
              onValueChange={(v) => setOrg({ ...org, invite_mode: v })}
              disabled={!isSuperAdmin}
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
              disabled={!isSuperAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
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
              disabled={!isSuperAdmin}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-destructive">AI Kill Switch</Label>
              <p className="text-xs text-muted-foreground">Emergency disable all AI features</p>
            </div>
            <Switch
              checked={org.ai_kill_switch}
              onCheckedChange={(v) => setOrg({ ...org, ai_kill_switch: v })}
              disabled={!isSuperAdmin}
            />
          </div>

          <div className="space-y-2">
            <Label>Max AI Tokens/Day/Student</Label>
            <Input
              type="number"
              value={org.max_ai_tokens_per_day_per_student}
              onChange={(e) => setOrg({ ...org, max_ai_tokens_per_day_per_student: Number(e.target.value) || 0 })}
              disabled={!isSuperAdmin}
              min={0}
              max={50000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Academic Settings */}
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
              disabled={!isSuperAdmin}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="penalty">Penalty (deduct per day)</SelectItem>
                <SelectItem value="accept">Accept (no penalty)</SelectItem>
                <SelectItem value="reject">Reject (no late submissions)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Late Penalty (%/day)</Label>
            <Input
              type="number"
              value={org.late_penalty_percent_per_day}
              onChange={(e) => setOrg({ ...org, late_penalty_percent_per_day: Number(e.target.value) || 0 })}
              disabled={!isSuperAdmin}
              min={0}
              max={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Quiz Retakes</Label>
            <Input
              type="number"
              value={org.max_quiz_retakes}
              onChange={(e) => setOrg({ ...org, max_quiz_retakes: Number(e.target.value) || 1 })}
              disabled={!isSuperAdmin}
              min={1}
              max={99}
            />
          </div>

          <div className="space-y-2">
            <Label>Score Counts As</Label>
            <Select
              value={org.score_counts_as}
              onValueChange={(v) => setOrg({ ...org, score_counts_as: v })}
              disabled={!isSuperAdmin}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best Score</SelectItem>
                <SelectItem value="latest">Latest Score</SelectItem>
                <SelectItem value="average">Average Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Grading Lock (days after submission)</Label>
            <Input
              type="number"
              value={org.grading_lock_days}
              onChange={(e) => setOrg({ ...org, grading_lock_days: Number(e.target.value) || 7 })}
              disabled={!isSuperAdmin}
              min={1}
              max={365}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Retention (days)</Label>
            <Input
              type="number"
              value={org.data_retention_days}
              onChange={(e) => setOrg({ ...org, data_retention_days: Number(e.target.value) || 365 })}
              disabled={!isSuperAdmin}
              min={30}
              max={3650}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {isSuperAdmin && (
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      )}
    </div>
  );
}
