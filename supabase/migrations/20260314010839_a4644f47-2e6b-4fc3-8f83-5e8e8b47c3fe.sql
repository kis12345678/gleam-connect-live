
-- Create statuses table for WhatsApp-like status feature
CREATE TABLE public.statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'text',
  background_color TEXT DEFAULT '#075E54',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view statuses" ON public.statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own statuses" ON public.statuses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own statuses" ON public.statuses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create chat-files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

-- Storage policies for chat-files
CREATE POLICY "Authenticated users can upload chat files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "Anyone can view chat files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-files');

-- Enable realtime for statuses
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
