import { useState, useRef, useEffect } from "react";
import { Send, Share2, Trophy, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, ChatMessage } from "@/hooks/useChat";
import { format } from "date-fns";
import ShareContentDialog from "./ShareContentDialog";

interface ChatWindowProps {
  friendUserId: string;
  friendName: string;
}

const ChatWindow = ({ friendUserId, friendName }: ChatWindowProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChat(friendUserId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(input);
      setInput("");
    } catch {
      // Error handled in hook
    } finally {
      setSending(false);
    }
  };

  const handleShareContent = async (type: string, content: any) => {
    try {
      await sendMessage(
        type === "quiz_share"
          ? "📊 Shared a quiz result"
          : "📝 Shared study notes",
        type,
        content,
      );
      setShareOpen(false);
    } catch {
      // Error handled in hook
    }
  };

  const renderSharedContent = (msg: ChatMessage) => {
    if (msg.messageType === "quiz_share" && msg.sharedContent) {
      return (
        <div className="mt-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Trophy className="h-3 w-3" />
            Quiz Result
          </div>
          <p className="text-xs mt-1">
            Score: {msg.sharedContent.score}% ({msg.sharedContent.correct}/
            {msg.sharedContent.total})
          </p>
          {msg.sharedContent.topic && (
            <p className="text-xs text-muted-foreground">
              Topic: {msg.sharedContent.topic}
            </p>
          )}
        </div>
      );
    }
    if (msg.messageType === "notes_share" && msg.sharedContent) {
      return (
        <div className="mt-2 p-2 rounded-lg bg-secondary/10 border border-secondary/20">
          <div className="flex items-center gap-2 text-xs font-medium text-secondary">
            <BookOpen className="h-3 w-3" />
            Study Notes
          </div>
          <p className="text-xs mt-1 line-clamp-3">{msg.sharedContent.title}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No messages yet. Say hi to {friendName}! 👋</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}
              >
                {msg.content && <p>{msg.content}</p>}
                {renderSharedContent(msg)}
                <p
                  className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}
                >
                  {format(new Date(msg.createdAt), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-border flex gap-2"
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      <ShareContentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        onShare={handleShareContent}
      />
    </div>
  );
};

export default ChatWindow;
