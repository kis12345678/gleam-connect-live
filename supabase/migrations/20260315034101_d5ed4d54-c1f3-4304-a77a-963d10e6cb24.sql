
-- Add columns to messages for reply, edit, delete, pin
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
  FOR SELECT TO authenticated USING (
    message_id IN (
      SELECT m.id FROM public.messages m 
      WHERE m.conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
    )
  );
CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove their reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Polls
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  is_multiple_choice boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view polls in their conversations" ON public.polls
  FOR SELECT TO authenticated USING (
    conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
  );
CREATE POLICY "Users can create polls" ON public.polls
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

-- Poll votes
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view poll votes" ON public.poll_votes
  FOR SELECT TO authenticated USING (
    poll_id IN (SELECT p.id FROM public.polls p WHERE p.conversation_id IN (SELECT get_user_conversation_ids(auth.uid())))
  );
CREATE POLICY "Users can vote" ON public.poll_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove their votes" ON public.poll_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Scheduled messages
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  scheduled_at timestamptz NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their scheduled messages" ON public.scheduled_messages
  FOR SELECT TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Users can create scheduled messages" ON public.scheduled_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update their scheduled messages" ON public.scheduled_messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Users can delete their scheduled messages" ON public.scheduled_messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- Channels (community)
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  creator_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'public',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public channels" ON public.channels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create channels" ON public.channels
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Channel creators can update" ON public.channels
  FOR UPDATE TO authenticated USING (creator_id = auth.uid());

-- Channel members
CREATE TABLE IF NOT EXISTS public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view channel members" ON public.channel_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join channels" ON public.channel_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave channels" ON public.channel_members
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR 
    channel_id IN (SELECT id FROM public.channels WHERE creator_id = auth.uid())
  );

-- Channel messages
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  reply_to_id uuid REFERENCES public.channel_messages(id) ON DELETE SET NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view channel messages" ON public.channel_messages
  FOR SELECT TO authenticated USING (
    channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
    OR channel_id IN (SELECT id FROM public.channels WHERE type = 'public')
  );
CREATE POLICY "Members can send channel messages" ON public.channel_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
