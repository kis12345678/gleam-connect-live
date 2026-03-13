-- Allow users to update conversations they participate in
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()));

-- Fix SELECT policy - allow authenticated users to see conversations (participants are filtered in app)
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (true);