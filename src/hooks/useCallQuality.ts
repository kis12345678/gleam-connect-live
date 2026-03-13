import { useState, useEffect, useRef, useCallback } from "react";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

export interface CallQualityStats {
  quality: ConnectionQuality;
  roundTripTime: number | null; // ms
  packetLoss: number | null; // percentage
  bitrate: number | null; // kbps
  jitter: number | null; // ms
  connectionState: RTCPeerConnectionState | null;
}

const INITIAL_STATS: CallQualityStats = {
  quality: "unknown",
  roundTripTime: null,
  packetLoss: null,
  bitrate: null,
  jitter: null,
  connectionState: null,
};

function classifyQuality(rtt: number | null, loss: number | null): ConnectionQuality {
  if (rtt === null && loss === null) return "unknown";
  const r = rtt ?? 0;
  const l = loss ?? 0;
  if (r < 100 && l < 1) return "excellent";
  if (r < 200 && l < 3) return "good";
  if (r < 400 && l < 8) return "fair";
  return "poor";
}

export function useCallQuality(pc: RTCPeerConnection | null, isActive: boolean) {
  const [stats, setStats] = useState<CallQualityStats>(INITIAL_STATS);
  const prevBytesRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(0);

  const pollStats = useCallback(async () => {
    if (!pc) return;

    try {
      const report = await pc.getStats();
      let rtt: number | null = null;
      let packetLoss: number | null = null;
      let jitter: number | null = null;
      let totalBytesSent = 0;

      report.forEach((s) => {
        if (s.type === "candidate-pair" && s.state === "succeeded") {
          rtt = s.currentRoundTripTime != null ? Math.round(s.currentRoundTripTime * 1000) : null;
        }

        if (s.type === "inbound-rtp" && s.kind === "audio") {
          if (s.packetsLost != null && s.packetsReceived != null) {
            const total = s.packetsLost + s.packetsReceived;
            packetLoss = total > 0 ? Math.round((s.packetsLost / total) * 100 * 10) / 10 : 0;
          }
          if (s.jitter != null) {
            jitter = Math.round(s.jitter * 1000);
          }
        }

        if (s.type === "outbound-rtp") {
          totalBytesSent += s.bytesSent ?? 0;
        }
      });

      const now = Date.now();
      let bitrate: number | null = null;
      if (prevTimestampRef.current > 0 && totalBytesSent > 0) {
        const dt = (now - prevTimestampRef.current) / 1000;
        if (dt > 0) {
          bitrate = Math.round(((totalBytesSent - prevBytesRef.current) * 8) / dt / 1000);
        }
      }
      prevBytesRef.current = totalBytesSent;
      prevTimestampRef.current = now;

      setStats({
        quality: classifyQuality(rtt, packetLoss),
        roundTripTime: rtt,
        packetLoss,
        bitrate: bitrate && bitrate > 0 ? bitrate : null,
        jitter,
        connectionState: pc.connectionState,
      });
    } catch {
      // Stats may not be available
    }
  }, [pc]);

  useEffect(() => {
    if (!isActive || !pc) {
      setStats(INITIAL_STATS);
      prevBytesRef.current = 0;
      prevTimestampRef.current = 0;
      return;
    }

    const interval = setInterval(pollStats, 2000);
    pollStats();

    return () => clearInterval(interval);
  }, [isActive, pc, pollStats]);

  return stats;
}
