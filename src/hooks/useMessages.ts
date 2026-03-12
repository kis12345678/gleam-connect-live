import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_read: boolean | null;
  created_at: string;
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setMessages([]); setLoading(false); return; }
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !user || !content.trim()) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    });
    // Update conversation timestamp
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  };

  return { messages, loading, sendMessage };
}
