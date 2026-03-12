import { useState, useRef, useEffect } from "react";
import { Send, Phone, Video, MoreVertical, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/lib/auth";
import { Conversation } from "@/hooks/useConversations";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Props {
  conversation: Conversation | null;
  onBack?: () => void;
}

export function ChatWindow({ conversation, onBack }: Props) {
  const { user } = useAuth();
  const { messages, sendMessage } = useMessages(conversation?.id || null);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage("");
    await sendMessage(msg);
  };

  const other = conversation?.participants.find(p => p.user_id !== user?.id);

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
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-sm">
            {other?.display_name.charAt(0).toUpperCase() || "?"}
          </div>
          {other?.is_online && (
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{other?.display_name || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">
            {other?.is_online ? "Online" : "Offline"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => toast.info("Voice call coming soon!")}>
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => toast.info("Video call coming soon!")}>
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
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
                <p className="text-sm break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-chat-bubble-sent-fg/60" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-muted border-0"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
