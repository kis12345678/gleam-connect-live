import { useState } from "react";
import { X, Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchUsers } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

interface Props {
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export function UserSearch({ onClose, onSelectUser }: Props) {
  const [query, setQuery] = useState("");
  const { results, loading } = useSearchUsers(query);
  const { user } = useAuth();

  const filteredResults = results.filter(r => r.user_id !== user?.id);

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
          <h2 className="font-display font-semibold text-lg">Find Friends</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          <div className="relative">
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
            filteredResults.map(u => (
              <button
                key={u.id}
                onClick={() => onSelectUser(u.user_id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {u.display_name.charAt(0).toUpperCase()}
                  </div>
                  {u.is_online && (
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-online border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{u.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <UserPlus className="h-4 w-4 text-primary flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
