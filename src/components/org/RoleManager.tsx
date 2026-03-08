import { useState } from "react";
import { Shield, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const ALL_PERMISSIONS = [
  { key: "manage_org", label: "Manage Organization", desc: "Edit org settings" },
  { key: "manage_members", label: "Manage Members", desc: "Add/remove members" },
  { key: "manage_roles", label: "Manage Roles", desc: "Create and edit roles" },
  { key: "create_classes", label: "Create Classes", desc: "Create new classrooms" },
  { key: "upload_resources", label: "Upload Resources", desc: "Upload notes, videos" },
  { key: "start_battles", label: "Start Battles", desc: "Create quiz battles" },
  { key: "manage_channels", label: "Manage Channels", desc: "Create/edit channels" },
  { key: "send_announcements", label: "Send Announcements", desc: "Post announcements" },
  { key: "view_analytics", label: "View Analytics", desc: "Access org analytics" },
  { key: "moderate_content", label: "Moderate Content", desc: "Delete/pin messages" },
  { key: "create_pages", label: "Create Pages", desc: "Create knowledge base pages" },
];

const ROLE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7",
];

interface CustomRole {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
}

interface RoleManagerProps {
  roles: CustomRole[];
  onCreateRole: (name: string, color: string) => Promise<unknown>;
}

export default function RoleManager({ roles, onCreateRole }: RoleManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(ROLE_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await onCreateRole(newName.trim(), newColor);
    setCreating(false);
    setNewName("");
    setNewColor(ROLE_COLORS[0]);
    setSelectedPermissions({});
    setShowCreate(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Roles & Permissions
          </h2>
          <p className="text-sm text-muted-foreground">Create custom roles with granular permissions like Discord</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Existing roles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Default system roles */}
        {["Owner", "Admin", "Teacher", "Student"].map(role => (
          <Card key={role} className="border-border/50">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <CardTitle className="text-sm">{role}</CardTitle>
                <Badge variant="outline" className="text-[10px] ml-auto">System</Badge>
              </div>
            </CardHeader>
          </Card>
        ))}

        {/* Custom roles */}
        {roles.map(role => (
          <Card key={role.id} className="border-border/50">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                <CardTitle className="text-sm">{role.name}</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Create Role Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Moderator" />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {ROLE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${newColor === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="mt-2 space-y-2">
                {ALL_PERMISSIONS.map(perm => (
                  <div key={perm.key} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{perm.label}</p>
                      <p className="text-[10px] text-muted-foreground">{perm.desc}</p>
                    </div>
                    <Switch
                      checked={!!selectedPermissions[perm.key]}
                      onCheckedChange={v => setSelectedPermissions(prev => ({ ...prev, [perm.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
