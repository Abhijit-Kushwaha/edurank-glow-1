import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Hash, Megaphone, HelpCircle, BookOpen, Shield, FileText, BarChart3, Plus, Users, Swords, Copy, Check, GraduationCap, Calendar, Layers, ClipboardList, UserPlus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import ChannelView from "@/components/org/ChannelView";
import ChannelCreateDialog from "@/components/org/ChannelCreateDialog";
import RoleManager from "@/components/org/RoleManager";
import KnowledgeWorkspace from "@/components/org/KnowledgeWorkspace";
import OrgAnalytics from "@/components/org/OrgAnalytics";
import MemberManager from "@/components/org/MemberManager";
import TeacherSections from "@/components/org/TeacherSections";
import TimetableManager from "@/components/org/TimetableManager";
import BatchManager from "@/components/org/BatchManager";
import MarksManager from "@/components/org/MarksManager";
import JoinRequestsManager from "@/components/org/JoinRequestsManager";
import SuperAdminPanel from "@/components/org/SuperAdminPanel";
import JoinOrgCard from "@/components/org/JoinOrgCard";

const channelIcons: Record<string, typeof Hash> = {
  text: Hash,
  announcements: Megaphone,
  "doubt-solving": HelpCircle,
  resources: BookOpen,
  general: Hash,
};

