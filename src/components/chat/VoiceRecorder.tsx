import { Mic, Square, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { motion } from "framer-motion";

interface Props {
  onSend: (blob: Blob) => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function VoiceRecorder({ onSend }: Props) {
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  const handleStop = async () => {
    const blob = await stopRecording();
    if (blob) onSend(blob);
  };

  if (!isRecording) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={startRecording}
        className="flex-shrink-0 text-muted-foreground hover:text-primary"
      >
        <Mic className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 flex-1"
    >
      <Button variant="ghost" size="icon" onClick={cancelRecording} className="text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2 flex-1">
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="h-2.5 w-2.5 rounded-full bg-destructive"
        />
        <span className="text-sm font-mono text-muted-foreground">{formatDuration(duration)}</span>
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 60, ease: "linear" }}
          />
        </div>
      </div>

      <Button variant="default" size="icon" onClick={handleStop} className="rounded-full">
        <Send className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
