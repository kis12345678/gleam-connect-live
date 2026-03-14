import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Status } from "@/hooks/useStatuses";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface Props {
  statuses: Status[];
  onClose: () => void;
}

export function StatusViewer({ statuses, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = statuses[currentIndex];

  // Auto-advance for text statuses
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < statuses.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        onClose();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex, statuses.length, onClose]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Progress bars */}
      <div className="flex gap-1 p-2 px-4">
        {statuses.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: i < currentIndex ? "100%" : "0%" }}
              animate={{ width: i === currentIndex ? "100%" : i < currentIndex ? "100%" : "0%" }}
              transition={{ duration: i === currentIndex ? 5 : 0, ease: "linear" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="h-10 w-10 rounded-full flex-shrink-0">
          {current.avatar_url ? (
            <img src={current.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-sm">
              {current.display_name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{current.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(current.created_at), { addSuffix: true })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center relative"
        style={current.media_type === "text" ? { backgroundColor: current.background_color } : {}}
      >
        {current.media_type === "text" ? (
          <p className="text-white text-2xl font-medium text-center px-8 leading-relaxed">
            {current.content}
          </p>
        ) : current.media_type === "image" ? (
          <img src={current.media_url!} alt="" className="max-w-full max-h-full object-contain" />
        ) : current.media_type === "video" ? (
          <video src={current.media_url!} autoPlay playsInline className="max-w-full max-h-full object-contain" />
        ) : null}

        {current.content && current.media_type !== "text" && (
          <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur rounded-lg p-3">
            <p className="text-sm">{current.content}</p>
          </div>
        )}

        {/* Navigation areas */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/3"
          onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-1/3"
          onClick={() => currentIndex < statuses.length - 1 ? setCurrentIndex(currentIndex + 1) : onClose()}
        />
      </div>
    </motion.div>
  );
}
