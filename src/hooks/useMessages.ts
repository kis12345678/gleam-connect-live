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
  reply_to_id: string | null;
  edited_at: string | null;
  is_deleted: boolean;
  is_pinned: boolean;
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !user || messages.length === 0) return;
    const unread = messages.filter(m => m.sender_id !== user.id && !m.is_read);
    if (unread.length === 0) return;
    
    supabase
      .from("messages")
      .update({ is_read: true } as any)
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .then();
  }, [messages, conversationId, user]);

  const sendMessage = async (content: string, messageType: string = "text", replyToId?: string) => {
    if (!conversationId || !user || !content.trim()) return;
    const insert: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      message_type: messageType,
    };
    if (replyToId) insert.reply_to_id = replyToId;
    
    await supabase.from("messages").insert(insert);
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ content: newContent.trim(), edited_at: new Date().toISOString() } as any)
      .eq("id", messageId)
      .eq("sender_id", user.id);
  };

  const deleteMessage = async (messageId: string, forEveryone: boolean = false) => {
    if (!user) return;
    if (forEveryone) {
      await supabase
        .from("messages")
        .update({ is_deleted: true, content: "This message was deleted" } as any)
        .eq("id", messageId)
        .eq("sender_id", user.id);
    } else {
      await supabase.from("messages").delete().eq("id", messageId).eq("sender_id", user.id);
    }
  };

  const togglePin = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    await supabase
      .from("messages")
      .update({ is_pinned: !msg.is_pinned } as any)
      .eq("id", messageId);
  };

  const pinnedMessages = messages.filter(m => m.is_pinned && !m.is_deleted);

  return { messages, loading, sendMessage, editMessage, deleteMessage, togglePin, pinnedMessages };
}
