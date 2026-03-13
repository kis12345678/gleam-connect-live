import { useState, useRef } from "react";
import { Search, Plus, Settings, Phone, MessageSquare, Camera, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useCallHistory } from "@/hooks/useCallHistory";
import { Conversation } from "@/hooks/useConversations";
import { UserSearch } from "./UserSearch";
import { CallHistoryList } from "@/components/call/CallHistoryList";
import { formatDistanceToNow } from "date-fns";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onStartConversation: (userId: string) => void;
  onCreateGroup: (userIds: string[], name: string) => void;
  onOpenSettings: () => void;
}

export function ConversationList({ conversations, activeId, onSelect, onStartConversation, onCreateGroup, onOpenSettings }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { uploadAvatar, uploading } = useAvatarUpload();
  const { history, loading: historyLoading } = useCallHistory();
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"chats" | "calls">("chats");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = conversations.filter(c => {
    if (!filter) return true;
    if (c.type === "group") {
      return c.name?.toLowerCase().includes(filter.toLowerCase());
    }
    const other = c.participants.find(p => p.user_id !== user?.id);
    return other?.display_name.toLowerCase().includes(filter.toLowerCase()) ||
           other?.username.toLowerCase().includes(filter.toLowerCase());
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
    window.location.reload();
  };

  const getConversationDisplay = (conv: Conversation) => {
    if (conv.type === "group") {
      const memberCount = conv.participants.length;
      return {
        name: conv.name || "Group Chat",
        subtitle: `${memberCount} members`,
        initials: conv.name?.charAt(0).toUpperCase() || "G",
        isGroup: true,
        avatarUrl: null as string | null,
        isOnline: false,
      };
    }
    const other = conv.participants.find(p => p.user_id !== user?.id);
    return {
      name: other?.display_name || "Unknown",
      subtitle: conv.lastMessage?.content || "No messages yet",
      initials: other?.display_name.charAt(0).toUpperCase() || "?",
      isGroup: false,
      avatarUrl: other?.avatar_url || null,
      isOnline: other?.is_online || false,
    };
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-display font-bold">TalkFree</h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onOpenSettings}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 bg-muted border-0"
          />
        </div>
      </div>

      {/* Profile with avatar upload */}
      {profile && (
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-card" />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{profile.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {profile.status_text || `@${profile.username}`}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("chats")}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
            tab === "chats" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Chats
        </button>
        <button
          onClick={() => setTab("calls")}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
            tab === "calls" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Phone className="h-4 w-4" />
          Calls
        </button>
      </div>

      {/* Content */}
      {tab === "calls" ? (
        <CallHistoryList history={history} loading={historyLoading} />
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No conversations yet</p>
              <Button variant="link" className="text-primary mt-2" onClick={() => setSearchOpen(true)}>
                Start a new chat
              </Button>
            </div>
          ) : (
            filtered.map(conv => {
              const display = getConversationDisplay(conv);
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
                    activeId === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {display.isGroup ? (
                      <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-accent" />
                      </div>
                    ) : display.avatarUrl ? (
                      <img src={display.avatarUrl} alt={display.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                        {display.initials}
                      </div>
                    )}
                    {display.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="font-medium text-sm truncate">{display.name}</p>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.lastMessage?.content || display.subtitle}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* User Search Modal */}
      {searchOpen && (
        <UserSearch
          onClose={() => setSearchOpen(false)}
          onSelectUser={(userId) => {
            onStartConversation(userId);
            setSearchOpen(false);
          }}
          onCreateGroup={(userIds, name) => {
            onCreateGroup(userIds, name);
            setSearchOpen(false);
          }}
        />
      )}
    </div>
  );
}
