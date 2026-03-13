import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Profile } from "./useProfile";

export interface Conversation {
  id: string;
  type: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  participants: Profile[];
  lastMessage?: { content: string; created_at: string; sender_id: string };
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations?.length) { setConversations([]); setLoading(false); return; }

    const convIds = participations.map(p => p.conversation_id);

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    if (!convs) { setConversations([]); setLoading(false); return; }

    const enriched: Conversation[] = await Promise.all(
      convs.map(async (conv) => {
        const { data: parts } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.id);

        const userIds = parts?.map(p => p.user_id) || [];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds);

        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          ...conv,
          participants: (profiles as Profile[]) || [],
          lastMessage: msgs?.[0] || undefined,
        };
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const startConversation = async (otherUserId: string) => {
    if (!user) return null;

    // Check if direct conversation already exists
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvs?.length) {
      for (const mc of myConvs) {
        const { data: otherPart } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", mc.conversation_id)
          .eq("user_id", otherUserId);

        if (otherPart?.length) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("*")
            .eq("id", mc.conversation_id)
            .eq("type", "direct")
            .single();
          if (conv) return conv.id;
        }
      }
    }

    // Create new conversation
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ type: "direct" })
      .select()
      .single();

    if (!newConv) return null;

    await supabase.from("conversation_participants").insert(
      { conversation_id: newConv.id, user_id: user.id }
    );
    await supabase.from("conversation_participants").insert(
      { conversation_id: newConv.id, user_id: otherUserId }
    );

    await fetchConversations();
    return newConv.id;
  };

  const createGroupConversation = async (userIds: string[], name: string) => {
    if (!user) return null;

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ type: "group", name })
      .select()
      .single();

    if (!newConv) return null;

    // Add self first
    await supabase.from("conversation_participants").insert(
      { conversation_id: newConv.id, user_id: user.id }
    );

    // Add all selected users
    for (const uid of userIds) {
      await supabase.from("conversation_participants").insert(
        { conversation_id: newConv.id, user_id: uid }
      );
    }

    await fetchConversations();
    return newConv.id;
  };

  return { conversations, loading, startConversation, createGroupConversation, refresh: fetchConversations };
}
