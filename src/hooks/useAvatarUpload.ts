import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function useAvatarUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) return null;

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return null;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be under 2MB");
        return null;
      }

      setUploading(true);
      try {
        const ext = file.name.split(".").pop();
        const filePath = `${user.id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("user_id", user.id);

        toast.success("Profile picture updated!");
        return avatarUrl;
      } catch (err: any) {
        console.error("Avatar upload error:", err);
        toast.error("Failed to upload profile picture");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [user]
  );

  return { uploadAvatar, uploading };
}
