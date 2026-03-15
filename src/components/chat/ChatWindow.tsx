import { useState, useRef, useEffect } from "react";
import { Send, Phone, Video, MoreVertical, ArrowLeft, Users, Paperclip, Image, FileText, X, Smile, BarChart3, Clock, Pin, Search, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMessages, Message } from "@/hooks/useMessages";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { usePolls } from "@/hooks/usePolls";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { Conversation } from "@/hooks/useConversations";
import { supabase } from "@/integrations/supabase/client";
import { MessageBubble } from "./MessageBubble";
import { EmojiPicker } from "./EmojiPicker";
import { VoiceRecorder } from "./VoiceRecorder";
import { PollCreator } from "./PollCreator";
import { PollDisplay } from "./PollDisplay";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Props {
  conversation: Conversation | null;
  onBack?: () => void;
  onStartCall?: (callType: "voice" | "video") => void;
}

export function ChatWindow({ conversation, onBack, onStartCall }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { messages, sendMessage, editMessage, deleteMessage, togglePin, pinnedMessages } = useMessages(conversation?.id || null);
  const { getReactionsForMessage, toggleReaction } = useMessageReactions(conversation?.id || null);
  const { polls, createPoll, vote, getVotesForPoll } = usePolls(conversation?.id || null);
  const { typingUsers, sendTyping, stopTyping } = useTypingIndicator(conversation?.id || null);
  
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    if (editingMessage) {
      await editMessage(editingMessage.id, newMessage);
      setEditingMessage(null);
    } else {
      await sendMessage(newMessage, "text", replyTo?.id);
      setReplyTo(null);
    }
    
    setNewMessage("");
    stopTyping();
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
      const path = `${conversation.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("chat-files").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      
      let messageType = "file";
      if (file.type.startsWith("image/")) messageType = "image";
      else if (file.type.startsWith("video/")) messageType = "video";

      await sendMessage(urlData.publicUrl, messageType, replyTo?.id);
      setReplyTo(null);
    } catch {
      toast.error("Failed to upload file");
    }
    setUploading(false);
  };

  const handleVoiceSend = async (blob: Blob) => {
    if (!conversation || !user) return;
    setUploading(true);
    try {
      const path = `${conversation.id}/${Date.now()}_voice.webm`;
      const { error } = await supabase.storage.from("chat-files").upload(path, blob);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      await sendMessage(urlData.publicUrl, "voice");
    } catch {
      toast.error("Failed to send voice message");
    }
    setUploading(false);
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const handleEdit = (msg: Message) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleDelete = async (msgId: string) => {
    await deleteMessage(msgId, true);
  };

  const handleExport = () => {
    const text = messages
      .filter(m => !m.is_deleted)
      .map(m => {
        const sender = conversation?.participants.find(p => p.user_id === m.sender_id);
        return `[${format(new Date(m.created_at), "yyyy-MM-dd HH:mm")}] ${sender?.display_name || "Unknown"}: ${m.content}`;
      })
      .join("\n");
    
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported!");
    setShowMenu(false);
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

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

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
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card relative">
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
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-4 w-4" />
          </Button>
          {!isGroup && (
            <>
              <Button variant="ghost" size="icon" onClick={() => onStartCall?.("voice")}>
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onStartCall?.("video")}>
                <Video className="h-5 w-5" />
              </Button>
            </>
          )}
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical className="h-5 w-5" />
            </Button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-0 top-full mt-1 bg-card rounded-xl shadow-xl border border-border py-1 min-w-[180px] z-50"
                  >
                    <button onClick={() => { setShowPinned(!showPinned); setShowMenu(false); }} className="w-full px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                      <Pin className="h-3.5 w-3.5" /> Pinned Messages ({pinnedMessages.length})
                    </button>
                    <button onClick={handleExport} className="w-full px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" /> Export Chat
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-b border-border">
            <div className="p-2 flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1"
                autoFocus
              />
              <Button variant="ghost" size="icon" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned messages bar */}
      <AnimatePresence>
        {showPinned && pinnedMessages.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-b border-border bg-muted/50">
            <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-medium text-primary flex items-center gap-1"><Pin className="h-3 w-3" /> Pinned</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPinned(false)}><X className="h-3 w-3" /></Button>
              </div>
              {pinnedMessages.map(pm => (
                <div key={pm.id} className="text-xs bg-card rounded px-2 py-1 truncate">{pm.content}</div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {filteredMessages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          const senderName = isGroup ? getSenderName(msg.sender_id) : null;
          const replyMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

          // Check if this is a poll message
          if (msg.message_type === "poll") {
            const poll = polls.find(p => p.id === msg.content);
            if (poll) {
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <PollDisplay poll={poll} votes={getVotesForPoll(poll.id)} onVote={vote} />
                </div>
              );
            }
          }

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={isMine}
              senderName={senderName}
              reactions={getReactionsForMessage(msg.id)}
              replyMessage={replyMsg}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReact={toggleReaction}
              onPin={togglePin}
              isAnimated={i > filteredMessages.length - 3}
            />
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
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

      {/* Input area */}
      <div className="border-t border-border bg-card">
        {/* Reply preview */}
        <AnimatePresence>
          {(replyTo || editingMessage) && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
                <div className="w-0.5 h-8 bg-primary rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-primary">
                    {editingMessage ? "Editing" : `Replying to ${replyTo?.sender_id === user?.id ? "yourself" : getSenderName(replyTo!.sender_id) || "Unknown"}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{editingMessage?.content || replyTo?.content}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setReplyTo(null); setEditingMessage(null); setNewMessage(""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Poll creator */}
        <AnimatePresence>
          {showPollCreator && (
            <div className="px-4 pt-3">
              <PollCreator
                onCreatePoll={async (q, opts, multi) => {
                  await createPoll(q, opts, multi);
                  // Also send a message referencing the poll
                }}
                onClose={() => setShowPollCreator(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Attachment menu */}
        <AnimatePresence>
          {showAttach && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex gap-4 px-4 pt-3">
              <div className="flex gap-3 p-3 bg-muted rounded-lg flex-wrap">
                <button type="button" onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-1 text-primary hover:opacity-80">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Image className="h-5 w-5" /></div>
                  <span className="text-[10px]">Photo</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 text-primary hover:opacity-80">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><FileText className="h-5 w-5" /></div>
                  <span className="text-[10px]">File</span>
                </button>
                <button type="button" onClick={() => { setShowPollCreator(true); setShowAttach(false); }} className="flex flex-col items-center gap-1 text-primary hover:opacity-80">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><BarChart3 className="h-5 w-5" /></div>
                  <span className="text-[10px]">Poll</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="p-3 flex gap-2 items-center">
          <Button type="button" variant="ghost" size="icon" onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }} disabled={uploading} className="flex-shrink-0">
            {showAttach ? <X className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
          </Button>
          
          <div className="relative">
            <Button type="button" variant="ghost" size="icon" onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }} className="flex-shrink-0">
              <Smile className="h-5 w-5" />
            </Button>
            <AnimatePresence>
              {showEmoji && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <EmojiPicker
                    onSelect={(emoji) => setNewMessage(prev => prev + emoji)}
                    onClose={() => setShowEmoji(false)}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>

          <Input
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            placeholder={uploading ? "Uploading..." : "Type a message..."}
            className="flex-1 bg-muted border-0"
            disabled={uploading}
          />

          {newMessage.trim() ? (
            <Button type="submit" size="icon" disabled={uploading} className="flex-shrink-0 rounded-full">
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <VoiceRecorder onSend={handleVoiceSend} />
          )}
        </form>

        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
      </div>
    </div>
  );
}
