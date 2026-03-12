
-- Drop overly permissive policies
DROP POLICY "Authenticated users can create conversations" ON public.conversations;
DROP POLICY "Authenticated users can add participants" ON public.conversation_participants;

-- Create more restrictive policies
CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can add participants to their conversations" ON public.conversation_participants FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL AND (
    -- Allow adding self, or adding others to conversations you're already in
    user_id = auth.uid() OR 
    conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  ));
