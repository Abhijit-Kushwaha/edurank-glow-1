import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Flame, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

type Phase = "work" | "break" | "longBreak";

const PHASE_CONFIG: Record<Phase, { label: string; color: string; icon: typeof Brain }> = {
  work: { label: "Focus Time", color: "text-primary", icon: Brain },
  break: { label: "Short Break", color: "text-green-400", icon: Coffee },
  longBreak: { label: "Long Break", color: "text-blue-400", icon: Coffee },
};

export default function PomodoroTimer() {
  const { user } = useAuth();
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins] = useState(15);
  const [phase, setPhase] = useState<Phase>("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [totalFocusMins, setTotalFocusMins] = useState(0);
  const [subject, setSubject] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [tickSound, setTickSound] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickAudioCtxRef = useRef<AudioContext | null>(null);

  // Tick-tick sound effect
  const playTick = useCallback(() => {
    if (!tickSound || !soundOn) return;
    try {
      if (!tickAudioCtxRef.current) {
        tickAudioCtxRef.current = new AudioContext();
      }
      const ctx = tickAudioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = "square";
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }, [tickSound, soundOn]);

  // Today's stats
  const [todayStats, setTodayStats] = useState({ sessions: 0, minutes: 0 });

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("pomodoro_sessions")
      .select("completed_pomodoros, total_focus_mins")
      .eq("user_id", user.id)
      .gte("created_at", today)
      .then(({ data }) => {
        if (data) {
          setTodayStats({
            sessions: data.reduce((s, d) => s + (d as any).completed_pomodoros, 0),
            minutes: data.reduce((s, d) => s + (d as any).total_focus_mins, 0),
          });
        }
      });
  }, [user, completedPomodoros]);

  const playChime = useCallback(() => {
    if (!soundOn) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch {}
  }, [soundOn]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      playTick();
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handlePhaseComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, phase]);

  const handlePhaseComplete = useCallback(async () => {
    playChime();
    setIsRunning(false);

    if (phase === "work") {
      const newCount = completedPomodoros + 1;
      const newFocus = totalFocusMins + workMins;
      setCompletedPomodoros(newCount);
      setTotalFocusMins(newFocus);

      // Save to DB
      if (user) {
        if (sessionId) {
          await supabase.from("pomodoro_sessions").update({
            completed_pomodoros: newCount,
            total_focus_mins: newFocus,
          } as any).eq("id", sessionId);
        }
      }

      toast.success(`🍅 Pomodoro #${newCount} complete!`);
      if (newCount % 4 === 0) {
        setPhase("longBreak");
        setTimeLeft(longBreakMins * 60);
      } else {
        setPhase("break");
        setTimeLeft(breakMins * 60);
      }
    } else {
      setPhase("work");
      setTimeLeft(workMins * 60);
      toast("⏰ Break over — time to focus!", { icon: "🧠" });
    }
  }, [phase, completedPomodoros, totalFocusMins, workMins, breakMins, longBreakMins, user, sessionId, playChime]);

  const startTimer = async () => {
    if (!isRunning && phase === "work" && completedPomodoros === 0 && user) {
      const { data } = await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        subject: subject || null,
        work_duration_mins: workMins,
        break_duration_mins: breakMins,
      } as any).select().single();
      if (data) setSessionId((data as any).id);
    }
    setIsRunning(true);
  };

  const pauseTimer = () => setIsRunning(false);

  const resetTimer = async () => {
    setIsRunning(false);
    setPhase("work");
    setTimeLeft(workMins * 60);
    if (sessionId && user && completedPomodoros > 0) {
      await supabase.from("pomodoro_sessions").update({
        ended_at: new Date().toISOString(),
      } as any).eq("id", sessionId);
    }
    setCompletedPomodoros(0);
    setTotalFocusMins(0);
    setSessionId(null);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const totalSeconds = phase === "work" ? workMins * 60 : phase === "break" ? breakMins * 60 : longBreakMins * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const phaseInfo = PHASE_CONFIG[phase];
  const PhaseIcon = phaseInfo.icon;

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl gradient-bg mx-auto">
          <Timer className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Pomodoro Timer</h1>
        <p className="text-sm text-muted-foreground">Stay focused, take breaks, study smarter</p>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Flame className="h-5 w-5 mx-auto text-orange-400 mb-1" />
          <p className="text-xl font-bold">{completedPomodoros}</p>
          <p className="text-xs text-muted-foreground">This session</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Brain className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold">{todayStats.sessions + completedPomodoros}</p>
          <p className="text-xs text-muted-foreground">Today total</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Timer className="h-5 w-5 mx-auto text-green-400 mb-1" />
          <p className="text-xl font-bold">{todayStats.minutes + totalFocusMins}</p>
          <p className="text-xs text-muted-foreground">Focus mins</p>
        </CardContent></Card>
      </div>

      {/* Timer Circle */}
      <motion.div className="flex flex-col items-center gap-4" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <Badge className={`${phaseInfo.color} bg-transparent border`}>
          <PhaseIcon className="h-3 w-3 mr-1" /> {phaseInfo.label}
        </Badge>

        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <motion.circle
              cx="130" cy="130" r="120"
              fill="none"
              stroke={phase === "work" ? "hsl(var(--primary))" : "hsl(142, 71%, 45%)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-5xl font-bold tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            <div className="flex gap-1 mt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`h-2 w-2 rounded-full ${i < (completedPomodoros % 4) ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 items-center">
          <Button variant="ghost" size="icon" onClick={() => setSoundOn(!soundOn)}>
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>

          {isRunning ? (
            <Button size="lg" variant="outline" className="rounded-full px-8" onClick={pauseTimer}>
              <Pause className="h-5 w-5 mr-2" /> Pause
            </Button>
          ) : (
            <Button size="lg" className="rounded-full px-8 gradient-bg text-primary-foreground" onClick={startTimer}>
              <Play className="h-5 w-5 mr-2" /> {timeLeft === totalSeconds ? "Start" : "Resume"}
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={resetTimer}>
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {/* Settings */}
      {!isRunning && completedPomodoros === 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Session Settings</h3>
            <Input placeholder="What are you studying? (optional)" value={subject} onChange={e => setSubject(e.target.value)} />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Work (min)</label>
                <Select value={String(workMins)} onValueChange={v => { setWorkMins(Number(v)); setTimeLeft(Number(v) * 60); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 20, 25, 30, 45, 50, 60].map(v => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Break (min)</label>
                <Select value={String(breakMins)} onValueChange={v => setBreakMins(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 10].map(v => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Long Break</label>
                <Select value={String(longBreakMins)} onValueChange={v => setLongBreakMins(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 30].map(v => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
