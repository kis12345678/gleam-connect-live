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
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6">
          {/* Pulsing avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-primary/20"
              />
              <div className="relative h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                {call.callerName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-lg">{call.callerName}</p>
              <p className="text-sm text-muted-foreground">
                Incoming {call.callType} call...
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-6 mt-6">
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full h-14 w-14 p-0"
              onClick={() => onReject(call)}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="rounded-full h-14 w-14 p-0 bg-green-500 hover:bg-green-600 text-white"
              onClick={() => onAnswer(call)}
            >
              {call.callType === "video" ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
