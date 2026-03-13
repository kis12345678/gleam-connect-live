import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: string[] = [];
        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== user.id && Array.isArray(presences)) {
            const latest = presences[presences.length - 1] as any;
            if (latest?.isTyping) {
              typing.push(latest.displayName || "Someone");
            }
          }
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ isTyping: false, displayName: "" });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user]);

  const sendTyping = useCallback(
    async (displayName: string) => {
      if (!channelRef.current) return;

      await channelRef.current.track({ isTyping: true, displayName });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        if (channelRef.current) {
          await channelRef.current.track({ isTyping: false, displayName: "" });
        }
      }, 3000);
    },
    []
  );

  const stopTyping = useCallback(async () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (channelRef.current) {
      await channelRef.current.track({ isTyping: false, displayName: "" });
    }
  }, []);

  return { typingUsers, sendTyping, stopTyping };
}
