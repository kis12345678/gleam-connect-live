import { BarChart3, Check } from "lucide-react";
import { Poll, PollVote } from "@/hooks/usePolls";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

interface Props {
  poll: Poll;
  votes: PollVote[];
  onVote: (pollId: string, optionIndex: number) => void;
}

export function PollDisplay({ poll, votes, onVote }: Props) {
  const { user } = useAuth();
  const totalVotes = votes.length;
  const myVotes = votes.filter((v) => v.user_id === user?.id).map((v) => v.option_index);

  return (
    <div className="bg-card/50 rounded-xl border border-border p-3 max-w-[300px]">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs text-primary font-medium">Poll</span>
      </div>
      <p className="font-medium text-sm mb-3">{poll.question}</p>
      
      <div className="space-y-2">
        {poll.options.map((option: string, i: number) => {
          const optionVotes = votes.filter((v) => v.option_index === i).length;
          const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const hasVoted = myVotes.includes(i);

          return (
            <button
              key={i}
              onClick={() => onVote(poll.id, i)}
              className="w-full text-left relative overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary/10"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5 }}
              />
              <div className="relative flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  {hasVoted && <Check className="h-3.5 w-3.5 text-primary" />}
                  <span className="text-sm">{option}</span>
                </div>
                <span className="text-xs text-muted-foreground">{percentage}%</span>
              </div>
            </button>
          );
        })}
      </div>
      
      <p className="text-[10px] text-muted-foreground mt-2">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
    </div>
  );
}
