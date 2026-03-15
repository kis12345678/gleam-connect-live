import { useState, useRef } from "react";
import { ArrowLeft, Camera, Save, User, LogOut, Moon, Sun, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  onBack: () => void;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export default function Settings({ onBack, isDark, onToggleDark }: Props) {
  const { profile } = useProfile();
  const { user, signOut } = useAuth();
  const { uploadAvatar, uploading } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [statusText, setStatusText] = useState(profile?.status_text || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), status_text: statusText.trim() })
      .eq("user_id", user.id);

    if (error) toast.error("Failed to save changes");
    else toast.success("Profile updated!");
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-background"
    >
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display font-semibold text-lg">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-lg mx-auto w-full">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl">
                {profile?.display_name.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-primary-foreground" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
          </div>
          <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Tap to change photo"}</p>
        </div>

        {/* Profile */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Username</label>
              <Input value={profile?.username || ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Textarea value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="What's on your mind?" rows={2} className="resize-none" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !displayName.trim()} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Appearance</h3>
          <div className="bg-card rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">{isDark ? "Dark theme active" : "Light theme active"}</p>
                </div>
              </div>
              <Switch checked={isDark} onCheckedChange={onToggleDark} />
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Account</h3>
          <div className="bg-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => { if (confirm("Sign out?")) signOut(); }} className="w-full gap-2 text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>TalkFree v2.0</p>
          <p className="mt-1">Built with ❤️</p>
        </div>
      </div>
    </motion.div>
  );
}
