-- Optimize user_emails table for performance and reliability
CREATE INDEX IF NOT EXISTS idx_user_emails_user_id ON public.user_emails (user_id);

-- Ensure RLS is as efficient as possible
DROP POLICY IF EXISTS "Users can reserve their own emails" ON public.user_emails;
CREATE POLICY "Users can reserve their own emails" 
    ON public.user_emails FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Explicitly allow the primary email logic to bypass if needed, 
-- but keep it strict for security.
ALTER TABLE public.user_emails FORCE ROW LEVEL SECURITY;
