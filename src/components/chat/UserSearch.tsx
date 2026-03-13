import { useState } from "react";
import { X, Search, UserPlus, Users, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchUsers, Profile } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

interface Props {
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  onCreateGroup: (userIds: string[], name: string) => void;
}

export function UserSearch({ onClose, onSelectUser, onCreateGroup }: Props) {
  const [query, setQuery] = useState("");
  const { results, loading } = useSearchUsers(query);
  const { user } = useAuth();
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState("");

  const filteredResults = results.filter((r) => r.user_id !== user?.id);

  const toggleUser = (u: Profile) => {
    setSelectedUsers((prev) =>
      prev.some((s) => s.user_id === u.user_id)
        ? prev.filter((s) => s.user_id !== u.user_id)
        : [...prev, u]
    );
  };

  const handleCreateGroup = () => {
    if (selectedUsers.length < 2) return;
    const name = groupName.trim() || selectedUsers.map((u) => u.display_name).join(", ");
    onCreateGroup(
      selectedUsers.map((u) => u.user_id),
      name
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg">
            {mode === "group" ? "New Group" : "Find Friends"}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant={mode === "group" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode(mode === "group" ? "direct" : "group")}
              className="gap-1.5"
            >
              <Users className="h-4 w-4" />
              {mode === "group" ? "1:1" : "Group"}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {mode === "group" && (
          <div className="px-4 pt-4">
            <Input
              placeholder="Group name (optional)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mb-3"
            />
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedUsers.map((u) => (
                  <span
                    key={u.user_id}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full cursor-pointer hover:bg-primary/20"
                    onClick={() => toggleUser(u)}
                  >
                    {u.display_name}
                    <X className="h-3 w-3" />
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-4 pt-0">
          <div className={`relative ${mode === "group" ? "" : "pt-4"}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Searching...</div>
          ) : filteredResults.length === 0 && query.length >= 2 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No users found</div>
          ) : (
            filteredResults.map((u) => {
              const isSelected = selectedUsers.some((s) => s.user_id === u.user_id);
              return (
                <button
                  key={u.id}
                  onClick={() => (mode === "group" ? toggleUser(u) : onSelectUser(u.user_id))}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="relative">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.display_name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {u.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {u.is_online && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-online border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{u.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  {mode === "group" ? (
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  ) : (
                    <UserPlus className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {mode === "group" && selectedUsers.length >= 2 && (
          <div className="p-4 border-t border-border">
            <Button className="w-full" onClick={handleCreateGroup}>
              Create Group ({selectedUsers.length} members)
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
