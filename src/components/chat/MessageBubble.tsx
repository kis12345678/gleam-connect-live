import { useState, useRef } from "react";
import { Check, CheckCheck, Reply, Pencil, Trash2, Pin, Smile, FileText, Play, Pause } from "lucide-react";
import { Message } from "@/hooks/useMessages";
import { GroupedReaction } from "@/hooks/useMessageReactions";
import { EmojiPicker } from "./EmojiPicker";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";

interface Props {
  message: Message;
  isMine: boolean;
  senderName: string | null;
  reactions: GroupedReaction[];
  replyMessage?: Message | null;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onPin: (msgId: string) => void;
  isAnimated?: boolean;
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
}
function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
}
function getFileName(url: string) {
  return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "file");
}

export function MessageBubble({
  message, isMine, senderName, reactions, replyMessage,
  onReply, onEdit, onDelete, onReact, onPin, isAnimated
}: Props) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseDown = () => {
    longPressRef.current = setTimeout(() => setShowActions(true), 500);
  };
  const handleMouseUp = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowActions(true);
  };

  if (message.is_deleted) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-muted/50 italic text-muted-foreground text-sm">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  const renderContent = () => {
    const type = message.message_type;
    const content = message.content;

    if (type === "voice") {
      return (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => {
              if (audioRef.current) {
                if (isPlaying) { audioRef.current.pause(); }
                else { audioRef.current.play(); }
                setIsPlaying(!isPlaying);
              }
            }}
            className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <div className="flex-1 h-1 bg-foreground/20 rounded-full">
            <div className="h-full w-0 bg-primary rounded-full" />
          </div>
          <audio
            ref={audioRef}
            src={content}
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
          />
        </div>
      );
    }

    if (type === "image" || isImageUrl(content)) {
      return (
        <img
          src={content}
          alt="Shared image"
          className="max-w-[250px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity mt-1"
          onClick={() => window.open(content, "_blank")}
          loading="lazy"
        />
      );
    }

    if (type === "video" || isVideoUrl(content)) {
      return <video src={content} controls className="max-w-[250px] rounded-lg mt-1" preload="metadata" />;
    }

    if (type === "file") {
      return (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-1 p-2 bg-background/20 rounded-lg hover:bg-background/30 transition-colors"
        >
          <FileText className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm underline truncate">{getFileName(content)}</span>
        </a>
      );
    }

    if (type === "poll") {
      return null; // Polls are rendered separately
    }

    return <p className="text-sm break-words whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} group relative`}>
      <div
        className="relative max-w-[75%]"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <motion.div
          initial={isAnimated ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl px-4 py-2.5 ${
            isMine
              ? "bg-chat-bubble-sent text-chat-bubble-sent-fg rounded-br-md"
              : "bg-chat-bubble-received text-chat-bubble-received-fg rounded-bl-md"
          }`}
        >
          {senderName && (
            <p className="text-[11px] font-semibold text-primary mb-0.5">{senderName}</p>
          )}

          {/* Reply preview */}
          {replyMessage && (
            <div className="border-l-2 border-primary/50 pl-2 mb-1.5 opacity-70">
              <p className="text-[10px] font-semibold text-primary">{replyMessage.sender_id === user?.id ? "You" : senderName || "Someone"}</p>
              <p className="text-[11px] truncate max-w-[200px]">{replyMessage.content}</p>
            </div>
          )}

          {renderContent()}

          <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
            <span className={`text-[10px] ${isMine ? "text-chat-bubble-sent-fg/60" : "text-muted-foreground"}`}>
              {format(new Date(message.created_at), "HH:mm")}
            </span>
            {message.edited_at && (
              <span className={`text-[9px] ${isMine ? "text-chat-bubble-sent-fg/40" : "text-muted-foreground/60"}`}>edited</span>
            )}
            {isMine && (
              <span className={`text-[10px] ${isMine ? "text-chat-bubble-sent-fg/60" : "text-muted-foreground"}`}>
                {message.is_read ? (
                  <CheckCheck className="h-3.5 w-3.5 inline text-blue-400" />
                ) : (
                  <Check className="h-3.5 w-3.5 inline" />
                )}
              </span>
            )}
          </div>
        </motion.div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(message.id, r.emoji)}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  r.hasReacted ? "bg-primary/10 border-primary/30" : "bg-muted border-border"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick reaction on hover */}
        <div className={`absolute top-0 ${isMine ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover:opacity-100 transition-opacity px-1`}>
          <div className="flex gap-0.5">
            <button onClick={() => onReply(message)} className="p-1 rounded-full hover:bg-muted" title="Reply">
              <Reply className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 rounded-full hover:bg-muted" title="React">
              <Smile className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <div className={`absolute z-50 ${isMine ? "right-0" : "left-0"} -top-10`}>
              <EmojiPicker
                quickMode
                onSelect={(emoji) => onReact(message.id, emoji)}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Context menu */}
        <AnimatePresence>
          {showActions && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute z-50 ${isMine ? "right-0" : "left-0"} top-full mt-1 bg-card rounded-xl shadow-xl border border-border py-1 min-w-[160px]`}
              >
                <button onClick={() => { onReply(message); setShowActions(false); }} className="w-full px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                  <Reply className="h-3.5 w-3.5" /> Reply
                </button>
                <button onClick={() => { setShowEmojiPicker(true); setShowActions(false); }} className="w-full px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                  <Smile className="h-3.5 w-3.5" /> React
                </button>
                <button onClick={() => { onPin(message.id); setShowActions(false); }} className="w-full px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                  <Pin className="h-3.5 w-3.5" /> {message.is_pinned ? "Unpin" : "Pin"}
                </button>
                {isMine && message.message_type === "text" && (
                  <button onClick={() => { onEdit(message); setShowActions(false); }} className="w-full px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                {isMine && (
                  <button onClick={() => { onDelete(message.id); setShowActions(false); }} className="w-full px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
