import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";
import { CallHistoryEntry } from "@/hooks/useCallHistory";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

interface Props {
  history: CallHistoryEntry[];
  loading: boolean;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function CallHistoryList({ history, loading }: Props) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-sm">Loading call history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No call history yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {history.map((call) => {
        const isOutgoing = call.caller_id === user?.id;
        const isMissed = call.status === "missed" || call.status === "rejected";
        const isVideo = call.call_type === "video";

        return (
          <div
            key={call.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-sm flex-shrink-0">
              {call.other_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{call.other_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isMissed ? (
                  <PhoneMissed className="h-3 w-3 text-destructive" />
                ) : isOutgoing ? (
                  <PhoneOutgoing className="h-3 w-3 text-primary" />
                ) : (
                  <PhoneIncoming className="h-3 w-3 text-primary" />
                )}
                <span className={`text-xs ${isMissed ? "text-destructive" : "text-muted-foreground"}`}>
                  {isMissed ? "Missed" : isOutgoing ? "Outgoing" : "Incoming"}
                  {!isMissed && call.duration > 0 && ` · ${formatDuration(call.duration)}`}
                </span>
                {isVideo && <Video className="h-3 w-3 text-muted-foreground" />}
              </div>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
