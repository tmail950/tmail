-- 1. Fix Emails Visibility for Guest and Authenticated Users
DROP POLICY IF EXISTS "Users can view emails for their domains" ON public.emails;
CREATE POLICY "Users can view emails for their domains" 
    ON public.emails FOR SELECT 
    USING (
        -- Scenario A: Registered user viewing emails for their verified domains
        EXISTS (
            SELECT 1 FROM user_domains 
            WHERE user_domains.user_id = auth.uid() 
            AND user_domains.is_verified = true
            AND public.emails.recipient_address LIKE ('%@' || user_domains.domain_name)
        )
        OR 
        -- Scenario B: Anyone viewing emails for a guest mailbox they "own" (via password filter in app)
        EXISTS (
            SELECT 1 FROM public.guest_mailboxes
            WHERE public.guest_mailboxes.email_address = public.emails.recipient_address
        )
    );

-- 2. Ensure Ingest is always allowed
DROP POLICY IF EXISTS "Public can insert emails" ON public.emails;
CREATE POLICY "Public can insert emails" 
    ON public.emails FOR INSERT 
    WITH CHECK (true);

-- 3. Sync existing verified domains
UPDATE public.user_domains
SET admin_approval = 'approved', cloudflare_status = 'active'
WHERE is_verified = true;

-- 4. Enable Realtime for emails (CRITICAL for live updates)
ALTER publication supabase_realtime ADD TABLE emails;
