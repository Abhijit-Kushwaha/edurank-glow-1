import { useState, useRef, useEffect } from "react";
import { useChannelMessages } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { Hash, Megaphone, HelpCircle, BookOpen, Send, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const channelIcons: Record<string, typeof Hash> = {
  text: Hash,
  announcements: Megaphone,
  "doubt-solving": HelpCircle,
  resources: BookOpen,
  general: Hash,
};

interface ChannelViewProps {
  channelId: string;
  channel?: {
    name: string;
    description: string | null;
    channel_type: string;
  };
}

export default function ChannelView({ channelId, channel }: ChannelViewProps) {
  const { messages, loading, sendMessage } = useChannelMessages(channelId);
  const { profile } = useAuth();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const Icon = channelIcons[channel?.channel_type || "text"] || Hash;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !profile) return;
    const msg = input.trim();
    setInput("");
    await sendMessage(msg, profile.id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">{channel?.name || "Channel"}</h3>
        {channel?.description && (
          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{channel.description}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Icon className="h-10 w-10 mb-2" />
            <p className="font-medium">Welcome to #{channel?.name}!</p>
            <p className="text-sm">This is the start of this channel.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-xs">
                  {(msg.sender?.name || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{msg.sender?.name || "User"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(msg.created_at), "MMM d, h:mm a")}
                  </span>
                  {msg.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-sm text-foreground/90 break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channel?.name || "channel"}...`}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
