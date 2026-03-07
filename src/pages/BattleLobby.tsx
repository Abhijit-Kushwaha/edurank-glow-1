import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBattle } from "@/hooks/useBattle";
import { useBattleRealtime } from "@/hooks/useBattleRealtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Loader2, Swords, Users, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import BattleQuestion from "@/components/battle/BattleQuestion";
import BattleScoreboard from "@/components/battle/BattleScoreboard";
import PowerUpBar from "@/components/battle/PowerUpBar";
import BattleResultsPanel from "@/components/battle/BattleResultsPanel";
import BattleStartAnimation from "@/components/battle/BattleStartAnimation";
import BattleReactions, { type FloatingReaction } from "@/components/battle/BattleReactions";
import ScoreAnimation from "@/components/battle/ScoreAnimation";

export default function BattleLobby() {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startBattle, advanceQuestion, endBattle, submitAnswer, awardBrainPoints } = useBattle();
  const { battle, players, answers } = useBattleRealtime(battleId || null);

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [powerUps, setPowerUps] = useState({ time_freeze: 1, hint_vision: 1, double_points: 1 });
  const [doubleActive, setDoubleActive] = useState(false);
  const [brainPointsEarned, setBrainPointsEarned] = useState(0);

  // New state for animations
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [battleStarted, setBattleStarted] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [scoreAnim, setScoreAnim] = useState<{ show: boolean; isCorrect: boolean; points: number; streak: number }>({
    show: false, isCorrect: false, points: 0, streak: 0,
  });

  const isCreator = battle?.creator_id === user?.id;

  // Fetch questions when battle becomes active
  useEffect(() => {
    if (!battleId) return;
    const fetchQuestions = async () => {
      const { data } = await supabase
        .from("battle_questions")
        .select("*")
        .eq("battle_id", battleId)
        .order("order_index");
      if (data) setQuestions(data);
    };
    fetchQuestions();
  }, [battleId, battle?.status]);

  // Show start animation when battle becomes active
  useEffect(() => {
    if (battle?.status === "active" && !battleStarted && players.length >= 2) {
      setShowStartAnimation(true);
    }
  }, [battle?.status, battleStarted, players.length]);

  const handleAnimationComplete = useCallback(() => {
    setShowStartAnimation(false);
    setBattleStarted(true);
  }, []);

  // Sync current question from battle state
  useEffect(() => {
    if (battle?.current_question !== undefined) {
      setCurrentQIndex(battle.current_question);
    }
  }, [battle?.current_question]);

  // Calculate my score from answers
  useEffect(() => {
    if (!user) return;
    const myAnswers = answers.filter((a) => a.user_id === user.id);
    const total = myAnswers.reduce((sum, a) => sum + a.points_earned, 0);
    setMyScore(total);
  }, [answers, user]);

  // Realtime reactions channel
  useEffect(() => {
    if (!battleId) return;
    const channel = supabase.channel(`battle-reactions-${battleId}`);
    channel.on("broadcast", { event: "reaction" }, (payload) => {
      const r: FloatingReaction = {
        id: `${Date.now()}-${Math.random()}`,
        content: payload.payload.content,
        isEmoji: payload.payload.isEmoji,
        senderName: payload.payload.senderName,
      };
      setFloatingReactions((prev) => [...prev.slice(-4), r]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((x) => x.id !== r.id));
      }, 3000);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [battleId]);

  const handleSendReaction = useCallback((content: string, isEmoji: boolean) => {
    if (!battleId || !user) return;
    const me = players.find(p => p.user_id === user.id);
    supabase.channel(`battle-reactions-${battleId}`).send({
      type: "broadcast",
      event: "reaction",
      payload: { content, isEmoji, senderName: me?.display_name || "Player" },
    });
  }, [battleId, user, players]);

  const handleCopy = () => {
    if (!battle) return;
    navigator.clipboard.writeText(battle.battle_code);
    setCopied(true);
    toast.success("Battle code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartBattle = async () => {
    if (!battleId || players.length < 2) {
      toast.error("Need at least 2 players to start");
      return;
    }
    await startBattle(battleId);
  };

  const handleAnswer = async (selectedAnswer: number, timeTaken: number) => {
    if (!battleId || !user || !questions[currentQIndex]) return;

    const q = questions[currentQIndex];
    const isCorrect = selectedAnswer === q.correct_answer;

    let points = 0;
    let newStreak = streak;

    if (isCorrect) {
      points += 10;
      if (timeTaken <= 3) points += 5;
      if (q.difficulty === "hard") points += 10;
      newStreak += 1;
      if (newStreak >= 3) points += 5;
      if (doubleActive) points *= 2;
      setStreak(newStreak);
    } else {
      newStreak = 0;
      setStreak(0);
    }

    if (doubleActive) setDoubleActive(false);

    // Show score animation
    setScoreAnim({ show: true, isCorrect, points, streak: newStreak });
    setTimeout(() => setScoreAnim(prev => ({ ...prev, show: false })), 2000);

    const totalScore = myScore + points;
    await submitAnswer(battleId, q.id, selectedAnswer, isCorrect, timeTaken, newStreak, totalScore);

    const nextIndex = currentQIndex + 1;
    if (nextIndex >= questions.length) {
      setTimeout(async () => {
        const updatedPlayers = players.map((p) => {
          if (p.user_id === user.id) return { ...p, score: totalScore };
          return p;
        });
        const sorted = [...updatedPlayers].sort((a, b) => b.score - a.score);
        const winnerId = sorted[0]?.user_id;

        await endBattle(battleId, winnerId);

        const isWinner = winnerId === user.id;
        let bp = 20;
        if (isWinner) bp += 50;
        if (totalScore === questions.length * 10 + questions.length * 5) bp += 30;

        await awardBrainPoints(bp, isWinner ? "battle_win" : "battle_participation", battleId);
        setBrainPointsEarned(bp);
      }, 2000);
    } else if (isCreator) {
      setTimeout(() => {
        advanceQuestion(battleId, nextIndex);
      }, 2000);
    }
  };

  const handleUsePowerUp = (type: string) => {
    if (powerUps[type as keyof typeof powerUps] <= 0) return;
    setPowerUps((prev) => ({ ...prev, [type]: prev[type as keyof typeof prev] - 1 }));

    if (type === "double_points") {
      setDoubleActive(true);
      toast.success("⚡ Double Points activated!");
    } else if (type === "time_freeze") {
      toast.success("❄️ Time Freeze activated!");
    } else if (type === "hint_vision") {
      toast.success("👁️ Hint Vision activated!");
    }
  };

  if (!battle) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Start Animation overlay
  if (showStartAnimation && players.length >= 2) {
    return (
      <AnimatePresence>
        <BattleStartAnimation
          player1Name={players[0]?.display_name || "Player 1"}
          player2Name={players[1]?.display_name || "Player 2"}
          onComplete={handleAnimationComplete}
        />
      </AnimatePresence>
    );
  }

  // COMPLETED state
  if (battle.status === "completed") {
    return (
      <div className="p-4 md:p-6">
        <BattleResultsPanel
          players={players}
          currentUserId={user?.id || ""}
          subject={battle.subject}
          brainPointsEarned={brainPointsEarned}
          battleId={battleId || ""}
          onGoBack={() => navigate("/battle-arena")}
        />
      </div>
    );
  }

  // ACTIVE state
  if (battle.status === "active" && questions.length > 0 && currentQIndex < questions.length && battleStarted) {
    const q = questions[currentQIndex];
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{battle.subject} · {battle.difficulty}</Badge>
          <Badge className="bg-orange-500/20 text-orange-400 animate-pulse">LIVE</Badge>
        </div>

        <BattleScoreboard players={players} currentUserId={user?.id} />

        <PowerUpBar powerUps={powerUps} onUsePowerUp={handleUsePowerUp} />

        <BattleQuestion
          key={q.id}
          questionText={q.question_text}
          options={q.options}
          correctAnswer={q.correct_answer}
          timeLimit={q.time_limit}
          questionIndex={currentQIndex}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
        />

        {/* Reactions */}
        <BattleReactions
          onSendReaction={handleSendReaction}
          floatingReactions={floatingReactions}
        />

        {/* Score Animation */}
        <ScoreAnimation
          show={scoreAnim.show}
          isCorrect={scoreAnim.isCorrect}
          points={scoreAnim.points}
          streakCount={scoreAnim.streak}
        />
      </div>
    );
  }

  // WAITING state (Lobby)
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/battle-arena")} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl gradient-bg mx-auto">
          <Swords className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Battle Lobby</h2>
        <div className="flex gap-2 justify-center">
          <Badge variant="outline">{battle.subject}</Badge>
          <Badge variant="outline">{battle.difficulty}</Badge>
          <Badge variant="outline">{battle.num_questions} Qs</Badge>
        </div>
      </motion.div>

      {/* Battle Code */}
      <Card className="border-primary/20">
        <CardContent className="p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">Share this code with your opponent</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-3xl font-bold tracking-[0.3em] text-primary">
              {battle.battle_code}
            </span>
            <Button size="icon" variant="ghost" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Players */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" /> Players ({players.length}/2)
        </h3>
        {players.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 font-bold">
                    {p.display_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{p.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.user_id === battle.creator_id ? "👑 Host" : "⚔️ Challenger"}
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 text-xs">Ready</Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {players.length < 2 && (
          <div className="text-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Waiting for opponent...</p>
          </div>
        )}
      </div>

      {/* Start Button */}
      {isCreator && players.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button
            onClick={handleStartBattle}
            className="w-full gradient-bg text-primary-foreground font-bold py-3 text-lg"
          >
            <Swords className="h-5 w-5 mr-2" />
            Start Battle!
          </Button>
        </motion.div>
      )}
    </div>
  );
}
