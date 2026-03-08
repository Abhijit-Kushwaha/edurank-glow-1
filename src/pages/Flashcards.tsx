import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RotateCcw, Brain, Sparkles, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import BattleLoadingOverlay from "@/components/battle/BattleLoadingOverlay";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  difficulty: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  is_ai_generated: boolean;
}

function calculateNextReview(quality: number, card: Flashcard) {
  // SM-2 algorithm
  let ef = card.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ef = Math.max(1.3, ef);
  let interval = card.interval_days;
  let reps = card.repetitions;

  if (quality < 3) {
    reps = 0;
    interval = 0;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps += 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { ease_factor: ef, interval_days: interval, repetitions: reps, next_review_at: nextReview.toISOString() };
}

export default function Flashcards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [tab, setTab] = useState("review");

  const fetchCards = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setCards(data as unknown as Flashcard[]);
      const now = new Date().toISOString();
      setDueCards((data as unknown as Flashcard[]).filter(c => c.next_review_at <= now));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const handleAddCard = async () => {
    if (!user || !newFront.trim() || !newBack.trim()) return;
    const { error } = await supabase.from("flashcards").insert({
      user_id: user.id,
      front: newFront.trim(),
      back: newBack.trim(),
      subject: newSubject.trim() || "General",
    } as any);
    if (error) { toast.error("Failed to add card"); return; }
    toast.success("Flashcard added!");
    setNewFront(""); setNewBack(""); setNewSubject("");
    fetchCards();
  };

  const handleGenerateAI = async () => {
    if (!user || !aiSubject.trim() || generating) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { subject: aiSubject.trim(), count: 10 },
      });
      if (error) throw error;
      const flashcards = data?.flashcards || [];
      if (flashcards.length === 0) { toast.error("No flashcards generated"); return; }
      const inserts = flashcards.map((fc: any) => ({
        user_id: user.id,
        front: fc.front,
        back: fc.back,
        subject: aiSubject.trim(),
        is_ai_generated: true,
      }));
      await supabase.from("flashcards").insert(inserts as any);
      toast.success(`${flashcards.length} flashcards generated!`);
      setAiSubject("");
      fetchCards();
    } catch {
      toast.error("Failed to generate flashcards");
    } finally {
      setGenerating(false);
    }
  };

  const handleRate = async (quality: number) => {
    const card = dueCards[currentIndex];
    if (!card) return;
    const updates = calculateNextReview(quality, card);
    await supabase.from("flashcards").update({
      ...updates,
      last_reviewed_at: new Date().toISOString(),
    } as any).eq("id", card.id);

    const remaining = dueCards.filter((_, i) => i !== currentIndex);
    setDueCards(remaining);
    setCurrentIndex(Math.min(currentIndex, remaining.length - 1));
    setFlipped(false);
    if (remaining.length === 0) toast.success("🎉 All cards reviewed!");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("flashcards").delete().eq("id", id);
    toast.success("Card deleted");
    fetchCards();
  };

  const currentCard = dueCards[currentIndex];
  const subjects = [...new Set(cards.map(c => c.subject))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <BattleLoadingOverlay show={generating} message="Generating Flashcards..." subMessage="AI is creating study cards for you" />

      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl gradient-bg mx-auto">
          <Brain className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <p className="text-sm text-muted-foreground">Spaced repetition for long-term memory</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Badge variant="outline">{cards.length} total</Badge>
          <Badge className="bg-orange-500/20 text-orange-400">{dueCards.length} due</Badge>
          <Badge variant="outline">{subjects.length} subjects</Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="review">Review ({dueCards.length})</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="all">All Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4 mt-4">
          {dueCards.length === 0 ? (
            <Card className="border-primary/20">
              <CardContent className="p-8 text-center space-y-3">
                <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No cards due!</h3>
                <p className="text-sm text-muted-foreground">All caught up. Create new cards or come back later.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-xs text-center text-muted-foreground">
                Card {currentIndex + 1} of {dueCards.length} · Tap to flip
              </p>
              <div className="perspective-1000 cursor-pointer" onClick={() => setFlipped(!flipped)} style={{ perspective: "1000px" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentCard?.id}-${flipped}`}
                    initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className={`min-h-[250px] flex items-center justify-center border-2 ${flipped ? "border-green-500/30 bg-green-500/5" : "border-primary/20"}`}>
                      <CardContent className="p-8 text-center">
                        <Badge variant="outline" className="mb-4 text-xs">{flipped ? "Answer" : "Question"}</Badge>
                        <p className="text-xl font-semibold leading-relaxed">
                          {flipped ? currentCard?.back : currentCard?.front}
                        </p>
                        <p className="text-xs text-muted-foreground mt-4">{currentCard?.subject}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </div>

              {flipped && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <p className="text-xs text-center text-muted-foreground">How well did you know this?</p>
                  <div className="grid grid-cols-4 gap-2">
                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleRate(1)}>Again</Button>
                    <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10" onClick={() => handleRate(3)}>Hard</Button>
                    <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => handleRate(4)}>Good</Button>
                    <Button variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => handleRate(5)}>Easy</Button>
                  </div>
                </motion.div>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" size="sm" disabled={currentIndex === 0} onClick={() => { setCurrentIndex(i => i - 1); setFlipped(false); }}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button variant="ghost" size="sm" disabled={currentIndex >= dueCards.length - 1} onClick={() => { setCurrentIndex(i => i + 1); setFlipped(false); }}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4 mt-4">
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Generate</h3>
              <div className="flex gap-2">
                <Input placeholder="Enter a subject (e.g., Photosynthesis)" value={aiSubject} onChange={e => setAiSubject(e.target.value)} />
                <Button onClick={handleGenerateAI} disabled={generating || !aiSubject.trim()} className="gradient-bg text-primary-foreground shrink-0">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Manual Card</h3>
              <Input placeholder="Subject" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
              <Input placeholder="Front (Question)" value={newFront} onChange={e => setNewFront(e.target.value)} />
              <Input placeholder="Back (Answer)" value={newBack} onChange={e => setNewBack(e.target.value)} />
              <Button onClick={handleAddCard} disabled={!newFront.trim() || !newBack.trim()} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add Flashcard
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {cards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No flashcards yet. Create some!</p>
          ) : (
            cards.map(card => (
              <Card key={card.id} className="group">
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{card.subject}</Badge>
                      {card.is_ai_generated && <Badge className="bg-primary/20 text-primary text-xs">AI</Badge>}
                    </div>
                    <p className="font-medium text-sm truncate">{card.front}</p>
                    <p className="text-xs text-muted-foreground truncate">{card.back}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => handleDelete(card.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
