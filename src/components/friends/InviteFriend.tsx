import { useState } from "react";
import { Copy, Check, Link as LinkIcon, Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface InviteFriendProps {
  onGenerateCode: () => Promise<string | null>;
  onRedeemCode: (code: string) => Promise<void>;
}

const InviteFriend = ({ onGenerateCode, onRedeemCode }: InviteFriendProps) => {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const code = await onGenerateCode();
      setInviteCode(code);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      await onRedeemCode(redeemCode.trim());
      setRedeemCode("");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Generate invite */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          Share Invite Code
        </h4>
        {inviteCode ? (
          <div className="flex gap-2">
            <Input
              value={inviteCode}
              readOnly
              className="font-mono text-center tracking-widest"
            />
            <Button size="icon" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="outline"
            className="w-full"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LinkIcon className="h-4 w-4 mr-2" />
            )}
            Generate Invite Code
          </Button>
        )}
      </div>

      {/* Redeem invite */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Ticket className="h-4 w-4 text-secondary" />
          Redeem Code
        </h4>
        <div className="flex gap-2">
          <Input
            placeholder="Enter invite code"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            className="font-mono text-center tracking-widest"
            onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
          />
          <Button
            onClick={handleRedeem}
            disabled={redeeming || !redeemCode.trim()}
            size="sm"
          >
            {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InviteFriend;
