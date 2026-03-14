import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Status {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string;
  background_color: string;
  created_at: string;
  expires_at: string;
  // joined from profiles
  display_name?: string;
  avatar_url?: string | null;
  username?: string;
}

export function useStatuses() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    const { data } = await supabase
      .from("statuses")
      .select("*")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch profiles for all status users
      const userIds = [...new Set(data.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const enriched: Status[] = data.map((s: any) => {
        const profile = profileMap.get(s.user_id);
        return {
          ...s,
          display_name: profile?.display_name || "Unknown",
          avatar_url: profile?.avatar_url,
          username: profile?.username,
        };
      });
      setStatuses(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("statuses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, () => {
        fetchStatuses();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStatuses]);

  const createTextStatus = async (content: string, bgColor: string) => {
    if (!user) return;
    await supabase.from("statuses").insert({
      user_id: user.id,
      content,
      media_type: "text",
      background_color: bgColor,
    } as any);
  };

  const createMediaStatus = async (file: File, caption?: string) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-files").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);

    const mediaType = file.type.startsWith("video") ? "video" : "image";
    await supabase.from("statuses").insert({
      user_id: user.id,
      content: caption || null,
      media_url: urlData.publicUrl,
      media_type: mediaType,
    } as any);
  };

  const deleteStatus = async (id: string) => {
    await supabase.from("statuses").delete().eq("id", id);
  };

  // Group statuses by user
  const myStatuses = statuses.filter((s) => s.user_id === user?.id);
  const otherStatuses = statuses.filter((s) => s.user_id !== user?.id);
  
  // Group other statuses by user
  const groupedStatuses = otherStatuses.reduce((acc, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = [];
    acc[s.user_id].push(s);
    return acc;
  }, {} as Record<string, Status[]>);

  return { statuses, myStatuses, groupedStatuses, loading, createTextStatus, createMediaStatus, deleteStatus, refresh: fetchStatuses };
}
