import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface CallHistoryEntry {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  call_type: string;
  status: string;
  duration: number;
  started_at: string;
  ended_at: string | null;
  other_name?: string;
}

export function useCallHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("call_history")
      .select("*")
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
      .order("started_at", { ascending: false })
      .limit(50);

    if (data) {
      // Fetch display names for other participants
      const otherIds = [...new Set(data.map((c) => (c.caller_id === user.id ? c.callee_id : c.caller_id)))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", otherIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        nameMap[p.user_id] = p.display_name;
      });

      setHistory(
        data.map((c) => ({
          ...c,
          other_name: nameMap[c.caller_id === user.id ? c.callee_id : c.caller_id] || "Unknown",
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const logCall = useCallback(
    async (params: {
      conversationId: string;
      callerId: string;
      calleeId: string;
      callType: string;
      status: string;
      duration: number;
    }) => {
      if (!user) return;
      await supabase.from("call_history").insert({
        conversation_id: params.conversationId,
        caller_id: params.callerId,
        callee_id: params.calleeId,
        call_type: params.callType,
        status: params.status,
        duration: params.duration,
        ended_at: new Date().toISOString(),
      });
      fetchHistory();
    },
    [user, fetchHistory]
  );

  return { history, loading, logCall, refresh: fetchHistory };
}
