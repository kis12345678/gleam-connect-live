import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Hash, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Channel, useChannelMessages } from "@/hooks/useChannels";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

interface Props {
  channel: Channel;
  onBack?: () => void;
}

export function ChannelChat({ channel, onBack }: Props) {
  const { user } = useAuth();
  const { messages, sendMessage } = useChannelMessages(channel.id);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await sendMessage(newMessage);
    setNewMessage("");
  };

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Hash className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{channel.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {channel.member_count} members
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <motion.div
              key={msg.id}
              initial={i > messages.length - 3 ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-2 max-w-[75%] ${isMine ? "flex-row-reverse" : ""}`}>
                {!isMine && (
                  <div className="flex-shrink-0">
                    {msg.sender_avatar ? (
                      <img src={msg.sender_avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                        {msg.sender_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "bg-chat-bubble-sent text-chat-bubble-sent-fg rounded-br-md"
                    : "bg-chat-bubble-received text-chat-bubble-received-fg rounded-bl-md"
                }`}>
                  {!isMine && (
                    <p className="text-[11px] font-semibold text-primary mb-0.5">{msg.sender_name}</p>
                  )}
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-chat-bubble-sent-fg/60" : "text-muted-foreground"}`}>
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message #${channel.name}...`}
          className="flex-1 bg-muted border-0"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim()} className="rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
