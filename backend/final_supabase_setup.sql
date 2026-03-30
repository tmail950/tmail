-- TMAIL.PK MAIL: FINAL GUEST & EMAIL RLS SETUP
-- Execute this script in your Supabase SQL Editor to enable all guest and holographic features.

-- 1. Guest Mailboxes Infrastructure
CREATE TABLE IF NOT EXISTS public.guest_mailboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_address TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- Currently storing as plain-text secret key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.guest_mailboxes ENABLE ROW LEVEL SECURITY;

-- 1.1 Policies for Guest Mailboxes
DROP POLICY IF EXISTS "Public can create guest mailboxes" ON public.guest_mailboxes;
CREATE POLICY "Public can create guest mailboxes" 
    ON public.guest_mailboxes FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can check guest mailbox password" ON public.guest_mailboxes;
CREATE POLICY "Public can check guest mailbox password" 
    ON public.guest_mailboxes FOR SELECT 
    USING (true);

-- 1.2 Indexing
CREATE INDEX IF NOT EXISTS idx_guest_mailboxes_address ON public.guest_mailboxes (email_address);


-- 2. Emails Table Security (Inbox Access)
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- 2.1 Viewing Policy: Allows guests and registered users to see their own mail
DROP POLICY IF EXISTS "Unified email selection" ON public.emails;
CREATE POLICY "Unified email selection" 
    ON public.emails FOR SELECT 
    USING (
        -- For registered users (check domain ownership)
        EXISTS (
            SELECT 1 FROM user_domains 
            WHERE user_domains.user_id = auth.uid() 
            AND public.emails.recipient_address LIKE ('%@' || user_domains.domain_name)
        )
        OR 
        -- Platform default (everyone)
        public.emails.recipient_address LIKE '%@TMAIL.PK-mail.com'
        OR
        -- For guests (check address exists in guest table)
        EXISTS (
            SELECT 1 FROM public.guest_mailboxes
            WHERE public.guest_mailboxes.email_address = public.emails.recipient_address
        )
    );

-- 2.2 Insertion Policy: Allows Cloudflare and Test button to populate inbox
DROP POLICY IF EXISTS "Public can insert emails" ON public.emails;
CREATE POLICY "Public can insert emails" 
    ON public.emails FOR INSERT 
    WITH CHECK (true);


-- 3. Domain Management
-- Ensure qammify.sbs or other guest domains are active in your internal logic
-- (No specific SQL needed if already handled in domain-service)

NOTIFY pgrst, 'reload schema';
