import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Organization {
  id: string;
  name: string;
  domain: string | null;
  plan: string;
  status: string;
  invite_mode: string;
  ai_enabled: boolean;
}

interface Channel {
  id: string;
  org_id: string;
  classroom_id: string | null;
  name: string;
  description: string | null;
  channel_type: string;
  is_archived: boolean;
  position: number;
  created_at: string;
}

interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  attachments: unknown;
  is_pinned: boolean;
  reply_to: string | null;
  created_at: string;
  sender?: { name: string | null; avatar_url: string | null };
}

interface CustomRole {
  id: string;
  org_id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
}

interface KnowledgePage {
  id: string;
  org_id: string;
  classroom_id: string | null;
  parent_id: string | null;
  title: string;
  content: unknown;
  icon: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export function useOrganization() {
  const { user, profile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [pages, setPages] = useState<KnowledgePage[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = profile?.org_id;

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const [orgRes, channelsRes, rolesRes, pagesRes] = await Promise.all([
        supabase.from("organisations").select("*").eq("id", orgId).single(),
        supabase.from("channels").select("*").eq("org_id", orgId).eq("is_archived", false).order("position"),
        supabase.from("custom_roles").select("*").eq("org_id", orgId).order("position"),
        supabase.from("knowledge_pages").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }),
      ]);

      if (orgRes.data) setOrg(orgRes.data as unknown as Organization);
      if (channelsRes.data) setChannels(channelsRes.data as unknown as Channel[]);
      if (rolesRes.data) setRoles(rolesRes.data as unknown as CustomRole[]);
      if (pagesRes.data) setPages(pagesRes.data as unknown as KnowledgePage[]);
      setLoading(false);
    };

    fetchData();
  }, [orgId]);

  const createChannel = useCallback(async (name: string, type: string, description?: string) => {
    if (!orgId || !profile) return null;
    const { data, error } = await supabase.from("channels").insert({
      org_id: orgId,
      name,
      channel_type: type,
      description: description || null,
      created_by: profile.id,
      position: channels.length,
    }).select().single();

    if (data) setChannels(prev => [...prev, data as unknown as Channel]);
    return { data, error };
  }, [orgId, profile, channels.length]);

  const createRole = useCallback(async (name: string, color: string) => {
    if (!orgId || !profile) return null;
    const { data, error } = await supabase.from("custom_roles").insert({
      org_id: orgId,
      name,
      color,
      created_by: profile.id,
      position: roles.length,
    }).select().single();

    if (data) setRoles(prev => [...prev, data as unknown as CustomRole]);
    return { data, error };
  }, [orgId, profile, roles.length]);

  const createPage = useCallback(async (title: string, parentId?: string) => {
    if (!orgId || !profile) return null;
    const { data, error } = await supabase.from("knowledge_pages").insert({
      org_id: orgId,
      title,
      parent_id: parentId || null,
      created_by: profile.id,
      is_published: false,
    }).select().single();

    if (data) setPages(prev => [data as unknown as KnowledgePage, ...prev]);
    return { data, error };
  }, [orgId, profile]);

  return {
    org,
    channels,
    roles,
    pages,
    loading,
    createChannel,
    createRole,
    createPage,
    isOrgMember: !!orgId,
  };
}

export function useChannelMessages(channelId: string | null) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!channelId) return;

    setLoading(true);
    supabase
      .from("channel_messages")
      .select("*")
      .eq("channel_id", channelId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as unknown as ChannelMessage[]);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`channel-${channelId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "channel_messages",
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as unknown as ChannelMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  const sendMessage = useCallback(async (content: string, senderId: string) => {
    if (!channelId) return;
    await supabase.from("channel_messages").insert({
      channel_id: channelId,
      sender_id: senderId,
      content,
      message_type: "text",
    });
  }, [channelId]);

  return { messages, loading, sendMessage };
}
