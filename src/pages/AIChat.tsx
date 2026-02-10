import { useState, useRef, useEffect } from "react";
import { Brain, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  "Explain Newton's Laws of Motion simply",
  "Help me solve quadratic equations",
  "What are the key events of World War II?",
  "Explain photosynthesis step by step",
];

const AIChat = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          userContext: {
            name: profile?.name || "Student",
            class: null,
            subject: null,
          },
        },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data?.reply || "Sorry, I couldn't generate a response.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("AI Chat error:", err);
      if (err?.message?.includes("429") || err?.status === 429) {
        toast.error("Rate limit reached. Please wait a moment.");
      } else if (err?.message?.includes("402") || err?.status === 402) {
        toast.error("Credits exhausted. Please add funds.");
      } else {
        toast.error("Failed to get AI response");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">BrainBuddy AI</h1>
            <p className="text-xs text-muted-foreground">Your AI study partner</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="p-4 rounded-full bg-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Hey! I'm BrainBuddy 🧠</h2>
              <p className="text-muted-foreground max-w-md">
                Ask me anything — doubts, exam tips, study guidance. I'm here to help!
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm p-3 rounded-xl glass-card hover:neon-glow transition-all border border-border/50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "glass-card border border-border/50"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="glass-card border border-border/50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 px-6 py-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Textarea
            placeholder="Ask BrainBuddy anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
          />
          <Button
            variant="neon"
            size="icon"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
