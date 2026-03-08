import { useState, useCallback } from "react";
import { Coins, Plus, Send, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OrgMember {
  user_id: string;
  name: string | null;
  role: string;
}

interface CreditManagerProps {
  members: OrgMember[];
  onCreditsChanged?: () => void;
}

const PRESET_AMOUNTS = [
  { label: "10 credits", value: 10 },
  { label: "25 credits", value: 25 },
  { label: "50 credits", value: 50 },
  { label: "100 credits", value: 100 },
];

export default function CreditManager({ members, onCreditsChanged }: CreditManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("Allocated by admin");
  const [allocating, setAllocating] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRole, setBulkRole] = useState("all");

  const handleAllocate = async () => {
    if (!bulkMode && !selectedUserId) {
      toast.error("Please select a member");
      return;
    }
    if (amount < 1) {
      toast.error("Amount must be at least 1");
      return;
    }

    setAllocating(true);
    try {
      if (bulkMode) {
        const targets = bulkRole === "all"
          ? members
          : members.filter(m => m.role === bulkRole);

        let successCount = 0;
        for (const member of targets) {
          const { data, error } = await supabase.rpc("allocate_org_credits", {
            p_target_user_id: member.user_id,
            p_amount: amount,
            p_reason: reason,
          });
          if (!error && (data as any)?.success) successCount++;
        }
        toast.success(`Credits allocated to ${successCount}/${targets.length} members!`);
      } else {
        const { data, error } = await supabase.rpc("allocate_org_credits", {
          p_target_user_id: selectedUserId,
          p_amount: amount,
          p_reason: reason,
        });
        if (error) throw error;
        const result = data as any;
        if (result?.success) {
          const memberName = members.find(m => m.user_id === selectedUserId)?.name || "Member";
          toast.success(`${amount} credits allocated to ${memberName} (Total: ${result.new_total})`);
        } else {
          toast.error(result?.error || "Failed to allocate credits");
        }
      }

      setShowDialog(false);
      setSelectedUserId("");
      setAmount(10);
      setReason("Allocated by admin");
      onCreditsChanged?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to allocate credits");
    } finally {
      setAllocating(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)} className="gap-1.5">
        <Coins className="h-4 w-4" />
        Manage Credits
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Allocate Credits
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setBulkMode(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !bulkMode ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Single Member
              </button>
              <button
                onClick={() => setBulkMode(true)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bulkMode ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Bulk Allocate
              </button>
            </div>

            {!bulkMode ? (
              <div>
                <Label>Select Member</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        <span className="flex items-center gap-2">
                          {m.name || "Unknown"}
                          <Badge variant="outline" className="text-[9px] ml-1">{m.role}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Allocate to Role</Label>
                <Select value={bulkRole} onValueChange={setBulkRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members ({members.length})</SelectItem>
                    <SelectItem value="teacher">Teachers ({members.filter(m => m.role === "teacher").length})</SelectItem>
                    <SelectItem value="student">Students ({members.filter(m => m.role === "student").length})</SelectItem>
                    <SelectItem value="admin">Admins ({members.filter(m => m.role === "admin").length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Credits Amount</Label>
              <div className="flex gap-2 mt-1.5 mb-2">
                {PRESET_AMOUNTS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setAmount(p.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      amount === p.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                min={1}
                max={10000}
                placeholder="Custom amount"
              />
            </div>

            <div>
              <Label>Reason (optional)</Label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Monthly quota, Quiz creation credits"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Credit Usage Costs:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>AI Quiz Generation: 5 credits</li>
                <li>AI Timetable Generation: 3 credits</li>
                <li>AI Notes Generation: 5 credits</li>
                <li>AI Chat: 3 credits per session</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={allocating || (!bulkMode && !selectedUserId) || amount < 1}>
              {allocating ? (
                <span className="flex items-center gap-1">
                  <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Allocating...
                </span>
              ) : (
                <><Send className="h-4 w-4 mr-1" /> Allocate {amount} Credits</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
