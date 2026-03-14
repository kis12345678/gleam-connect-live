import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CallInfo } from "./useWebRTC";
import { useNotificationPermission } from "./useNotificationPermission";

export function useIncomingCalls() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const { permission, requestPermission, showNotification } = useNotificationPermission();

  // Request notification permission on mount
  useEffect(() => {
    if (permission === "default") {
      requestPermission();
    }
  }, [permission, requestPermission]);

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
            const callData: CallInfo = {
              conversationId: signal.conversation_id,
              callerId: signal.caller_id,
              calleeId: signal.callee_id,
              callType: signal.call_type,
              callerName: signal.signal_data?.callerName || "Unknown",
            };
            setIncomingCall(callData);

            // Vibrate on mobile devices
            if ("vibrate" in navigator) {
              // Ring pattern: vibrate 500ms, pause 300ms, repeat
              const vibratePattern = [500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 500];
              navigator.vibrate(vibratePattern);
            }

            // Show browser notification when tab is in background
            showNotification(
              `Incoming ${signal.call_type} call`,
              {
                body: `${callData.callerName} is calling you`,
                icon: "/pwa-192x192.png",
                tag: "incoming-call",
                requireInteraction: true,
              } as NotificationOptions
            );
          }

          // Clear incoming call if ended/rejected
          if (
            (signal.signal_type === "call-end" || signal.signal_type === "call-reject") &&
            (signal.caller_id === user.id || signal.callee_id === user.id)
          ) {
            setIncomingCall(null);
            // Stop vibration
            if ("vibrate" in navigator) {
              navigator.vibrate(0);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showNotification]);

  const clearIncoming = () => {
    setIncomingCall(null);
    if ("vibrate" in navigator) navigator.vibrate(0);
  };

  return { incomingCall, clearIncoming };
}
