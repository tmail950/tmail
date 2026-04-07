-- FINAL AUTH OVERHAUL MIGRATION
-- Adding 4-regen limit, unique identities, is_used flags, and password recovery infrastructure

-- 1. Add is_used flag to user_emails
ALTER TABLE public.user_emails ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;

-- 2. Add is_used flag to guest_mailboxes
ALTER TABLE public.guest_mailboxes ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;

-- 3. Create Password Reset Requests Table
CREATE TABLE IF NOT EXISTS public.reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for reset_requests
ALTER TABLE public.reset_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert a request
DROP POLICY IF EXISTS "Anyone can request a reset" ON public.reset_requests;
CREATE POLICY "Anyone can request a reset" ON public.reset_requests FOR INSERT WITH CHECK (true);

-- Policy: Only admins can view/delete requests
DROP POLICY IF EXISTS "Admins manage resets" ON public.reset_requests;
CREATE POLICY "Admins manage resets" ON public.reset_requests FOR ALL 
    USING (
        auth.jwt() ->> 'email' = 'info369skills@gmail.com' 
        OR EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email')
    );

-- 4. Set is_used = TRUE for all current mailboxes as a baseline
UPDATE public.user_emails SET is_used = TRUE WHERE is_used IS NULL;
UPDATE public.guest_mailboxes SET is_used = TRUE WHERE is_used IS NULL;

-- 5. Add Regeneration Counter to guest metadata (Optional but helpful)
-- Tracked in localStorage, but this comment serves as a reminder for DB sync if needed later.

NOTIFY pgrst, 'reload schema';
