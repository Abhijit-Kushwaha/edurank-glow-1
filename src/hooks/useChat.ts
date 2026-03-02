import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string | null;
  messageType: string;
  sharedContent: any;
  isRead: boolean;
  createdAt: string;
}

export const useChat = (friendUserId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user || !friendUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const mapped: ChatMessage[] = (data || []).map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        content: m.content,
        messageType: m.message_type,
        sharedContent: m.shared_content,
        isRead: m.is_read,
        createdAt: m.created_at,
      }));

      setMessages(mapped);

      // Mark unread messages as read
      const unreadIds =
        data
          ?.filter((m) => m.receiver_id === user.id && !m.is_read)
          .map((m) => m.id) || [];

      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadIds);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, friendUserId]);

  useEffect(() => {
    if (!user || !friendUserId) return;

    fetchMessages();

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`chat-${[user.id, friendUserId].sort().join("-")}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as any;
          // Only add messages for this conversation
          if (
            (msg.sender_id === user.id && msg.receiver_id === friendUserId) ||
            (msg.sender_id === friendUserId && msg.receiver_id === user.id)
          ) {
            const newMsg: ChatMessage = {
              id: msg.id,
              senderId: msg.sender_id,
              receiverId: msg.receiver_id,
              content: msg.content,
              messageType: msg.message_type,
              sharedContent: msg.shared_content,
              isRead: msg.is_read,
              createdAt: msg.created_at,
            };
            setMessages((prev) => [...prev, newMsg]);

            // Auto-mark as read if we're the receiver
            if (msg.receiver_id === user.id) {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", msg.id)
                .then(() => {});
            }
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user, friendUserId, fetchMessages]);

  const sendMessage = async (
    content: string,
    messageType = "text",
    sharedContent: any = null,
  ) => {
    if (!user || !friendUserId || (!content.trim() && !sharedContent)) return;
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: friendUserId,
        content: content.trim() || null,
        message_type: messageType,
        shared_content: sharedContent,
      } as any);

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  return { messages, loading, sendMessage, refetch: fetchMessages };
};
