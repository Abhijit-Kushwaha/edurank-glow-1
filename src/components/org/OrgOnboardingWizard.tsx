import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Users, Layers, Copy, Check, ArrowRight, ArrowLeft, Sparkles, Mail, Globe, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface OrgOnboardingWizardProps {
  orgId: string;
  orgName: string;
  inviteCodes: { student?: string; teacher?: string; admin?: string };
  onComplete: () => void;
}

const STEPS = [
  { title: "Organization Profile", icon: Building2, desc: "Tell us about your org" },
  { title: "Invite Codes", icon: Users, desc: "Configure member access" },
  { title: "Create Classes", icon: Layers, desc: "Set up batches & sections" },
  { title: "Invite Members", icon: Mail, desc: "Share invite links" },
  { title: "All Set!", icon: Sparkles, desc: "You're ready to go" },
];

export default function OrgOnboardingWizard({ orgId, orgName, inviteCodes, onComplete }: OrgOnboardingWizardProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Profile
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [orgType, setOrgType] = useState("school");

  // Step 2: Invite
  const [joinApproval, setJoinApproval] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Step 3: Batches
  const [batchInputs, setBatchInputs] = useState([
    { name: "Class 6", classNumber: 6, sections: "A, B" },
    { name: "Class 7", classNumber: 7, sections: "A, B" },
  ]);

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    toast.success(`${label} code copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    await (supabase as any).from("organisations").update({
      description: description || null,
      website: website || null,
      contact_email: contactEmail || null,
      org_type: orgType,
      join_approval_required: joinApproval,
    }).eq("id", orgId);
    setSaving(false);
    setStep(1);
  };

  const handleSaveInviteSettings = async () => {
    setSaving(true);
    await (supabase as any).from("organisations").update({
      join_approval_required: joinApproval,
    }).eq("id", orgId);
    setSaving(false);
    setStep(2);
  };

  const handleCreateBatches = async () => {
    if (!profile) return;
    setSaving(true);
    for (const batch of batchInputs) {
      if (!batch.name.trim()) continue;
      const { data: batchData } = await (supabase as any).from("batches").insert({
        org_id: orgId,
        name: batch.name.trim(),
        class_number: batch.classNumber,
        created_by: profile.id,
      }).select().single();

      if (batchData) {
        const sections = batch.sections.split(",").map(s => s.trim()).filter(Boolean);
        for (let i = 0; i < sections.length; i++) {
          await (supabase as any).from("batch_sections").insert({
            batch_id: batchData.id,
            org_id: orgId,
            name: sections[i],
            display_name: `${batch.name} - ${sections[i]}`,
          });
        }
      }
    }
    setSaving(false);
    setStep(3);
    toast.success("Batches created!");
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-5rem)] p-4">
      <div className="w-full max-w-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-6 sm:w-10 transition-colors ${i < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            <Card className="border-primary/20">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  {(() => { const StepIcon = STEPS[step].icon; return <StepIcon className="h-6 w-6 text-primary" />; })()}
                  <div>
                    <h2 className="text-xl font-bold">{STEPS[step].title}</h2>
                    <p className="text-sm text-muted-foreground">{STEPS[step].desc}</p>
                  </div>
                </div>

                {/* Step 0: Profile */}
                {step === 0 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Organization Type</Label>
                      <Select value={orgType} onValueChange={setOrgType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school">🏫 School</SelectItem>
                          <SelectItem value="college">🎓 College</SelectItem>
                          <SelectItem value="coaching">📚 Coaching Institute</SelectItem>
                          <SelectItem value="community">🌐 Community / Study Group</SelectItem>
                          <SelectItem value="other">🏢 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description of your organization..." rows={3} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Website</Label>
                        <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Contact Email</Label>
                        <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@org.com" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? "Saving..." : "Next"} <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 1: Invite Codes */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-sm font-medium">Require Admin Approval</p>
                        <p className="text-xs text-muted-foreground">New members need admin approval to join</p>
                      </div>
                      <Switch checked={joinApproval} onCheckedChange={setJoinApproval} />
                    </div>
                    <div className="space-y-3">
                      {[
                        { key: "student", label: "Student Code", color: "text-blue-400", code: inviteCodes.student },
                        { key: "teacher", label: "Teacher Code", color: "text-amber-400", code: inviteCodes.teacher },
                        { key: "admin", label: "Admin Code", color: "text-red-400", code: inviteCodes.admin },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${item.color}`}>{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-background px-2 py-1 rounded">{item.code || "N/A"}</code>
                            {item.code && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(item.code!, item.label)}>
                                {copiedCode === item.label ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                      <Button onClick={handleSaveInviteSettings} disabled={saving}>
                        {saving ? "Saving..." : "Next"} <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Create Batches */}
                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Create your initial classes/batches. You can always add more later.</p>
                    {batchInputs.map((batch, i) => (
                      <div key={i} className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input value={batch.name} onChange={e => {
                            const n = [...batchInputs]; n[i].name = e.target.value; setBatchInputs(n);
                          }} placeholder="Class 6" />
                        </div>
                        <div>
                          <Label className="text-xs">Class #</Label>
                          <Input type="number" value={batch.classNumber} onChange={e => {
                            const n = [...batchInputs]; n[i].classNumber = parseInt(e.target.value) || 0; setBatchInputs(n);
                          }} />
                        </div>
                        <div>
                          <Label className="text-xs">Sections</Label>
                          <Input value={batch.sections} onChange={e => {
                            const n = [...batchInputs]; n[i].sections = e.target.value; setBatchInputs(n);
                          }} placeholder="A, B, C" />
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setBatchInputs([...batchInputs, { name: "", classNumber: batchInputs.length + 6, sections: "A" }])}>
                      + Add Another Batch
                    </Button>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setStep(3)}>Skip</Button>
                        <Button onClick={handleCreateBatches} disabled={saving}>
                          {saving ? "Creating..." : "Create Batches"} <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Invite Members */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Share these codes with your teachers and students to invite them.</p>
                    <div className="space-y-3">
                      {[
                        { label: "Student Invite Code", code: inviteCodes.student, color: "border-blue-500/30" },
                        { label: "Teacher Invite Code", code: inviteCodes.teacher, color: "border-amber-500/30" },
                      ].map(item => (
                        <div key={item.label} className={`p-4 rounded-lg bg-muted/30 border ${item.color}`}>
                          <p className="text-sm font-medium mb-2">{item.label}</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-lg font-mono font-bold text-center bg-background p-3 rounded-lg tracking-widest">{item.code || "N/A"}</code>
                            {item.code && (
                              <Button variant="outline" onClick={() => copyCode(item.code!, item.label)}>
                                {copiedCode === item.label ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                      <Button onClick={() => setStep(4)}>
                        Next <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Done */}
                {step === 4 && (
                  <div className="text-center space-y-4 py-4">
                    <div className="h-16 w-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold">You're All Set! 🎉</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      <strong>{orgName}</strong> is ready to go. You can now manage members, create quizzes, and organize your classes.
                    </p>
                    <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2 max-w-sm mx-auto">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Summary</p>
                      <div className="text-sm space-y-1">
                        <p>Type: <span className="capitalize font-medium">{orgType}</span></p>
                        <p>Approval: <span className="font-medium">{joinApproval ? "Required" : "Auto-join"}</span></p>
                        {batchInputs.filter(b => b.name.trim()).length > 0 && (
                          <p>Batches: <span className="font-medium">{batchInputs.filter(b => b.name.trim()).length} created</span></p>
                        )}
                      </div>
                    </div>
                    <Button size="lg" className="mt-4" onClick={onComplete}>
                      Go to Workspace <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
