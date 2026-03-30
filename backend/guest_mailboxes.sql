-- 1. Guest Mailboxes Table
CREATE TABLE IF NOT EXISTS public.guest_mailboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_address TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.guest_mailboxes ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can create guest mailboxes" ON public.guest_mailboxes;
CREATE POLICY "Public can create guest mailboxes" 
    ON public.guest_mailboxes FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can check guest mailbox password" ON public.guest_mailboxes;
CREATE POLICY "Public can check guest mailbox password" 
    ON public.guest_mailboxes FOR SELECT 
    USING (true); -- We'll filter by password in the app logic or use an RPC

-- Indexing
CREATE INDEX IF NOT EXISTS idx_guest_mailboxes_address ON public.guest_mailboxes (email_address);
