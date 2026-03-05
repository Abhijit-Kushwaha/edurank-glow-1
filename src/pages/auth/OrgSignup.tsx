import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function OrgSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    orgName: "",
    orgDomain: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.orgName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: form.fullName,
            name: form.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create account");

      // 2. Create organisation
      const { data: orgData, error: orgError } = await supabase
        .from("organisations")
        .insert({
          name: form.orgName,
          domain: form.orgDomain || null,
          status: "active",
        })
        .select("id")
        .single();

      if (orgError) throw orgError;

      // 3. Update profile with org info and role
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: form.fullName,
          email: form.email,
          role: "super_admin",
          org_id: orgData.id,
          is_independent: false,
          status: "active",
        })
        .eq("user_id", authData.user.id);

      if (profileError) throw profileError;

      toast.success("Organisation created! Please verify your email.");
      navigate("/super-admin/overview");
    } catch (error: any) {
      console.error("Org signup error:", error);
      toast.error(error.message || "Failed to create organisation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">BrainBuddy</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Create Organisation</h1>
          <p className="text-muted-foreground">Set up your school or institute</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="John Smith"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="admin@school.edu"
            />
          </div>
          <div>
            <Label>Password *</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters"
              minLength={6}
            />
          </div>
          <div>
            <Label>Organisation Name *</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={form.orgName}
                onChange={(e) => setForm(f => ({ ...f, orgName: e.target.value }))}
                placeholder="Delhi Public School"
              />
            </div>
          </div>
          <div>
            <Label>Organisation Domain (optional)</Label>
            <Input
              value={form.orgDomain}
              onChange={(e) => setForm(f => ({ ...f, orgDomain: e.target.value }))}
              placeholder="dps.edu"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Organisation
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Just a student?{" "}
            <Link to="/auth/signup/student" className="text-primary hover:underline">Sign up independently</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