export default function OrgWorkspace() {
  const { org, channels, roles, pages, loading, isOrgMember, createChannel, createRole, createPage, refetch } = useOrganization();
  const { user, profile } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [activeTab, setActiveTab] = useState("channels");

  // Create org dialog state
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  const handleCreateOrg = async () => {
    if (!orgName.trim() || !user) return;
    setCreatingOrg(true);
    try {
      // Create org + promote creator atomically via secure RPC
      const { data: rawResult, error: rpcError } = await supabase.rpc("create_organisation", {
        p_name: orgName.trim(),
      });

      const result = rawResult as any;
      if (rpcError || !result?.success) {
        toast.error(result?.error || rpcError?.message || "Failed to create organization");
        setCreatingOrg(false);
        return;
      }

      const orgId = result.org_id;

      // Create default channels
      const profileRes = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (profileRes.data) {
        const defaultChannels = [
          { name: "announcements", channel_type: "announcements", description: "Important announcements", position: 0 },
          { name: "general", channel_type: "general", description: "General discussion", position: 1 },
          { name: "doubt-solving", channel_type: "doubt-solving", description: "Ask and solve doubts", position: 2 },
          { name: "resources", channel_type: "resources", description: "Study resources and materials", position: 3 },
        ];

        await (supabase as any).from("channels").insert(
          defaultChannels.map(ch => ({
            ...ch,
            org_id: orgId,
            created_by: profileRes.data.id,
          }))
        );
      }

      toast.success(`"${orgName.trim()}" created! You are now the admin.`);
      setShowCreateOrg(false);
      setOrgName("");
      setOrgDescription("");
      // Reload to pick up updated profile with org_id
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setCreatingOrg(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!isOrgMember) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
          <Building2 className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">No Organization</h2>
          <p className="text-muted-foreground text-center max-w-md">
            You're not part of any organization yet. Join one with an invite code, or create your own.
          </p>

          <div className="w-full max-w-md mt-4">
            <JoinOrgCard />
          </div>

          <div className="flex items-center gap-3 w-full max-w-md my-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {profile?.role !== "student" && (
            <Button variant="outline" onClick={() => setShowCreateOrg(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Organization
            </Button>
          )}
        </div>

        <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Create Organization
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Organization Name <span className="text-destructive">*</span></Label>
                <Input
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Sunrise Academy, Physics Study Group"
                  maxLength={100}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={orgDescription}
                  onChange={e => setOrgDescription(e.target.value)}
                  placeholder="What is this organization about?"
                  rows={3}
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">As the creator, you will:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Become the <strong>Admin</strong> of the organization</li>
                  <li>Get default channels (Announcements, General, Doubt Solving, Resources)</li>
                  <li>Be able to invite members, create classes, and manage roles</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateOrg(false)}>Cancel</Button>
              <Button onClick={handleCreateOrg} disabled={!orgName.trim() || creatingOrg}>
                {creatingOrg ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left sidebar - Channels */}
      <div className="w-64 border-r border-border/50 bg-card/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-sm truncate">{org?.name || "Organization"}</h2>
          </div>
          <Badge variant="outline" className="mt-1 text-[10px]">{org?.plan || "free"}</Badge>
          {(profile?.role === "super_admin" || profile?.role === "admin") && (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] text-muted-foreground">Invite Codes</p>
              {[
                { key: "invite_code_student", label: "Student", color: "text-blue-400" },
                { key: "invite_code_teacher", label: "Teacher", color: "text-amber-400" },
                { key: "invite_code_admin", label: "Admin", color: "text-red-400" },
              ].map(({ key, label, color }) => {
                const code = (org as any)?.[key];
                if (!code) return null;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      toast.success(`${label} code copied!`);
                    }}
                    className="w-full flex items-center justify-between text-[10px] font-mono bg-muted/50 px-2 py-0.5 rounded hover:bg-muted transition-colors"
                  >
                    <span className={color}>{label[0]}</span>
                    <span>{code}</span>
                    <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Channels</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowCreateChannel(true)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {channels.map(ch => {
            const Icon = channelIcons[ch.channel_type] || Hash;
            return (
              <div key={ch.id} className="flex items-center group">
                <button
                  onClick={() => { setSelectedChannel(ch.id); setActiveTab("channels"); }}
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    selectedChannel === ch.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
                {profile?.role === "super_admin" && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`Delete channel "#${ch.name}"? All messages will be lost.`)) return;
                      try {
                        await (supabase as any).from("channel_messages").delete().eq("channel_id", ch.id);
                        await (supabase as any).from("channels").delete().eq("id", ch.id);
                        toast.success(`Channel #${ch.name} deleted`);
                        if (selectedChannel === ch.id) setSelectedChannel(null);
                        refetch();
                      } catch (err: any) {
                        toast.error(err.message || "Failed to delete channel");
                      }
                    }}
                    className="hidden group-hover:flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Delete channel"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <div className="pt-4">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider px-2">Navigation</span>
          </div>
          {[
            { id: "batches", label: "Batches & Sections", icon: Layers },
            { id: "marks", label: "Exams & Marks", icon: ClipboardList },
            { id: "teaching", label: "Teaching", icon: GraduationCap },
            { id: "timetable", label: "Timetable", icon: Calendar },
            { id: "knowledge", label: "Knowledge Base", icon: FileText },
            { id: "roles", label: "Roles & Permissions", icon: Shield },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
            { id: "members", label: "Members", icon: Users },
            { id: "join-requests", label: "Join Requests", icon: UserPlus },
            { id: "battles", label: "Battle Arena", icon: Swords },
            ...(profile?.role && ["super_admin", "admin"].includes(profile.role) ? [{ id: "admin-settings", label: "Admin Settings", icon: Settings }] : []),
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedChannel(null); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                activeTab === item.id && !selectedChannel ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {selectedChannel ? (
          <ChannelView
            channelId={selectedChannel}
            channel={channels.find(c => c.id === selectedChannel)}
          />
        ) : activeTab === "batches" ? (
          <BatchManager orgId={org?.id || ""} />
        ) : activeTab === "marks" ? (
          <MarksManager orgId={org?.id || ""} />
        ) : activeTab === "teaching" ? (
          <TeacherSections orgId={org?.id || ""} />
        ) : activeTab === "timetable" ? (
          <TimetableManager orgId={org?.id || ""} />
        ) : activeTab === "knowledge" ? (
          <KnowledgeWorkspace pages={pages} onCreatePage={createPage} />
        ) : activeTab === "roles" ? (
          <RoleManager roles={roles} onCreateRole={createRole} />
        ) : activeTab === "analytics" ? (
          <OrgAnalytics org={org} />
        ) : activeTab === "members" ? (
          <MemberManager orgId={org?.id || ""} />
        ) : activeTab === "join-requests" ? (
          <JoinRequestsManager orgId={org?.id || ""} />
        ) : activeTab === "admin-settings" ? (
          <SuperAdminPanel orgId={org?.id || ""} />
        ) : activeTab === "battles" ? (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Organization Battle Arena</h2>
            <p className="text-muted-foreground">
              Go to <a href="/org-battle-arena" className="text-primary hover:underline">Org Battle Arena</a> for org-restricted battles and leaderboards.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Hash className="h-12 w-12 mb-4" />
            <p>Select a channel or section to get started</p>
          </div>
        )}
      </div>

      <ChannelCreateDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onCreateChannel={createChannel}
      />
    </div>
  );
}
