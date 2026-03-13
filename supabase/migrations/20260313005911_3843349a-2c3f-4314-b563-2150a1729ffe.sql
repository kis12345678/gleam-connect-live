
-- Call history table
CREATE TABLE public.call_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  call_type text NOT NULL DEFAULT 'voice',
  status text NOT NULL DEFAULT 'missed',
  duration integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone
);

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their call history"
ON public.call_history FOR SELECT TO authenticated
USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Users can create call history"
ON public.call_history FOR INSERT TO authenticated
WITH CHECK (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Users can update their call history"
ON public.call_history FOR UPDATE TO authenticated
USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
