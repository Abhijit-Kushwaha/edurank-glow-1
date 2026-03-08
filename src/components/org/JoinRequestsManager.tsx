import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { UserPlus, Check, X, Clock, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface JoinRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function JoinRequestsManager({ orgId }: { orgId: string }) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [search, setSearch] = useState("");

  const isAdmin = profile?.role && ["super_admin", "admin"].includes(profile.role);

  const fetchRequests = async () => {
    setLoading(true);
    const query = supabase
      .from("org_join_requests")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query.eq("status", "pending");
    }

    const { data } = await query;

    if (data) {
      // Fetch user names
      const userIds = data.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      setRequests(
        data.map((r: any) => ({
          ...r,
          user_name: profileMap.get(r.user_id)?.name || "Unknown",
          user_email: profileMap.get(r.user_id)?.email || "",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!orgId) return;
    fetchRequests();

    const channel = supabase
      .channel("org-join-requests")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "org_join_requests",
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, filter]);

  const handleReview = async (requestId: string, action: "approved" | "rejected") => {
    setProcessingId(requestId);
    try {
      const { data } = await supabase.rpc("review_join_request", {
        p_request_id: requestId,
        p_action: action,
      });
      const result = data as any;
      if (result?.success) {
        toast.success(`Request ${action}!`);
        fetchRequests();
      } else {
        toast.error(result?.error || "Failed to process request");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.user_name?.toLowerCase().includes(s) ||
      r.user_email?.toLowerCase().includes(s) ||
      r.requested_role.toLowerCase().includes(s)
    );
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Join Requests</h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {filter === "pending" ? "No pending requests" : "No requests yet"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRequests.map((req) => (
            <Card key={req.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-sm">
                        {(req.user_name || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{req.user_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{req.user_email}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {req.requested_role}
                        </Badge>
                        <span>·</span>
                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === "pending" && isAdmin ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleReview(req.id, "rejected")}
                          disabled={processingId === req.id}
                        >
                          {processingId === req.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3 mr-1" />
                          )}
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReview(req.id, "approved")}
                          disabled={processingId === req.id}
                        >
                          {processingId === req.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Approve
                        </Button>
                      </>
                    ) : (
                      <Badge
                        variant={
                          req.status === "approved" ? "default" :
                          req.status === "rejected" ? "destructive" : "secondary"
                        }
                        className="text-xs"
                      >
                        {req.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                        {req.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
