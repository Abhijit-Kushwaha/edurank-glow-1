import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PresenceState {
  /** Map of userId -> online status */
  onlineUsers: Set<string>;
  /** Check if a specific user is online */
  isOnline: (userId: string) => boolean;
}

/**
 * Hook that tracks online/offline status of friends using Supabase Realtime Presence.
 *
 * How it works:
 * 1. On mount, joins a shared "presence:friends" channel
 * 2. Tracks the current user as online with user_id
 * 3. Listens for sync/join/leave events to update online user set
 * 4. Automatically cleans up on unmount
 */
export const usePresence = (friendIds: string[] = []): PresenceState => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    // Join a global presence channel - all authenticated users join this
    const channel = supabase.channel("presence:global", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();

        // Extract all online user IDs from presence state
        Object.keys(state).forEach((key) => {
          // Only track users who are in our friends list
          if (friendIds.includes(key)) {
            online.add(key);
          }
        });

        setOnlineUsers(online);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (friendIds.includes(key)) {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
          });
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this user as online
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, friendIds.join(",")]); // Re-subscribe when friends list changes

  const isOnline = useCallback(
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers],
  );

  return { onlineUsers, isOnline };
};
