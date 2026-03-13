import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CallInfo } from "./useWebRTC";

export function useIncomingCalls() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
        },
        (payload) => {
          const signal = payload.new as any;

          // Only show incoming calls for this user
          if (signal.callee_id === user.id && signal.signal_type === "call-start") {
            setIncomingCall({
              conversationId: signal.conversation_id,
              callerId: signal.caller_id,
              calleeId: signal.callee_id,
              callType: signal.call_type,
              callerName: signal.signal_data?.callerName || "Unknown",
            });
          }

          // Clear incoming call if ended/rejected
          if (
            (signal.signal_type === "call-end" || signal.signal_type === "call-reject") &&
            (signal.caller_id === user.id || signal.callee_id === user.id)
          ) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearIncoming = () => setIncomingCall(null);

  return { incomingCall, clearIncoming };
}
