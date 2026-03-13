import { CallQualityStats, ConnectionQuality } from "@/hooks/useCallQuality";
import { Signal, SignalHigh, SignalMedium, SignalLow, SignalZero, Wifi, WifiOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  stats: CallQualityStats;
}

const qualityConfig: Record<ConnectionQuality, { icon: typeof Signal; label: string; colorClass: string }> = {
  excellent: { icon: SignalHigh, label: "Excellent", colorClass: "text-green-500" },
  good: { icon: SignalHigh, label: "Good", colorClass: "text-emerald-400" },
  fair: { icon: SignalMedium, label: "Fair", colorClass: "text-amber-400" },
  poor: { icon: SignalLow, label: "Poor", colorClass: "text-destructive" },
  unknown: { icon: SignalZero, label: "Connecting...", colorClass: "text-muted-foreground" },
};

export function CallQualityIndicator({ stats }: Props) {
  const config = qualityConfig[stats.quality];
  const Icon = config.icon;
  const isDisconnected = stats.connectionState === "disconnected" || stats.connectionState === "failed";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/10 backdrop-blur-sm">
            {isDisconnected ? (
              <WifiOff className="h-4 w-4 text-destructive" />
            ) : (
              <Icon className={`h-4 w-4 ${config.colorClass}`} />
            )}
            <span className={`text-xs font-medium ${isDisconnected ? "text-destructive" : config.colorClass}`}>
              {isDisconnected ? "Reconnecting..." : config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1">
          <p className="font-semibold">Connection Details</p>
          {stats.roundTripTime !== null && <p>Latency: {stats.roundTripTime}ms</p>}
          {stats.packetLoss !== null && <p>Packet loss: {stats.packetLoss}%</p>}
          {stats.bitrate !== null && <p>Bitrate: {stats.bitrate} kbps</p>}
          {stats.jitter !== null && <p>Jitter: {stats.jitter}ms</p>}
          {stats.connectionState && <p>State: {stats.connectionState}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
