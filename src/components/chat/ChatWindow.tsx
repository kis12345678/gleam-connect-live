import { useState, useRef, useEffect } from "react";
import { Send, Phone, Video, MoreVertical, ArrowLeft, Users, Paperclip, Image, FileText, X, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { Conversation } from "@/hooks/useConversations";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Props {
  conversation: Conversation | null;
  onBack?: () => void;
  onStartCall?: (callType: "voice" | "video") => void;
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

export function ChatWindow({ conversation, onBack, onStartCall }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { messages, sendMessage } = useMessages(conversation?.id || null);
  const { typingUsers, sendTyping, stopTyping } = useTypingIndicator(conversation?.id || null);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage("");
    stopTyping();
    await sendMessage(msg);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim() && profile) {
      sendTyping(profile.display_name);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user || !conversation) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Max 20MB.");
      return;
    }
    setUploading(true);
    setShowAttach(false);
    try {
      const ext = file.name.split(".").pop();
      const path = `${conversation.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("chat-files").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      
      let messageType = "file";
      if (file.type.startsWith("image/")) messageType = "image";
      else if (file.type.startsWith("video/")) messageType = "video";

      await sendMessage(urlData.publicUrl, messageType);
    } catch (err: any) {
      toast.error("Failed to upload file");
      console.error(err);
    }
    setUploading(false);
  };

  const isGroup = conversation?.type === "group";
  const other = !isGroup ? conversation?.participants.find(p => p.user_id !== user?.id) : null;
  const headerName = isGroup ? (conversation?.name || "Group Chat") : (other?.display_name || "Unknown");
  const headerSubtitle = isGroup
    ? `${conversation?.participants.length} members`
    : (other?.is_online ? "Online" : "Offline");

  const getSenderName = (senderId: string) => {
    if (senderId === user?.id) return null;
    const p = conversation?.participants.find(pp => pp.user_id === senderId);
    return p?.display_name || "Unknown";
  };

  const renderMessageContent = (msg: { content: string; message_type: string }) => {
    const type = msg.message_type;
    const content = msg.content;

    if (type === "image" || isImageUrl(content)) {
      return (
        <div className="mt-1">
          <img
            src={content}
            alt="Shared image"
            className="max-w-[250px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(content, "_blank")}
            loading="lazy"
          />
        </div>
      );
    }

    if (type === "video" || isVideoUrl(content)) {
      return (
        <div className="mt-1">
          <video
            src={content}
            controls
            className="max-w-[250px] rounded-lg"
            preload="metadata"
          />
        </div>
      );
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

    return <p className="text-sm break-words">{content}</p>;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Send className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display font-semibold text-xl mb-2">TalkFree</h2>
          <p className="text-muted-foreground text-sm">Select a conversation or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative">
          {isGroup ? (
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent" />
            </div>
          ) : other?.avatar_url ? (
            <img src={other.avatar_url} alt={other.display_name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-sm">
              {headerName.charAt(0).toUpperCase()}
            </div>
          )}
          {!isGroup && other?.is_online && (
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{headerName}</p>
          <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
        </div>
        {!isGroup && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onStartCall?.("voice")}>
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onStartCall?.("video")}>
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          const senderName = isGroup ? getSenderName(msg.sender_id) : null;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i > messages.length - 3 ? 0.05 : 0 }}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "bg-chat-bubble-sent text-chat-bubble-sent-fg rounded-br-md"
                    : "bg-chat-bubble-received text-chat-bubble-received-fg rounded-bl-md"
                }`}
              >
                {senderName && (
                  <p className="text-[11px] font-semibold text-primary mb-0.5">{senderName}</p>
                )}
                {renderMessageContent(msg)}
                <p className={`text-[10px] mt-1 ${isMine ? "text-chat-bubble-sent-fg/60" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-chat-bubble-received text-chat-bubble-received-fg rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground italic">
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing
                </span>
                <span className="flex gap-0.5 ml-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-card">
        {/* Attachment menu */}
        {showAttach && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 mb-3 p-3 bg-muted rounded-lg"
          >
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-primary hover:opacity-80"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Image className="h-5 w-5" />
              </div>
              <span className="text-[10px]">Photo</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-primary hover:opacity-80"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-[10px]">File</span>
            </button>
          </motion.div>
        )}

        <div className="flex gap-2 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowAttach(!showAttach)}
            disabled={uploading}
            className="flex-shrink-0"
          >
            {showAttach ? <X className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
          </Button>
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder={uploading ? "Uploading..." : "Type a message..."}
            className="flex-1 bg-muted border-0"
            disabled={uploading}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || uploading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />
      </form>
    </div>
  );
}
