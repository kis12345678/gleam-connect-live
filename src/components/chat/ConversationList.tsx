import { useState } from "react";
import { Search, Plus, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { Conversation } from "@/hooks/useConversations";
import { UserSearch } from "./UserSearch";
import { formatDistanceToNow } from "date-fns";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onStartConversation: (userId: string) => void;
}

export function ConversationList({ conversations, activeId, onSelect, onStartConversation }: Props) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = conversations.filter(c => {
    if (!filter) return true;
    const other = c.participants.find(p => p.user_id !== user?.id);
    return other?.display_name.toLowerCase().includes(filter.toLowerCase()) ||
           other?.username.toLowerCase().includes(filter.toLowerCase());
  });

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
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 bg-muted border-0"
          />
        </div>
      </div>

      {/* Profile */}
      {profile && (
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{profile.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
          </div>
        </div>
      )}

      {/* Conversations */}
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
            const other = conv.participants.find(p => p.user_id !== user?.id);
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
                  activeId === conv.id ? "bg-muted" : ""
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                    {other?.display_name.charAt(0).toUpperCase() || "?"}
                  </div>
                  {other?.is_online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-medium text-sm truncate">{other?.display_name || "Unknown"}</p>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* User Search Modal */}
      {searchOpen && (
        <UserSearch
          onClose={() => setSearchOpen(false)}
          onSelectUser={(userId) => {
            onStartConversation(userId);
            setSearchOpen(false);
          }}
        />
      )}
    </div>
  );
}
