import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  type: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
  is_member?: boolean;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  reply_to_id: string | null;
  is_pinned: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string | null;
}

export function useChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    if (!user) return;
    
    const { data: allChannels } = await supabase
      .from("channels" as any)
      .select("*")
      .order("updated_at", { ascending: false });

    if (!allChannels) { setChannels([]); setLoading(false); return; }

    const { data: memberships } = await supabase
      .from("channel_members" as any)
      .select("channel_id")
      .eq("user_id", user.id);

    const memberChannelIds = new Set(memberships?.map((m: any) => m.channel_id) || []);

    // Get member counts
    const enriched: Channel[] = await Promise.all(
      allChannels.map(async (ch: any) => {
        const { count } = await supabase
          .from("channel_members" as any)
          .select("*", { count: "exact", head: true })
          .eq("channel_id", ch.id);

        return {
          ...ch,
          member_count: count || 0,
          is_member: memberChannelIds.has(ch.id),
        };
      })
    );

    setChannels(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const createChannel = async (name: string, description: string, type: string = "public") => {
    if (!user) return null;
    const { data } = await supabase
      .from("channels" as any)
      .insert({ name, description, creator_id: user.id, type })
      .select()
      .single();
    
    if (data) {
      await supabase.from("channel_members" as any).insert({
        channel_id: (data as any).id,
        user_id: user.id,
        role: "admin",
      });
      await fetchChannels();
      return (data as any).id;
    }
    return null;
  };

  const joinChannel = async (channelId: string) => {
    if (!user) return;
    await supabase.from("channel_members" as any).insert({
      channel_id: channelId,
      user_id: user.id,
      role: "member",
    });
    await fetchChannels();
  };

  const leaveChannel = async (channelId: string) => {
    if (!user) return;
    await supabase
      .from("channel_members" as any)
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", user.id);
    await fetchChannels();
  };

  return { channels, loading, createChannel, joinChannel, leaveChannel, refresh: fetchChannels };
}

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!channelId) { setMessages([]); setLoading(false); return; }
    
    const { data } = await supabase
      .from("channel_messages" as any)
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });

    if (data) {
      const senderIds = [...new Set((data as any[]).map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", senderIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      setMessages(
        (data as any[]).map((m) => ({
          ...m,
          sender_name: profileMap.get(m.sender_id)?.display_name || "Unknown",
          sender_avatar: profileMap.get(m.sender_id)?.avatar_url,
        }))
      );
    }
    setLoading(false);
  }, [channelId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!channelId) return;
    const channel = supabase
      .channel(`channel_msgs:${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channelId}` }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId, fetchMessages]);

  const sendMessage = async (content: string, messageType: string = "text") => {
    if (!channelId || !user || !content.trim()) return;
    await supabase.from("channel_messages" as any).insert({
      channel_id: channelId,
      sender_id: user.id,
      content: content.trim(),
      message_type: messageType,
    });
  };

  return { messages, loading, sendMessage };
}
