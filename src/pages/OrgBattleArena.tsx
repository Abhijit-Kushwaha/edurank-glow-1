import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBattle } from "@/hooks/useBattle";
import CreateBattleDialog from "@/components/battle/CreateBattleDialog";
import JoinBattleDialog from "@/components/battle/JoinBattleDialog";
import BattleCard from "@/components/battle/BattleCard";
import OrgBattleLeaderboard from "@/components/battle/OrgBattleLeaderboard";
import { Swords, Zap, Sparkles, Shield, Building2, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function OrgBattleArena() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { loading, createBattle, joinBattle } = useBattle();
  const [activeBattles, setActiveBattles] = useState<any[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState("org");

  const orgId = profile?.org_id;
  const isTeacherOrAdmin = profile?.role && ["super_admin", "admin", "teacher"].includes(profile.role);

  useEffect(() => {
    if (!orgId) return;

    const fetchBattles = async () => {
      const { data } = await supabase
        .from("battles")
        .select("*")
        .eq("org_id", orgId)
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setActiveBattles(data);
        const counts: Record<string, number> = {};
        for (const b of data) {
          const { count } = await supabase
            .from("battle_players")
            .select("*", { count: "exact", head: true })
            .eq("battle_id", b.id);
          counts[b.id] = count || 0;
        }
        setPlayerCounts(counts);
      }
    };

    fetchBattles();

    const channel = supabase
      .channel("org-arena-battles")
      .on("postgres_changes", { event: "*", schema: "public", table: "battles" }, () => {
        fetchBattles();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  const handleCreateBattle = async (config: any) => {
    if (!orgId) {
      toast.error("You must be in an organization to create org battles");
      return null;
    }
    const battle = await createBattle({
      ...config,
      orgId,
    });
    if (battle) {
      navigate(`/battle/${battle.id}`);
    }
    return battle;
  };

  const handleJoinBattle = async (code: string) => {
    const battle = await joinBattle(code);
    if (battle) {
      // Verify org membership
      if ((battle as any).org_id && (battle as any).org_id !== orgId) {
        toast.error("This battle belongs to a different organization");
        return null;
      }
      navigate(`/battle/${battle.id}`);
    }
    return battle;
  };

  const handleJoinById = async (battleId: string) => {
    const battle = activeBattles.find((b) => b.id === battleId);
    if (battle) {
      const result = await joinBattle(battle.battle_code);
      if (result) navigate(`/battle/${battleId}`);
    }
  };

  if (!orgId) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">Organization Required</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You need to be part of an organization to access the Org Battle Arena.
              Join or create an organization first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl gradient-bg mx-auto">
          <Shield className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Org <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Battle Arena</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Compete with your organization members. Only org members can join these battles.
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Building2 className="h-3 w-3" /> Org Only
          </Badge>
          {isTeacherOrAdmin && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" /> Teacher Mode
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <CreateBattleDialog onCreateBattle={handleCreateBattle} loading={loading} />
        <JoinBattleDialog onJoinBattle={handleJoinBattle} loading={loading} />
      </motion.div>

      {/* Tabs: Battles / Leaderboard */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="org" className="gap-1">
            <Zap className="h-4 w-4" /> Active Battles
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1">
            <Swords className="h-4 w-4" /> Org Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="mt-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {activeBattles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No active org battles. Create one!
              </div>
            ) : (
              <div className="space-y-2">
                {activeBattles.map((b) => (
                  <BattleCard
                    key={b.id}
                    id={b.id}
                    subject={b.subject}
                    difficulty={b.difficulty}
                    status={b.status}
                    battleCode={b.battle_code}
                    playerCount={playerCounts[b.id] || 0}
                    maxPlayers={b.max_players || 2}
                    onJoin={handleJoinById}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <OrgBattleLeaderboard orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
