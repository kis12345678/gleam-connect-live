import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export function useMessageReactions(conversationId: string | null) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const fetchReactions = useCallback(async () => {
    if (!conversationId) return;
    // Fetch reactions for all messages in this conversation
    const { data: msgs } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId);
    
    if (!msgs?.length) return;
    const msgIds = msgs.map(m => m.id);

    const { data } = await supabase
      .from("message_reactions" as any)
      .select("*")
      .in("message_id", msgIds);
    
    setReactions((data as Reaction[]) || []);
  }, [conversationId]);

  useEffect(() => { fetchReactions(); }, [fetchReactions]);

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        fetchReactions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchReactions]);

  const getReactionsForMessage = useCallback((messageId: string): GroupedReaction[] => {
    const msgReactions = reactions.filter(r => r.message_id === messageId);
    const grouped: Record<string, { count: number; users: string[] }> = {};
    
    for (const r of msgReactions) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user_id);
    }

    return Object.entries(grouped).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      users: data.users,
      hasReacted: data.users.includes(user?.id || ""),
    }));
  }, [reactions, user]);

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    
    if (existing) {
      await supabase.from("message_reactions" as any).delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions" as any).insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }
  };

  return { getReactionsForMessage, toggleReaction };
}
