import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Hash, Megaphone, HelpCircle, BookOpen } from "lucide-react";

const channelTypes = [
  { value: "text", label: "Text Channel", icon: Hash },
  { value: "announcements", label: "Announcements", icon: Megaphone },
  { value: "doubt-solving", label: "Doubt Solving", icon: HelpCircle },
  { value: "resources", label: "Resources", icon: BookOpen },
];

interface ChannelCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateChannel: (name: string, type: string, description?: string) => Promise<unknown>;
}

export default function ChannelCreateDialog({ open, onOpenChange, onCreateChannel }: ChannelCreateDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await onCreateChannel(name.trim().toLowerCase().replace(/\s+/g, "-"), type, description);
    setCreating(false);
    setName("");
    setType("text");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Channel Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. study-discussion"
            />
          </div>
          <div>
            <Label>Channel Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channelTypes.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>
                    <div className="flex items-center gap-2">
                      <ct.icon className="h-4 w-4" />
                      {ct.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? "Creating..." : "Create Channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
