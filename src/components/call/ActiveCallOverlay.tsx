import { useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CallState, CallInfo } from "@/hooks/useWebRTC";
import { useCallQuality } from "@/hooks/useCallQuality";
import { CallQualityIndicator } from "@/components/call/CallQualityIndicator";
import { motion } from "framer-motion";

interface Props {
  callState: CallState;
  callInfo: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  peerConnection: RTCPeerConnection | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ActiveCallOverlay({
  callState,
  callInfo,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  callDuration,
  peerConnection,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const qualityStats = useCallQuality(peerConnection, callState === "connected");

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      // Always set audio element for voice calls
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  if (callState === "idle" || callState === "ended" || !callInfo) return null;

  const isVideo = callInfo.callType === "video";
  const otherName = callInfo.callerName;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-background flex flex-col"
    >
      {/* Quality indicator */}
      {callState === "connected" && (
        <div className="absolute top-4 left-4 z-10">
          <CallQualityIndicator stats={qualityStats} />
        </div>
      )}

      {/* Video area */}
      {isVideo ? (
        <div className="flex-1 relative bg-foreground/5">
          {/* Remote video (full screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Local video (pip) */}
          <div className="absolute top-4 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-card shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Calling overlay */}
          {callState === "calling" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
                >
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
                    {otherName.charAt(0).toUpperCase()}
                  </div>
                </motion.div>
                <p className="font-display font-semibold text-lg">{otherName}</p>
                <p className="text-sm text-muted-foreground mt-1">Calling...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Voice call - avatar view */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={
                callState === "calling"
                  ? { scale: [1, 1.1, 1] }
                  : {}
              }
              transition={{ repeat: Infinity, duration: 2 }}
              className="h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
            >
              <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl">
                {otherName.charAt(0).toUpperCase()}
              </div>
            </motion.div>
            <p className="font-display font-semibold text-xl">{otherName}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {callState === "calling"
                ? "Calling..."
                : callState === "ringing"
                ? "Ringing..."
                : formatDuration(callDuration)}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-8 flex justify-center gap-4">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          className="rounded-full h-14 w-14 p-0"
          onClick={onToggleMute}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        {isVideo && (
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full h-14 w-14 p-0"
            onClick={onToggleVideo}
          >
            {isVideoOff ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
        )}

        <Button
          variant="destructive"
          size="lg"
          className="rounded-full h-14 w-14 p-0"
          onClick={onEndCall}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
