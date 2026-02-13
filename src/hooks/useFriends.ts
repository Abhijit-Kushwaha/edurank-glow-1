import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Friend {
  id: string;
  friendshipId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalXp: number;
  status: string;
}

export interface FriendRequest {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    try {
      // Get accepted friendships where user is either side
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) throw error;

      if (!friendships?.length) {
        setFriends([]);
        return;
      }

      // Get friend user IDs
      const friendUserIds = friendships.map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Get profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url, total_xp')
        .in('user_id', friendUserIds);

      if (profileError) throw profileError;

      const friendsList: Friend[] = friendships.map(f => {
        const friendUserId = f.user_id === user.id ? f.friend_id : f.user_id;
        const profile = profiles?.find(p => p.user_id === friendUserId);
        return {
          id: friendUserId,
          friendshipId: f.id,
          userId: friendUserId,
          name: profile?.name || 'Unknown',
          avatarUrl: profile?.avatar_url || null,
          totalXp: profile?.total_xp || 0,
          status: f.status,
        };
      });

      setFriends(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, [user]);

  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;
    try {
      const { data: requests, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      if (!requests?.length) {
        setPendingRequests([]);
        return;
      }

      const senderIds = requests.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', senderIds);

      const pending: FriendRequest[] = requests.map(r => {
        const profile = profiles?.find(p => p.user_id === r.user_id);
        return {
          id: r.id,
          userId: r.user_id,
          name: profile?.name || 'Unknown',
          avatarUrl: profile?.avatar_url || null,
          createdAt: r.created_at,
        };
      });

      setPendingRequests(pending);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchFriends(), fetchPendingRequests()]).finally(() => setLoading(false));
    }
  }, [user, fetchFriends, fetchPendingRequests]);

  const sendFriendRequest = async (friendUserId: string) => {
    if (!user) return;
    if (friendUserId === user.id) {
      toast.error("You can't add yourself!");
      return;
    }

    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') toast.info('Already friends!');
        else toast.info('Request already pending.');
        return;
      }

      const { error } = await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: friendUserId,
        status: 'pending',
      } as Record<string, unknown>);

      if (error) throw error;
      toast.success('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send request');
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('Friend request accepted!');
      await Promise.all([fetchFriends(), fetchPendingRequests()]);
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const rejectRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('Request declined.');
      await fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to decline request');
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('Friend removed.');
      await fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    }
  };

  const generateInviteCode = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('friend_invite_codes').insert({
        user_id: user.id,
        code,
        expires_at: expiresAt,
      } as Record<string, unknown>);

      if (error) throw error;
      return code;
    } catch (error) {
      console.error('Error generating invite code:', error);
      toast.error('Failed to generate invite code');
      return null;
    }
  };

  const redeemInviteCode = async (code: string) => {
    if (!user) return;
    try {
      const { data: invite, error: fetchError } = await supabase
        .from('friend_invite_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_used', false)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!invite) {
        toast.error('Invalid or expired invite code.');
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        toast.error('This invite code has expired.');
        return;
      }

      if (invite.user_id === user.id) {
        toast.error("You can't use your own invite code!");
        return;
      }

      // Send friend request
      await sendFriendRequest(invite.user_id);

      // Mark code as used
      await supabase
        .from('friend_invite_codes')
        .update({ is_used: true, used_by: user.id })
        .eq('id', invite.id);

    } catch (error) {
      console.error('Error redeeming invite code:', error);
      toast.error('Failed to redeem invite code');
    }
  };

  const searchUsers = async (query: string): Promise<Array<{ userId: string; name: string; avatarUrl: string | null }>> => {
    if (!user || !query.trim()) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .ilike('name', `%${query}%`)
        .neq('user_id', user.id)
        .limit(10);

      if (error) throw error;
      return (data || []).map(p => ({
        userId: p.user_id,
        name: p.name || 'Unknown',
        avatarUrl: p.avatar_url,
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  return {
    friends,
    pendingRequests,
    loading,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    generateInviteCode,
    redeemInviteCode,
    searchUsers,
    refetch: () => Promise.all([fetchFriends(), fetchPendingRequests()]),
  };
};
