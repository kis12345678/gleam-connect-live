import { useState } from "react";
import { Hash, Plus, Users, Lock, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Channel, useChannels } from "@/hooks/useChannels";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  channels: Channel[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, description: string, type: string) => void;
  onJoin: (channelId: string) => void;
  onLeave: (channelId: string) => void;
  onBack?: () => void;
}

export function ChannelList({ channels, activeId, onSelect, onCreate, onJoin, onLeave, onBack }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = channels.filter(c => 
    !filter || c.name.toLowerCase().includes(filter.toLowerCase())
  );

  const myChannels = filtered.filter(c => c.is_member);
  const otherChannels = filtered.filter(c => !c.is_member);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim(), "public");
    setName("");
    setDescription("");
    setShowCreate(false);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-bold">Communities</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowCreate(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 bg-muted border-0"
          />
        </div>
      </div>

      {/* Create channel dialog */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-b border-border">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Create Channel</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCreate(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
              <Button size="sm" className="w-full" onClick={handleCreate} disabled={!name.trim()}>
                Create Channel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {myChannels.length > 0 && (
          <div className="py-2">
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Your Channels</p>
            {myChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => onSelect(ch.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left ${
                  activeId === ch.id ? "bg-muted" : ""
                }`}
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {ch.type === "private" ? <Lock className="h-4 w-4 text-primary" /> : <Hash className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{ch.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{ch.member_count} members</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {otherChannels.length > 0 && (
          <div className="py-2">
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Discover</p>
            {otherChannels.map(ch => (
              <div key={ch.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{ch.name}</p>
                  <p className="text-xs text-muted-foreground">{ch.description || `${ch.member_count} members`}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onJoin(ch.id)}>Join</Button>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No channels yet. Create one!
          </div>
        )}
      </div>
    </div>
  );
}
