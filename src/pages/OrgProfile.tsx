import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Users, Calendar, Globe, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface OrgPublicData {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  org_type: string;
  website: string | null;
  created_at: string;
  member_count: number;
}

export default function OrgProfile() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [org, setOrg] = useState<OrgPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const fetchOrg = async () => {
      setLoading(true);
      const [orgRes, countRes] = await Promise.all([
        (supabase as any).from("organisations").select("id, name, description, logo_url, org_type, website, created_at").eq("id", orgId).single(),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      ]);
      if (orgRes.data) {
        setOrg({ ...orgRes.data, member_count: countRes.count || 0 });
      }
      setLoading(false);
    };
    fetchOrg();
  }, [orgId]);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("request_join_org", { p_code: inviteCode.trim() });
      const result = data as any;
      if (error || !result?.success) {
        toast.error(result?.error || error?.message || "Failed to join");
      } else {
        toast.success(`Join request sent to ${result.org_name}! Awaiting approval.`);
        setShowJoinDialog(false);
      }
    } catch {
      toast.error("Something went wrong");
    }
    setJoining(false);
  };

  const orgTypeBadge: Record<string, string> = {
    school: "🏫 School", college: "🎓 College", coaching: "📚 Coaching",
    community: "🌐 Community", other: "🏢 Organization",
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Organization not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
            <CardContent className="p-6 -mt-8">
              <div className="flex items-end gap-4 mb-4">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover border-4 border-background" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center border-4 border-background">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">{org.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{orgTypeBadge[org.org_type] || orgTypeBadge.other}</Badge>
                  </div>
                </div>
              </div>
              {org.description && <p className="text-muted-foreground mb-4">{org.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {org.member_count} members</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Since {new Date(org.created_at).toLocaleDateString()}</span>
                {org.website && (
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {user && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">Want to join this organization?</p>
                <Button onClick={() => setShowJoinDialog(true)}>Request to Join</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Join {org.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the invite code provided by the organization admin.</p>
            <Input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Enter invite code..." className="font-mono text-center tracking-widest" maxLength={12} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>Cancel</Button>
            <Button onClick={handleJoin} disabled={!inviteCode.trim() || joining}>
              {joining ? "Sending..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
