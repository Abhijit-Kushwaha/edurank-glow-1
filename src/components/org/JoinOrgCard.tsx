import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, X, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function JoinOrgCard() {
  const { profile } = useAuth();
  const [orgCode, setOrgCode] = useState("");
  const [orgCodeValid, setOrgCodeValid] = useState<boolean | null>(null);
  const [orgCodeOrgName, setOrgCodeOrgName] = useState("");
  const [detectedRole, setDetectedRole] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Don't show if user already in an org
  if (profile?.org_id) return null;

  const validateCode = async (code: string) => {
    if (code.length < 4) {
      setOrgCodeValid(null);
      setOrgCodeOrgName("");
      setDetectedRole(null);
      return;
    }
    setIsChecking(true);
    try {
      const { data } = await supabase.rpc("validate_org_code", { p_code: code });
      const result = data as any;
      setOrgCodeValid(result?.valid ?? false);
      setOrgCodeOrgName(result?.org_name ?? "");
      setDetectedRole(result?.role ?? null);
    } catch {
      setOrgCodeValid(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!orgCode.trim() || !orgCodeValid) return;
    setSubmitting(true);
    try {
      const { data } = await supabase.rpc("request_join_org", {
        p_code: orgCode.trim(),
      });
      const result = data as any;
      if (result?.success) {
        toast.success(`Join request sent to ${result.org_name} as ${result.role}! You'll be notified when approved.`);
        setSubmitted(true);
      } else {
        toast.error(result?.error || "Failed to send request");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center py-8 gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Request Sent!</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Your request to join <strong>{orgCodeOrgName}</strong> as <Badge variant="outline" className="mx-1">{detectedRole}</Badge> has been sent.
            The organization admin will review it shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  const roleBadgeColor = detectedRole === "admin" ? "destructive" : detectedRole === "teacher" ? "secondary" : "default";

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Join an Organization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the invite code shared by your organization's admin. The code determines your role (Student, Teacher, or Admin).
        </p>

        <div className="space-y-2">
          <Label>Invite Code</Label>
          <div className="relative">
            <Input
              placeholder="e.g. A1B2C3D4"
              value={orgCode}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
                setOrgCode(val);
                validateCode(val);
              }}
              className="pr-10 uppercase tracking-widest font-mono"
              maxLength={8}
            />
            {orgCode.trim() && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : orgCodeValid === true ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : orgCodeValid === false ? (
                  <X className="h-5 w-5 text-destructive" />
                ) : null}
              </div>
            )}
          </div>
          {orgCodeValid && orgCodeOrgName && (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <Check className="h-3 w-3" />
              <span>Organization: <strong>{orgCodeOrgName}</strong></span>
              {detectedRole && (
                <Badge variant={roleBadgeColor as any} className="text-[10px] capitalize">
                  Joining as {detectedRole}
                </Badge>
              )}
            </div>
          )}
          {orgCodeValid === false && orgCode.length >= 4 && (
            <p className="text-xs text-destructive">Invalid code. Ask your admin for the correct code.</p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!orgCodeValid || submitting}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {submitting ? "Sending Request..." : `Request to Join${detectedRole ? ` as ${detectedRole.charAt(0).toUpperCase() + detectedRole.slice(1)}` : ""}`}
        </Button>
      </CardContent>
    </Card>
  );
}
