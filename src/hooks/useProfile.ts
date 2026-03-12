import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status_text: string | null;
  is_online: boolean | null;
  last_seen: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(data as Profile | null);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { profile, loading };
}

export function useSearchUsers(query: string) {
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);
      setResults((data as Profile[]) || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
}
