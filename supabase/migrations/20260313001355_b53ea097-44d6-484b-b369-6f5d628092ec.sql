-- Fix infinite recursion in conversation_participants policies
-- Use a SECURITY DEFINER function to check membership without triggering RLS

CREATE OR REPLACE FUNCTION public.get_user_conversation_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = _user_id;
$$;

-- Drop all existing policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;

-- Recreate SELECT policy using the security definer function (no recursion)
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (conversation_id IN (SELECT public.get_user_conversation_ids(auth.uid())));

-- Simple INSERT policy
CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix conversations SELECT policy (was already changed to true, keep it)
-- Fix messages SELECT policy to also use the function
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (conversation_id IN (SELECT public.get_user_conversation_ids(auth.uid())));

-- Fix messages INSERT policy
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid() AND conversation_id IN (SELECT public.get_user_conversation_ids(auth.uid())));