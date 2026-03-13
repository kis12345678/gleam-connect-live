-- Table for WebRTC signaling (offers, answers, ICE candidates)
CREATE TABLE public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  signal_type text NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'call-start', 'call-end', 'call-reject'
  signal_data jsonb,
  call_type text NOT NULL DEFAULT 'voice', -- 'voice' or 'video'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'ended', 'rejected', 'missed'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Users can see signals for their conversations
CREATE POLICY "Users can view their call signals"
ON public.call_signals FOR SELECT TO authenticated
USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Users can create call signals"
ON public.call_signals FOR INSERT TO authenticated
WITH CHECK (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Users can update their call signals"
ON public.call_signals FOR UPDATE TO authenticated
USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Users can delete their call signals"
ON public.call_signals FOR DELETE TO authenticated
USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Enable realtime for call signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;