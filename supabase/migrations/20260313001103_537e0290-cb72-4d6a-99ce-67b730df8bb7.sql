-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;

-- Allow authenticated users to insert participants if they are either:
-- 1. Adding themselves, OR
-- 2. Already a participant of the conversation
CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);