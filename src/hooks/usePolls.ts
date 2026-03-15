import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Poll {
  id: string;
  conversation_id: string;
  creator_id: string;
  question: string;
  options: string[];
  is_multiple_choice: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
}

export function usePolls(conversationId: string | null) {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);

  const fetchPolls = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from("polls" as any)
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });
    setPolls((data as unknown as Poll[]) || []);

    if (data?.length) {
      const pollIds = data.map((p: any) => p.id);
      const { data: voteData } = await supabase
        .from("poll_votes" as any)
        .select("*")
        .in("poll_id", pollIds);
      setVotes((voteData as unknown as PollVote[]) || []);
    }
  }, [conversationId]);

  useEffect(() => { fetchPolls(); }, [fetchPolls]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`polls:${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => fetchPolls())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => fetchPolls())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchPolls]);

  const createPoll = async (question: string, options: string[], isMultipleChoice: boolean = false) => {
    if (!user || !conversationId) return;
    await supabase.from("polls" as any).insert({
      conversation_id: conversationId,
      creator_id: user.id,
      question,
      options,
      is_multiple_choice: isMultipleChoice,
    });
  };

  const vote = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    const existingVote = votes.find(v => v.poll_id === pollId && v.user_id === user.id && v.option_index === optionIndex);
    if (existingVote) {
      await supabase.from("poll_votes" as any).delete().eq("id", existingVote.id);
    } else {
      if (!poll.is_multiple_choice) {
        // Remove existing votes first
        const myVotes = votes.filter(v => v.poll_id === pollId && v.user_id === user.id);
        for (const v of myVotes) {
          await supabase.from("poll_votes" as any).delete().eq("id", v.id);
        }
      }
      await supabase.from("poll_votes" as any).insert({
        poll_id: pollId,
        user_id: user.id,
        option_index: optionIndex,
      });
    }
  };

  const getVotesForPoll = useCallback((pollId: string) => {
    return votes.filter(v => v.poll_id === pollId);
  }, [votes]);

  return { polls, createPoll, vote, getVotesForPoll };
}
