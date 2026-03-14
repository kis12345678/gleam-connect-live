import { useState, useRef } from "react";
import { Plus, Image, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStatuses, Status } from "@/hooks/useStatuses";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { StatusViewer } from "./StatusViewer";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const BG_COLORS = [
  "#075E54", "#128C7E", "#25D366", "#DCF8C6",
  "#1F2C34", "#E91E63", "#9C27B0", "#3F51B5",
  "#FF5722", "#795548", "#607D8B", "#000000",
];

export function StatusList() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { myStatuses, groupedStatuses, createTextStatus, createMediaStatus, loading } = useStatuses();
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState<"text" | "media">("text");
  const [textContent, setTextContent] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [viewingStatuses, setViewingStatuses] = useState<Status[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateText = async () => {
    if (!textContent.trim()) return;
    await createTextStatus(textContent, selectedBg);
    setTextContent("");
    setShowComposer(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await createMediaStatus(file);
    setShowComposer(false);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Viewer overlay */}
      <AnimatePresence>
        {viewingStatuses && (
          <StatusViewer statuses={viewingStatuses} onClose={() => setViewingStatuses(null)} />
        )}
      </AnimatePresence>

      {/* Composer overlay */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Create Status</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowComposer(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex gap-2 p-4">
              <Button
                variant={composerType === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setComposerType("text")}
              >
                <Type className="h-4 w-4 mr-1" /> Text
              </Button>
              <Button
                variant={composerType === "media" ? "default" : "outline"}
                size="sm"
                onClick={() => setComposerType("media")}
              >
                <Image className="h-4 w-4 mr-1" /> Photo/Video
              </Button>
            </div>

            {composerType === "text" ? (
              <div className="flex-1 flex flex-col">
                <div
                  className="flex-1 flex items-center justify-center p-8"
                  style={{ backgroundColor: selectedBg }}
                >
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Type a status..."
                    className="bg-transparent text-white text-xl text-center w-full resize-none outline-none placeholder:text-white/50"
                    rows={4}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {BG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedBg(c)}
                      className={`h-8 w-8 rounded-full flex-shrink-0 border-2 ${selectedBg === c ? "border-primary" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="p-4 border-t border-border">
                  <Button className="w-full" onClick={handleCreateText} disabled={!textContent.trim()}>
                    Post Status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <Button size="lg" onClick={() => fileInputRef.current?.click()}>
                  <Image className="h-5 w-5 mr-2" /> Choose Photo/Video
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-display font-bold">Status</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* My status */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => myStatuses.length > 0 ? setViewingStatuses(myStatuses) : setShowComposer(true)}
            className="flex items-center gap-3 w-full text-left"
          >
            <div className="relative">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${myStatuses.length > 0 ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {profile?.display_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              {myStatuses.length === 0 && (
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Plus className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-sm">My Status</p>
              <p className="text-xs text-muted-foreground">
                {myStatuses.length > 0
                  ? `${myStatuses.length} update${myStatuses.length > 1 ? "s" : ""} • Tap to view`
                  : "Tap to add status update"}
              </p>
            </div>
          </button>
          {myStatuses.length > 0 && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setShowComposer(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add another
            </Button>
          )}
        </div>

        {/* Recent updates */}
        {Object.keys(groupedStatuses).length > 0 && (
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">RECENT UPDATES</p>
            {Object.entries(groupedStatuses).map(([userId, userStatuses]) => {
              const latest = userStatuses[0];
              return (
                <button
                  key={userId}
                  onClick={() => setViewingStatuses(userStatuses)}
                  className="flex items-center gap-3 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-card flex-shrink-0">
                    {latest.avatar_url ? (
                      <img src={latest.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                        {latest.display_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{latest.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {Object.keys(groupedStatuses).length === 0 && myStatuses.length === 0 && !loading && (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">No status updates yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
