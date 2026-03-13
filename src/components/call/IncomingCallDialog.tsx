import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CallInfo } from "@/hooks/useWebRTC";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  call: CallInfo | null;
  onAnswer: (call: CallInfo) => void;
  onReject: (call: CallInfo) => void;
}

export function IncomingCallDialog({ call, onAnswer, onReject }: Props) {
  if (!call) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center"
      >
        {/* Pulsing avatar */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-[-12px] rounded-full bg-primary/15"
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-[-4px] rounded-full bg-primary/25"
            />
            <div className="relative h-24 w-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl">
              {call.callerName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="font-semibold text-2xl text-foreground">{call.callerName}</p>
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-base text-muted-foreground mt-2"
            >
              Incoming {call.callType} call...
            </motion.p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-12 mt-16">
          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full h-16 w-16 p-0 shadow-lg"
              onClick={() => onReject(call)}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
            <span className="text-xs text-muted-foreground">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="rounded-full h-16 w-16 p-0 shadow-lg bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onAnswer(call)}
            >
              {call.callType === "video" ? (
                <Video className="h-7 w-7" />
              ) : (
                <Phone className="h-7 w-7" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground">Accept</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
